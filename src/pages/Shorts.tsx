import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  BadgeCheck,
  Loader2,
  Play
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ShortVideo {
  id: string;
  content: string | null;
  media_url: string;
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
}

const Shorts = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchShorts();
  }, []);

  useEffect(() => {
    // Auto-play current video
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
      fetchLikedVideos(session.user.id);
    }
  };

  const fetchShorts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          media_url,
          likes_count,
          comments_count,
          created_at,
          profiles (id, username, display_name, avatar_url, is_verified)
        `)
        .eq("media_type", "short_video")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setVideos((data as ShortVideo[]) || []);
    } catch (error: any) {
      console.error("Error fetching shorts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedVideos = async (userId: string) => {
    const { data } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId);
    
    if (data) {
      setLikedVideos(new Set(data.map(d => d.post_id)));
    }
  };

  const handleScroll = (direction: "up" | "down") => {
    if (direction === "up" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "down" && currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      handleScroll("up");
    } else if (e.key === "ArrowDown") {
      handleScroll("down");
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, videos.length]);

  const handleLike = async (videoId: string) => {
    if (!user) return;

    const isLiked = likedVideos.has(videoId);
    
    try {
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", videoId)
          .eq("user_id", user.id);
        
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
        
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, likes_count: v.likes_count - 1 } : v
        ));
      } else {
        await supabase.from("likes").insert({
          post_id: videoId,
          user_id: user.id,
        });
        
        setLikedVideos(prev => new Set([...prev, videoId]));
        
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, likes_count: v.likes_count + 1 } : v
        ));
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleShare = async (videoId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${videoId}`);
      toast({ title: "Link copied!", description: "Video link copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const togglePlayPause = () => {
    const video = videoRefs.current[currentIndex];
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main 
        ref={containerRef}
        className="fixed inset-0 pt-16 flex items-center justify-center"
      >
        {videos.length === 0 ? (
          <div className="text-center text-white">
            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No shorts yet</p>
            <p className="text-sm text-gray-400">Be the first to share a short video!</p>
          </div>
        ) : (
          <div className="relative h-full w-full max-w-md mx-auto">
            {/* Video Container */}
            <div className="relative h-full">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
                >
                  <video
                    ref={(el) => (videoRefs.current[index] = el)}
                    src={video.media_url}
                    className="h-full w-full object-contain cursor-pointer"
                    loop
                    muted={isMuted}
                    playsInline
                    onClick={togglePlayPause}
                  />
                  
                  {/* Play/Pause indicator */}
                  {!isPlaying && index === currentIndex && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="w-20 h-20 text-white opacity-80" />
                    </div>
                  )}
                  
                  {/* Video Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-16 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10 border-2 border-white">
                        <AvatarImage src={video.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {video.profiles.display_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-white font-semibold text-sm">
                            {video.profiles.display_name}
                          </span>
                          {video.profiles.is_verified && (
                            <BadgeCheck className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-gray-300 text-xs">
                          @{video.profiles.username}
                        </span>
                      </div>
                    </div>
                    
                    {video.content && (
                      <p className="text-white text-sm mb-2 line-clamp-2">
                        {video.content}
                      </p>
                    )}
                    
                    <span className="text-gray-400 text-xs">
                      {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Side Actions */}
            <div className="absolute right-2 bottom-32 flex flex-col gap-6 z-20">
              <button
                onClick={() => handleLike(videos[currentIndex]?.id)}
                className="flex flex-col items-center"
              >
                <div className={`w-12 h-12 rounded-full bg-black/50 flex items-center justify-center ${
                  likedVideos.has(videos[currentIndex]?.id) ? "text-red-500" : "text-white"
                }`}>
                  <Heart className={`w-6 h-6 ${likedVideos.has(videos[currentIndex]?.id) ? "fill-current" : ""}`} />
                </div>
                <span className="text-white text-xs mt-1">
                  {videos[currentIndex]?.likes_count || 0}
                </span>
              </button>

              <button className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-white text-xs mt-1">
                  {videos[currentIndex]?.comments_count || 0}
                </span>
              </button>

              <button
                onClick={() => handleShare(videos[currentIndex]?.id)}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="text-white text-xs mt-1">Share</span>
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white">
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </div>
              </button>
            </div>

            {/* Navigation Buttons */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleScroll("up")}
                disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30"
              >
                <ChevronUp className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleScroll("down")}
                disabled={currentIndex === videos.length - 1}
                className="w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30"
              >
                <ChevronDown className="w-6 h-6" />
              </Button>
            </div>

            {/* Progress Indicator */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {videos.slice(Math.max(0, currentIndex - 2), Math.min(videos.length, currentIndex + 3)).map((_, idx) => {
                const actualIndex = Math.max(0, currentIndex - 2) + idx;
                return (
                  <div
                    key={actualIndex}
                    className={`w-1 h-1 rounded-full ${
                      actualIndex === currentIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Shorts;
