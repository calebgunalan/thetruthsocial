import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  BadgeCheck, 
  Repeat2, 
  Bookmark,
  MoreHorizontal,
  Pin
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    media_url: string | null;
    media_type: string | null;
    post_type: string;
    likes_count: number;
    comments_count: number;
    repost_count?: number;
    is_pinned?: boolean;
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
  onRefresh?: () => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

const PostCard = ({ post, currentUserId, onRefresh }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);
  const [showQuote, setShowQuote] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const { toast } = useToast();

  useEffect(() => {
    checkIfLiked();
    checkIfBookmarked();
    checkIfReposted();
  }, [post.id, currentUserId]);

  const checkIfLiked = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setLiked(!!data);
  };

  const checkIfBookmarked = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("collection_items")
      .select("id")
      .eq("post_id", post.id)
      .maybeSingle();
    setBookmarked(!!data);
  };

  const checkIfReposted = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("reposts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setReposted(!!data);
  };

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      if (liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setLiked(false);
        setLikesCount((c) => c - 1);
      } else {
        await supabase.from("likes").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        setLiked(true);
        setLikesCount((c) => c + 1);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRepost = async () => {
    if (!currentUserId) return;
    try {
      if (reposted) {
        await supabase
          .from("reposts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setReposted(false);
        setRepostCount((c) => c - 1);
      } else {
        await supabase.from("reposts").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        setReposted(true);
        setRepostCount((c) => c + 1);
        toast({ title: "Reposted!", description: "Post shared to your profile" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleQuoteRepost = async () => {
    if (!currentUserId || !quoteText.trim()) return;
    try {
      await supabase.from("reposts").insert({
        post_id: post.id,
        user_id: currentUserId,
        quote_text: quoteText.trim(),
      });
      setRepostCount((c) => c + 1);
      setShowQuote(false);
      setQuoteText("");
      toast({ title: "Quote posted!", description: "Your quote has been shared" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBookmark = async () => {
    if (!currentUserId) return;
    try {
      // Get or create default collection
      let { data: collection } = await supabase
        .from("saved_collections")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("name", "Saved")
        .maybeSingle();

      if (!collection) {
        const { data: newCollection } = await supabase
          .from("saved_collections")
          .insert({ user_id: currentUserId, name: "Saved" })
          .select("id")
          .single();
        collection = newCollection;
      }

      if (bookmarked) {
        await supabase
          .from("collection_items")
          .delete()
          .eq("post_id", post.id)
          .eq("collection_id", collection!.id);
        setBookmarked(false);
        toast({ title: "Removed", description: "Removed from saved" });
      } else {
        await supabase.from("collection_items").insert({
          collection_id: collection!.id,
          post_id: post.id,
        });
        setBookmarked(true);
        toast({ title: "Saved!", description: "Added to your collection" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePin = async () => {
    if (post.profiles.id !== currentUserId) return;
    try {
      if (post.is_pinned) {
        await supabase
          .from("pinned_posts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        toast({ title: "Unpinned", description: "Post unpinned from profile" });
      } else {
        await supabase.from("pinned_posts").upsert({
          user_id: currentUserId,
          post_id: post.id,
        });
        toast({ title: "Pinned!", description: "Post pinned to your profile" });
      }
      onRefresh?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        profiles (username, display_name, avatar_url, is_verified)
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
  };

  const handleOpenComments = () => {
    setShowComments(true);
    fetchComments();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    try {
      await supabase.from("comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      });
      setNewComment("");
      setCommentsCount((c) => c + 1);
      fetchComments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast({ title: "Link copied!", description: "Post link copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="bg-card rounded-lg shadow-subtle hairline p-4 transition-smooth hover:shadow-medium relative">
        {post.is_pinned && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Pin className="w-3 h-3" />
            Pinned
          </div>
        )}
        
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.profiles.id === currentUserId && (
                    <DropdownMenuItem onClick={handlePin}>
                      <Pin className="w-4 h-4 mr-2" />
                      {post.is_pinned ? "Unpin" : "Pin to profile"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                {(post.media_type === "video" || post.media_type === "short_video") && (
                  <video
                    src={post.media_url}
                    controls
                    className="w-full object-cover max-h-96"
                  />
                )}
                {post.media_type === "music" && (
                  <audio src={post.media_url} controls className="w-full" />
                )}
              </div>
            )}

            <div className="flex items-center gap-4 hairline-t pt-3">
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
                onClick={handleOpenComments}
                className="text-muted-foreground hover:text-primary transition-smooth"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">{commentsCount}</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-muted-foreground hover:text-green-500 transition-smooth ${
                      reposted ? "text-green-500" : ""
                    }`}
                  >
                    <Repeat2 className="w-4 h-4 mr-1" />
                    <span className="text-sm">{repostCount}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleRepost}>
                    <Repeat2 className="w-4 h-4 mr-2" />
                    {reposted ? "Undo Repost" : "Repost"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowQuote(true)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Quote
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={`text-muted-foreground hover:text-primary transition-smooth ${
                  bookmarked ? "text-primary" : ""
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-muted-foreground hover:text-primary transition-smooth"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Dialog */}
      <Dialog open={showQuote} onOpenChange={setShowQuote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quote this post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            placeholder="Add your thoughts..."
            className="min-h-[100px]"
          />
          <div className="hairline rounded-lg p-3 mt-2">
            <p className="text-sm text-muted-foreground">@{post.profiles.username}</p>
            <p className="text-sm truncate">{post.content}</p>
          </div>
          <Button onClick={handleQuoteRepost} disabled={!quoteText.trim()}>
            Post Quote
          </Button>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-silver flex items-center justify-center flex-shrink-0">
                    {comment.profiles.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold">
                        {comment.profiles.display_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.profiles.display_name}</span>
                      {comment.profiles.is_verified && (
                        <BadgeCheck className="w-3 h-3 text-primary" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No comments yet</p>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
              placeholder="Write a comment..."
              className="flex-1"
            />
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>
              Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostCard;