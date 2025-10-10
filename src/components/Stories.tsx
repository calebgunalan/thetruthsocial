import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

interface Story {
  id: string;
  user_id: string;
  text_content: string | null;
  emoji_content: string | null;
  media_url: string | null;
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
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
  }, []);

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

  const createStory = async () => {
    if (!textContent && !emojiContent) {
      toast({
        title: "Error",
        description: "Please add some content",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("stories").insert({
        user_id: currentUserId,
        text_content: textContent || null,
        emoji_content: emojiContent || null,
        background_color: "#C0C0C0",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Story created!",
      });

      setTextContent("");
      setEmojiContent("");
      setShowCreate(false);
      fetchStories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewStory = async (story: Story) => {
    setSelectedStory(story);
    
    if (story.user_id !== currentUserId) {
      await supabase.from("story_views").insert({
        story_id: story.id,
        viewer_id: currentUserId,
      });
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

  return (
    <>
      <div className="flex gap-4 overflow-x-auto py-4 border-b hairline">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-silver flex items-center justify-center border-2 border-primary">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">Your Story</span>
        </button>

        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => viewStory(story)}
            className="flex-shrink-0 flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-silver border-2 border-primary p-0.5">
              {story.profiles.avatar_url ? (
                <img
                  src={story.profiles.avatar_url}
                  alt={story.profiles.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-lg">
                  {story.emoji_content || story.profiles.display_name[0]}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[64px]">
              {story.profiles.display_name}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                className="w-full px-3 py-2 border rounded-md"
                maxLength={5}
              />
            </div>
            <Button onClick={createStory} className="w-full">
              Share Story
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="sm:max-w-md">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={() => setSelectedStory(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          {selectedStory && (
            <div className="space-y-4 pt-6">
              <div
                className="min-h-[400px] rounded-lg p-8 flex flex-col items-center justify-center"
                style={{ backgroundColor: selectedStory.background_color }}
              >
                {selectedStory.emoji_content && (
                  <div className="text-6xl mb-4">{selectedStory.emoji_content}</div>
                )}
                {selectedStory.text_content && (
                  <p className="text-lg text-center text-white font-medium">
                    {selectedStory.text_content}
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                {["❤️", "😂", "😮", "👏", "🔥"].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="outline"
                    size="sm"
                    onClick={() => reactToStory(emoji)}
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
