import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, Check, Loader2, Star } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface CloseFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

const CloseFriendsModal = ({ open, onOpenChange, currentUserId }: CloseFriendsModalProps) => {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, currentUserId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch followers
      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", currentUserId);

      if (followsError) throw followsError;

      const followerIds = followsData?.map((f) => f.follower_id) || [];

      if (followerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified")
          .in("id", followerIds);

        if (profilesError) throw profilesError;
        setFollowers(profilesData || []);
      }

      // Fetch existing close friends
      const { data: closeFriendsData, error: closeFriendsError } = await supabase
        .from("close_friends")
        .select("friend_id")
        .eq("user_id", currentUserId);

      if (closeFriendsError) throw closeFriendsError;
      setCloseFriends(closeFriendsData?.map((cf) => cf.friend_id) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleCloseFriend = async (friendId: string) => {
    setSaving(true);
    try {
      if (closeFriends.includes(friendId)) {
        await supabase
          .from("close_friends")
          .delete()
          .eq("user_id", currentUserId)
          .eq("friend_id", friendId);
        setCloseFriends((prev) => prev.filter((id) => id !== friendId));
        toast({ title: "Removed from Close Friends" });
      } else {
        await supabase.from("close_friends").insert({
          user_id: currentUserId,
          friend_id: friendId,
        });
        setCloseFriends((prev) => [...prev, friendId]);
        toast({ title: "Added to Close Friends", description: "They can now see your private stories" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredFollowers = followers.filter(
    (f) =>
      f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Close Friends
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Share private stories with your close friends only.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search followers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No followers yet</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {filteredFollowers.map((follower) => {
                const isCloseFriend = closeFriends.includes(follower.id);
                return (
                  <div
                    key={follower.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-smooth cursor-pointer hairline ${
                      isCloseFriend ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                    onClick={() => toggleCloseFriend(follower.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={follower.avatar_url || undefined} />
                        <AvatarFallback>
                          {follower.display_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{follower.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{follower.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-smooth ${
                        isCloseFriend
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {isCloseFriend && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 hairline-t">
          <span>{closeFriends.length} close friends selected</span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloseFriendsModal;
