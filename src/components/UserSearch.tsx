import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, BadgeCheck, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

interface UserSearchProps {
  onSelect?: (user: SearchResult) => void;
  placeholder?: string;
  showFollowButton?: boolean;
  currentUserId?: string;
}

const UserSearch = ({ 
  onSelect, 
  placeholder = "Search users...",
  showFollowButton = false,
  currentUserId
}: UserSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showFollowButton && currentUserId) {
      fetchFollowing();
    }
  }, [showFollowButton, currentUserId]);

  const fetchFollowing = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);
    
    if (data) {
      setFollowingIds(new Set(data.map(f => f.following_id)));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchUsers();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
      setShowResults(true);
    } catch (error: any) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user: SearchResult) => {
    if (onSelect) {
      onSelect(user);
    } else {
      navigate(`/profile?id=${user.id}`);
    }
    setQuery("");
    setShowResults(false);
  };

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;

    try {
      const isFollowing = followingIds.has(userId);
      
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", userId);
        
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        toast({ title: "Unfollowed" });
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: userId,
        });
        
        setFollowingIds(prev => new Set(prev).add(userId));
        toast({ title: "Following!" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showResults && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-medium hairline z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-smooth"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.display_name?.charAt(0) || user.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">
                        {user.display_name || user.username}
                      </span>
                      {user.is_verified && (
                        <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">@{user.username}</span>
                  </div>
                  {showFollowButton && currentUserId && user.id !== currentUserId && (
                    <Button
                      variant={followingIds.has(user.id) ? "outline" : "default"}
                      size="sm"
                      onClick={(e) => handleFollow(user.id, e)}
                    >
                      {followingIds.has(user.id) ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
