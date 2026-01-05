import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import FileUploader from "./media/FileUploader";
import { useFileUpload } from "@/hooks/useFileUpload";

interface Story {
  id: string;
  user_id: string;
  text_content: string | null;
  emoji_content: string | null;
  media_url: string | null;
  media_type: string | null;
  background_color: string;
  created_at: string;
  expires_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const Stories = ({ currentUserId }: { currentUserId: string }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [emojiContent, setEmojiContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  
  const { uploadFile, uploading, progress, getMediaType } = useFileUpload();
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
  }, []);

  // Auto-progress story viewer
  useEffect(() => {
    if (selectedStory && !selectedStory.media_url) {
      const timer = setTimeout(() => {
        goToNextStory();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [selectedStory, storyIndex]);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          profiles (username, display_name, avatar_url)
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error: any) {
      console.error("Error fetching stories:", error);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const createStory = async () => {
    if (!textContent && !emojiContent && !selectedFile) {
      toast({
        title: "Error",
        description: "Please add some content",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (selectedFile) {
        const result = await uploadFile(selectedFile, "stories", currentUserId);
        if (result) {
          mediaUrl = result.url;
          mediaType = getMediaType(selectedFile);
        } else {
          setCreating(false);
          return;
        }
      }

      const { error } = await supabase.from("stories").insert({
        user_id: currentUserId,
        text_content: textContent || null,
        emoji_content: emojiContent || null,
        media_url: mediaUrl,
        media_type: mediaType,
        background_color: "#C0C0C0",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Story created!",
      });

      setTextContent("");
      setEmojiContent("");
      handleRemoveFile();
      setShowCreate(false);
      fetchStories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const viewStory = async (story: Story, index: number) => {
    setSelectedStory(story);
    setStoryIndex(index);
    
    if (story.user_id !== currentUserId) {
      try {
        await supabase.from("story_views").insert({
          story_id: story.id,
          viewer_id: currentUserId,
        });
      } catch {
        // Ignore duplicate view errors
      }
    }
  };

  const goToNextStory = () => {
    const userStories = stories.filter(s => s.user_id === selectedStory?.user_id);
    const currentIndex = userStories.findIndex(s => s.id === selectedStory?.id);
    
    if (currentIndex < userStories.length - 1) {
      viewStory(userStories[currentIndex + 1], storyIndex + 1);
    } else {
      setSelectedStory(null);
    }
  };

  const reactToStory = async (reaction: string) => {
    if (!selectedStory) return;

    try {
      await supabase.from("story_reactions").upsert({
        story_id: selectedStory.id,
        user_id: currentUserId,
        reaction,
      });

      toast({
        title: "Reacted!",
        description: `You reacted with ${reaction}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = [];
    }
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto py-4 border-b hairline scrollbar-hide">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-silver flex items-center justify-center border-2 border-primary">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">Your Story</span>
        </button>

        {Object.entries(groupedStories).map(([userId, userStories]) => {
          const latestStory = userStories[0];
          return (
            <button
              key={userId}
              onClick={() => viewStory(latestStory, 0)}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent border-2 border-primary p-0.5">
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  {latestStory.profiles.avatar_url ? (
                    <img
                      src={latestStory.profiles.avatar_url}
                      alt={latestStory.profiles.display_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-lg">
                      {latestStory.emoji_content || latestStory.profiles.display_name[0]}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[64px]">
                {latestStory.profiles.display_name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Create Story Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        if (!open) handleRemoveFile();
        setShowCreate(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text/Emoji</TabsTrigger>
              <TabsTrigger value="media">Photo/Video</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Text</label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Emoji/Mood</label>
                <input
                  type="text"
                  value={emojiContent}
                  onChange={(e) => setEmojiContent(e.target.value)}
                  placeholder="😊 💭 ✨"
                  className="w-full px-3 py-2 border rounded-md bg-input"
                  maxLength={5}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="mt-4">
              <FileUploader
                onFileSelect={handleFileSelect}
                onRemove={handleRemoveFile}
                selectedFile={selectedFile}
                previewUrl={previewUrl}
                uploading={uploading}
                progress={progress}
                accept="image/*,video/*"
                maxSize={50}
              />
            </TabsContent>
          </Tabs>
          
          <Button 
            onClick={createStory} 
            className="w-full mt-4"
            disabled={creating || uploading || (!textContent && !emojiContent && !selectedFile)}
          >
            {creating || uploading ? "Creating..." : "Share Story"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-20 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setSelectedStory(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          
          {selectedStory && (
            <div className="relative">
              {/* Progress bars */}
              <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
                {groupedStories[selectedStory.user_id]?.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full ${
                      idx <= storyIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
              
              {/* User info */}
              <div className="absolute top-6 left-4 z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-silver">
                  {selectedStory.profiles.avatar_url ? (
                    <img
                      src={selectedStory.profiles.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-sm">
                      {selectedStory.profiles.display_name[0]}
                    </div>
                  )}
                </div>
                <span className="text-white text-sm font-medium drop-shadow-md">
                  {selectedStory.profiles.display_name}
                </span>
              </div>

              {/* Story content */}
              <div
                className="min-h-[500px] flex flex-col items-center justify-center cursor-pointer"
                style={{ backgroundColor: selectedStory.background_color }}
                onClick={goToNextStory}
              >
                {selectedStory.media_url ? (
                  selectedStory.media_type === "image" ? (
                    <img
                      src={selectedStory.media_url}
                      alt="Story"
                      className="w-full h-full object-contain max-h-[500px]"
                    />
                  ) : (
                    <video
                      src={selectedStory.media_url}
                      className="w-full h-full object-contain max-h-[500px]"
                      autoPlay
                      muted
                      playsInline
                      onEnded={goToNextStory}
                    />
                  )
                ) : (
                  <>
                    {selectedStory.emoji_content && (
                      <div className="text-6xl mb-4">{selectedStory.emoji_content}</div>
                    )}
                    {selectedStory.text_content && (
                      <p className="text-lg text-center text-white font-medium px-8 drop-shadow-md">
                        {selectedStory.text_content}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              {/* Reactions */}
              <div className="absolute bottom-4 left-0 right-0 flex gap-2 justify-center">
                {["❤️", "😂", "😮", "👏", "🔥"].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      reactToStory(emoji);
                    }}
                    className="bg-black/30 hover:bg-black/50 text-white"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Stories;
