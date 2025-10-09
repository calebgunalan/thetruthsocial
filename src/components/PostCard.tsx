import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Share2, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    media_url: string | null;
    media_type: string | null;
    post_type: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_verified: boolean;
    };
  };
  currentUserId: string;
}

const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const { toast } = useToast();

  const handleLike = async () => {
    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        setLiked(false);
        setLikesCount(likesCount - 1);
      } else {
        const { error } = await supabase.from("likes").insert({
          post_id: post.id,
          user_id: currentUserId,
        });

        if (error) throw error;
        setLiked(true);
        setLikesCount(likesCount + 1);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-subtle hairline p-4 transition-smooth hover:shadow-medium">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-silver flex items-center justify-center flex-shrink-0">
          {post.profiles.avatar_url ? (
            <img
              src={post.profiles.avatar_url}
              alt={post.profiles.display_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-primary-foreground font-semibold">
              {post.profiles.display_name?.charAt(0) || "U"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">
              {post.profiles.display_name}
            </span>
            {post.profiles.is_verified && (
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <span className="text-muted-foreground text-sm">
              @{post.profiles.username}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-foreground mb-3 whitespace-pre-wrap">{post.content}</p>

          {post.media_url && (
            <div className="mb-3 rounded-lg overflow-hidden hairline">
              {post.media_type === "image" && (
                <img
                  src={post.media_url}
                  alt="Post media"
                  className="w-full object-cover max-h-96"
                />
              )}
              {post.media_type === "video" && (
                <video
                  src={post.media_url}
                  controls
                  className="w-full object-cover max-h-96"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-6 hairline-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`text-muted-foreground hover:text-destructive transition-smooth ${
                liked ? "text-destructive" : ""
              }`}
            >
              <Heart className={`w-4 h-4 mr-1 ${liked ? "fill-current" : ""}`} />
              <span className="text-sm">{likesCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">{post.comments_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <Share2 className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
