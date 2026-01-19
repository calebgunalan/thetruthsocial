import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Image, Video, Music, Send, X, BarChart2, Loader2, Shield } from "lucide-react";
import FileUploader from "@/components/media/FileUploader";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useContentModeration } from "@/hooks/useContentModeration";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreatePostProps {
  onPostCreated: () => void;
  userId: string;
}

interface PollOption {
  text: string;
}

const CreatePost = ({ onPostCreated, userId }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<PollOption[]>([{ text: "" }, { text: "" }]);
  const [pollDuration, setPollDuration] = useState(24); // hours
  
  const { uploadFile, uploading, progress, getMediaType } = useFileUpload();
  const { checkAndWarn, moderating } = useContentModeration();
  const { toast } = useToast();

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    const detectedType = getMediaType(file);
    if (detectedType) {
      setMediaType(detectedType);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !selectedFile) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check content with AI moderation
      if (content.trim()) {
        const isAllowed = await checkAndWarn(content.trim(), 'text');
        if (!isAllowed) {
          setLoading(false);
          return;
        }
      }

      let mediaUrl = null;

      // Upload file if selected
      if (selectedFile) {
        const result = await uploadFile(selectedFile, "media", userId);
        if (result) {
          mediaUrl = result.url;
        } else {
          setLoading(false);
          return; // Upload failed, error toast already shown
        }
      }

      const { data: postData, error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content.trim(),
        post_type: mediaType || "text",
        media_type: mediaType,
        media_url: mediaUrl,
      }).select("id").single();

      if (error) throw error;

      // If we have a poll, create it
      if (showPollDialog && pollQuestion.trim() && postData) {
        const validOptions = pollOptions.filter(o => o.text.trim());
        if (validOptions.length >= 2) {
          const endsAt = new Date();
          endsAt.setHours(endsAt.getHours() + pollDuration);

          const { data: pollData, error: pollError } = await supabase
            .from("polls")
            .insert({
              post_id: postData.id,
              question: pollQuestion.trim(),
              ends_at: endsAt.toISOString(),
            })
            .select("id")
            .single();

          if (!pollError && pollData) {
            // Insert poll options
            await supabase.from("poll_options").insert(
              validOptions.map((option) => ({
                poll_id: pollData.id,
                option_text: option.text.trim(),
              }))
            );
          }
        }
      }

      // Reset form
      setContent("");
      setMediaType(null);
      handleRemoveFile();
      resetPoll();
      
      toast({
        title: "Posted!",
        description: "Your post has been shared.",
      });
      onPostCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPoll = () => {
    setShowPollDialog(false);
    setPollQuestion("");
    setPollOptions([{ text: "" }, { text: "" }]);
    setPollDuration(24);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, { text: "" }]);
    }
  };

  const updatePollOption = (index: number, text: string) => {
    const newOptions = [...pollOptions];
    newOptions[index].text = text;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const getAcceptedTypes = () => {
    switch (mediaType) {
      case "image":
        return "image/*";
      case "short_video":
      case "long_video":
        return "video/*";
      case "music":
        return "audio/*";
      default:
        return "image/*,video/*,audio/*";
    }
  };

  return (
    <>
      <div className="bg-card rounded-lg shadow-subtle hairline p-4">
        <Textarea
          placeholder="What's the truth?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none bg-input hairline mb-3 focus:ring-1 focus:ring-primary transition-smooth"
        />
        
        {/* File Upload Area */}
        {mediaType && !selectedFile && (
          <div className="mb-3">
            <FileUploader
              onFileSelect={handleFileSelect}
              onRemove={handleRemoveFile}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              uploading={uploading}
              progress={progress}
              accept={getAcceptedTypes()}
              maxSize={mediaType === "music" ? 50 : mediaType?.includes("video") ? 100 : 10}
            />
          </div>
        )}

        {/* File Preview */}
        {selectedFile && previewUrl && (
          <div className="mb-3">
            <FileUploader
              onFileSelect={handleFileSelect}
              onRemove={handleRemoveFile}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              uploading={uploading}
              progress={progress}
              accept={getAcceptedTypes()}
            />
          </div>
        )}

        {/* Poll Preview */}
        {showPollDialog && pollQuestion && (
          <div className="mb-3 p-3 rounded-lg bg-muted/50 hairline">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">📊 Poll attached</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPoll}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{pollQuestion}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between hairline-t pt-3">
          <div className="flex gap-1">
            <Button
              variant={mediaType === "image" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (mediaType === "image") {
                  setMediaType(null);
                  handleRemoveFile();
                } else {
                  setMediaType("image");
                }
              }}
              className="text-muted-foreground hover:text-primary transition-smooth"
              disabled={loading || uploading}
            >
              <Image className="w-4 h-4" />
            </Button>
            <Button
              variant={mediaType === "short_video" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (mediaType === "short_video") {
                  setMediaType(null);
                  handleRemoveFile();
                } else {
                  setMediaType("short_video");
                }
              }}
              className="text-muted-foreground hover:text-primary transition-smooth"
              disabled={loading || uploading}
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button
              variant={mediaType === "music" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (mediaType === "music") {
                  setMediaType(null);
                  handleRemoveFile();
                } else {
                  setMediaType("music");
                }
              }}
              className="text-muted-foreground hover:text-primary transition-smooth"
              disabled={loading || uploading}
            >
              <Music className="w-4 h-4" />
            </Button>
            <Button
              variant={showPollDialog ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowPollDialog(!showPollDialog)}
              className="text-muted-foreground hover:text-primary transition-smooth"
              disabled={loading || uploading}
            >
              <BarChart2 className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || moderating || (!content.trim() && !selectedFile)}
            className="gradient-silver hover:opacity-90 transition-smooth"
            size="sm"
          >
            {loading || uploading || moderating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1" />
            )}
            {moderating ? "Checking..." : uploading ? "Uploading..." : "Post"}
          </Button>
        </div>
      </div>

      {/* Poll Creation Dialog */}
      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="poll-question">Question</Label>
              <Input
                id="poll-question"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="mt-1"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Options</Label>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option.text}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePollOption(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPollOption}
                  className="w-full"
                >
                  Add Option
                </Button>
              )}
            </div>

            <div>
              <Label htmlFor="poll-duration">Duration (hours)</Label>
              <Input
                id="poll-duration"
                type="number"
                min={1}
                max={168}
                value={pollDuration}
                onChange={(e) => setPollDuration(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <Button
              onClick={() => setShowPollDialog(false)}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.text.trim()).length < 2}
              className="w-full"
            >
              Add Poll to Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreatePost;
