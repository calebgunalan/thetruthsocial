import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostCard from "@/components/PostCard";
import {
  Search as SearchIcon,
  Users,
  FileText,
  Hash,
  BadgeCheck,
  Loader2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  posts: any[];
  users: any[];
  hashtags: any[];
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult>({
    posts: [],
    users: [],
    hashtags: [],
  });
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
    };
    checkAuth();

    // Load recent searches from localStorage
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, [navigate]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Search posts (using ILIKE for simple text search)
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (id, username, display_name, avatar_url, is_verified)
        `)
        .ilike("content", `%${searchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Search users
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (usersError) throw usersError;

      // Search hashtags
      const { data: hashtags, error: hashtagsError } = await supabase
        .from("hashtags")
        .select("*")
        .ilike("tag", `%${searchQuery.replace("#", "")}%`)
        .order("use_count", { ascending: false })
        .limit(20);

      if (hashtagsError) throw hashtagsError;

      setResults({
        posts: posts || [],
        users: users || [],
        hashtags: hashtags || [],
      });

      // Save to recent searches
      const updated = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [recentSearches, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const handleRecentSearch = (term: string) => {
    setQuery(term);
    setSearchParams({ q: term });
  };

  const handleClearRecent = (term: string) => {
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleFollowUser = async (profileId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        following_id: profileId,
      });
      if (error) throw error;
      toast({ title: "Followed!", description: "You are now following this user" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const totalResults = results.posts.length + results.users.length + results.hashtags.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, users, or hashtags..."
              className="pl-12 pr-4 py-6 text-lg"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </form>

        {!searchParams.get("q") && recentSearches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <Badge
                  key={term}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 group"
                  onClick={() => handleRecentSearch(term)}
                >
                  {term}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearRecent(term);
                    }}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {searchParams.get("q") && (
          <>
            <div className="mb-4">
              <p className="text-muted-foreground">
                {loading
                  ? "Searching..."
                  : `${totalResults} results for "${searchParams.get("q")}"`}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Posts ({results.posts.length})
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Users ({results.users.length})
                </TabsTrigger>
                <TabsTrigger value="hashtags" className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  Tags ({results.hashtags.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                {results.users.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      People
                    </h3>
                    <div className="grid gap-3">
                      {results.users.slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-card rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback>
                                {user.display_name?.charAt(0) || user.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-1">
                                {user.display_name}
                                {user.is_verified && (
                                  <BadgeCheck className="w-4 h-4 text-primary" />
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFollowUser(user.id)}
                          >
                            Follow
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.hashtags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Hashtags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {results.hashtags.slice(0, 10).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleRecentSearch(`#${tag.tag}`)}
                        >
                          #{tag.tag}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({tag.use_count})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {results.posts.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Posts
                    </h3>
                    <div className="space-y-4">
                      {results.posts.slice(0, 5).map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUserId={userId || ""}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {totalResults === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No results found for "{searchParams.get("q")}"</p>
                    <p className="text-sm mt-1">Try different keywords</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts" className="space-y-4">
                {results.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={userId || ""}
                  />
                ))}
                {results.posts.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No posts found
                  </p>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-3">
                {results.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.display_name?.charAt(0) || user.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium flex items-center gap-1">
                          {user.display_name}
                          {user.is_verified && (
                            <BadgeCheck className="w-4 h-4 text-primary" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleFollowUser(user.id)}
                    >
                      Follow
                    </Button>
                  </div>
                ))}
                {results.users.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No users found
                  </p>
                )}
              </TabsContent>

              <TabsContent value="hashtags" className="space-y-3">
                {results.hashtags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg border cursor-pointer hover:bg-accent"
                    onClick={() => handleRecentSearch(`#${tag.tag}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Hash className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">#{tag.tag}</p>
                        <p className="text-sm text-muted-foreground">
                          {tag.use_count} posts
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {results.hashtags.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No hashtags found
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Search;
