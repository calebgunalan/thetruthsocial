import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Hash } from "lucide-react";

interface Post {
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
}

interface Hashtag {
  id: string;
  tag: string;
  use_count: number;
  trending_score: number;
}

const Explore = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchTrendingPosts();
    fetchTrendingHashtags();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .order("likes_count", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load trending posts",
        variant: "destructive",
      });
    }
  };

  const fetchTrendingHashtags = async () => {
    try {
      const { data, error } = await supabase
        .from("hashtags")
        .select("*")
        .order("trending_score", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHashtags(data || []);
    } catch (error: any) {
      console.error("Error fetching hashtags:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchTrendingPosts();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .ilike("content", `%${searchQuery}%`)
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Search failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-4xl mx-auto pt-20 px-4 pb-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search The Truth..."
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Hashtags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No trending posts found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hashtags">
            <div className="space-y-3">
              {hashtags.map((hashtag) => (
                <div
                  key={hashtag.id}
                  className="p-4 rounded-lg hairline hover:bg-accent transition-smooth cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">#{hashtag.tag}</h3>
                      <p className="text-sm text-muted-foreground">
                        {hashtag.use_count} posts
                      </p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>
              ))}
              {hashtags.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No trending hashtags</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Explore;
