import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";
import Stories from "@/components/Stories";
import MessagingPanel from "@/components/MessagingPanel";
import PollCard from "@/components/PollCard";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  post_type: string;
  likes_count: number;
  comments_count: number;
  repost_count: number | null;
  is_pinned: boolean | null;
  thumbnail_url: string | null;
  video_duration: number | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface Poll {
  id: string;
  question: string;
  ends_at: string;
  created_at: string;
  post_id: string;
  options: {
    id: string;
    option_text: string;
    vote_count: number;
  }[];
}

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<Map<string, Poll>>(new Map());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          navigate("/auth");
        }
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchPosts();
      setupRealtime();
    }
  }, [user]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
      
      // Fetch polls for posts with poll type
      const pollPostIds = (data || [])
        .filter(p => p.post_type === 'poll')
        .map(p => p.id);
      
      if (pollPostIds.length > 0) {
        await fetchPolls(pollPostIds);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async (postIds: string[]) => {
    const { data: pollsData } = await supabase
      .from("polls")
      .select(`
        *,
        poll_options (id, option_text, vote_count)
      `)
      .in("post_id", postIds);

    if (pollsData) {
      const pollMap = new Map<string, Poll>();
      pollsData.forEach((poll: any) => {
        pollMap.set(poll.post_id, {
          ...poll,
          options: poll.poll_options || [],
        });
      });
      setPolls(pollMap);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('feed-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          // Show new posts notification instead of auto-inserting
          setNewPostsCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          // Update post in place
          setPosts(prev => prev.map(post => 
            post.id === payload.new.id 
              ? { ...post, ...payload.new }
              : post
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadNewPosts = () => {
    setNewPostsCount(0);
    fetchPosts();
  };

  const handlePostCreated = () => {
    fetchPosts();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-2xl mx-auto pt-20 px-4 pb-8">
        {user && <Stories currentUserId={user.id} />}
        
        <CreatePost onPostCreated={handlePostCreated} userId={user?.id} />
        
        {/* New posts notification */}
        {newPostsCount > 0 && (
          <Button
            onClick={loadNewPosts}
            className="w-full mt-4 mb-2 bg-primary/10 text-primary hover:bg-primary/20"
            variant="ghost"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
          </Button>
        )}
        
        <div className="space-y-4 mt-6">
          {posts.map((post) => {
            // If it's a poll post, render PollCard
            if (post.post_type === 'poll' && polls.has(post.id)) {
              const poll = polls.get(post.id)!;
              return (
                <div key={post.id} className="space-y-2">
                  <PostCard post={post} currentUserId={user?.id} onRefresh={fetchPosts} />
                  <PollCard 
                    poll={poll} 
                    options={poll.options} 
                    currentUserId={user?.id} 
                  />
                </div>
              );
            }
            
            return (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserId={user?.id} 
                onRefresh={fetchPosts}
              />
            );
          })}
          
          {posts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No posts yet. Be the first to share!
              </p>
            </div>
          )}
        </div>
      </main>
      
      {user && <MessagingPanel currentUserId={user.id} />}
    </div>
  );
};

export default Feed;
