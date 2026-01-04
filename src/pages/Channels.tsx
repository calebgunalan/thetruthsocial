import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import ChannelCard from "@/components/ChannelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Tv, Users, Loader2 } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  owner_id: string;
}

const Channels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [myChannels, setMyChannels] = useState<Channel[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchChannels();
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

  const fetchChannels = async () => {
    try {
      // Fetch all channels
      const { data: allChannels, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .order("subscriber_count", { ascending: false });

      if (channelsError) throw channelsError;

      // Fetch my channels
      const { data: mine } = await supabase
        .from("channels")
        .select("*")
        .eq("owner_id", user.id);

      // Fetch subscribed channels
      const { data: subscriptions } = await supabase
        .from("channel_subscribers")
        .select("channel_id")
        .eq("user_id", user.id);

      const subscribedIds = subscriptions?.map((s) => s.channel_id) || [];
      const subscribed = allChannels?.filter((c) => subscribedIds.includes(c.id)) || [];

      setChannels(allChannels || []);
      setMyChannels(mine || []);
      setSubscribedChannels(subscribed);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase.from("channels").insert({
        name: newName.trim(),
        description: newDescription.trim() || null,
        owner_id: user.id,
      });

      if (error) throw error;

      toast({ title: "Channel created!", description: "Your channel is now live" });
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      fetchChannels();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tv className="w-6 h-6" />
              Channels
            </h1>
            <p className="text-muted-foreground">Discover creators and subscribe</p>
          </div>
          
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Channel name"
                />
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                />
                <Button onClick={createChannel} disabled={!newName.trim()} className="w-full">
                  Create Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Tv className="w-4 h-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="subscribed" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Subscribed
            </TabsTrigger>
            <TabsTrigger value="mine">My Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  currentUserId={user?.id}
                  isSubscribed={subscribedChannels.some((c) => c.id === channel.id)}
                  onSubscriptionChange={fetchChannels}
                />
              ))}
              {channels.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Tv className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No channels yet. Be the first!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscribed">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscribedChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  currentUserId={user?.id}
                  isSubscribed={true}
                  onSubscriptionChange={fetchChannels}
                />
              ))}
              {subscribedChannels.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No subscriptions yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mine">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  currentUserId={user?.id}
                />
              ))}
              {myChannels.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Tv className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't created any channels</p>
                  <Button onClick={() => setShowCreate(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Channel
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Channels;