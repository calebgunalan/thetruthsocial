import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Image, Video, Music, Send } from "lucide-react";

interface CreatePostProps {
  onPostCreated: () => void;
  userId: string;
}

const CreatePost = ({ onPostCreated, userId }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content.trim(),
        post_type: mediaType || "text",
        media_type: mediaType,
      });

      if (error) throw error;

      setContent("");
      setMediaType(null);
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

  return (
    <div className="bg-card rounded-lg shadow-subtle hairline p-4">
      <Textarea
        placeholder="What's the truth?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px] resize-none bg-input hairline mb-3 focus:ring-1 focus:ring-primary transition-smooth"
      />
      
      <div className="flex items-center justify-between hairline-t pt-3">
        <div className="flex gap-2">
          <Button
            variant={mediaType === "image" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMediaType(mediaType === "image" ? null : "image")}
            className="text-muted-foreground hover:text-primary transition-smooth"
          >
            <Image className="w-4 h-4" />
          </Button>
          <Button
            variant={mediaType === "short_video" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMediaType(mediaType === "short_video" ? null : "short_video")}
            className="text-muted-foreground hover:text-primary transition-smooth"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button
            variant={mediaType === "music" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMediaType(mediaType === "music" ? null : "music")}
            className="text-muted-foreground hover:text-primary transition-smooth"
          >
            <Music className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="gradient-silver hover:opacity-90 transition-smooth"
          size="sm"
        >
          <Send className="w-4 h-4 mr-1" />
          Post
        </Button>
      </div>
    </div>
  );
};

export default CreatePost;
