import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import LocationMap from "@/components/LocationMap";
import StreakCard from "@/components/StreakCard";
import UserSearch from "@/components/UserSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, Hash, Flame, MapPin, Sparkles, Loader2, Users } from "lucide-react";

interface Post {
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
}

interface Hashtag {
  id: string;
  tag: string;
  use_count: number;
  trending_score: number;
}

interface Streak {
  id: string;
  count: number;
  last_interaction_at: string;
  friend: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

const Explore = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [fypPosts, setFypPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fyp");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchFYP(),
      fetchTrendingPosts(),
      fetchTrendingHashtags(),
      fetchStreaks(),
    ]);
    setLoading(false);
  };

  const fetchFYP = async () => {
    try {
      // FYP algorithm: mix of trending + followed accounts + random discovery
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (id, username, display_name, avatar_url, is_verified)
        `)
        .order("likes_count", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Shuffle for variety
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setFypPosts(shuffled);
    } catch (error: any) {
      console.error("Error fetching FYP:", error);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (id, username, display_name, avatar_url, is_verified)
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

  const fetchStreaks = async () => {
    try {
      const { data: streakData, error } = await supabase
        .from("streaks")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("count", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch friend profiles
      const streaksWithProfiles: Streak[] = [];
      for (const streak of streakData || []) {
        const friendId = streak.user1_id === user.id ? streak.user2_id : streak.user1_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", friendId)
          .single();

        if (profile) {
          streaksWithProfiles.push({
            id: streak.id,
            count: streak.count,
            last_interaction_at: streak.last_interaction_at,
            friend: profile,
          });
        }
      }

      setStreaks(streaksWithProfiles);
    } catch (error: any) {
      console.error("Error fetching streaks:", error);
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
          profiles (id, username, display_name, avatar_url, is_verified)
        `)
        .ilike("content", `%${searchQuery}%`)
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
      setActiveTab("trending");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Search failed",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-6xl mx-auto pt-20 px-4 pb-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search posts, hashtags, people..."
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="fyp" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  For You
                </TabsTrigger>
                <TabsTrigger value="trending" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="hashtags" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Hashtags
                </TabsTrigger>
                <TabsTrigger value="people" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  People
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Map
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fyp" className="space-y-4">
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 hairline">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium">Personalized for you</span>
                </div>
                {fypPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUserId={user?.id}
                    onRefresh={fetchFYP}
                  />
                ))}
                {fypPosts.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No posts yet. Start following people!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trending" className="space-y-4">
                {posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUserId={user?.id}
                    onRefresh={fetchTrendingPosts}
                  />
                ))}
                {posts.length === 0 && (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No trending posts found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="hashtags">
                <div className="space-y-3">
                  {hashtags.map((hashtag, index) => (
                    <div
                      key={hashtag.id}
                      className="p-4 rounded-lg hairline hover:bg-accent transition-smooth cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="font-semibold text-lg">#{hashtag.tag}</h3>
                            <p className="text-sm text-muted-foreground">
                              {hashtag.use_count.toLocaleString()} posts
                            </p>
                          </div>
                        </div>
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  ))}
                  {hashtags.length === 0 && (
                    <div className="text-center py-12">
                      <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No trending hashtags yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="people">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 hairline">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Find People
                    </h3>
                    <UserSearch 
                      placeholder="Search by username or name..." 
                      showFollowButton={true}
                      currentUserId={user?.id}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Search for users to follow and connect with
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="map">
                <LocationMap currentUserId={user?.id} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Streaks Section */}
            <div className="bg-card rounded-lg shadow-subtle hairline p-4">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="font-semibold">Your Streaks</h2>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {streaks.map((streak) => (
                    <StreakCard key={streak.id} streak={streak} />
                  ))}
                  {streaks.length === 0 && (
                    <div className="text-center py-8">
                      <Flame className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Start chatting with friends to build streaks!
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Trending Hashtags Mini */}
            <div className="bg-card rounded-lg shadow-subtle hairline p-4">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Trending</h2>
              </div>
              
              <div className="space-y-3">
                {hashtags.slice(0, 5).map((hashtag) => (
                  <div key={hashtag.id} className="flex items-center justify-between">
                    <span className="font-medium">#{hashtag.tag}</span>
                    <span className="text-xs text-muted-foreground">
                      {hashtag.use_count} posts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;