import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ListVideo, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Play, 
  GripVertical,
  Globe,
  Lock,
  Loader2
} from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  channel_id: string | null;
  created_at: string;
}

interface PlaylistItem {
  id: string;
  position: number;
  post_id: string;
  post?: {
    id: string;
    content: string;
    media_url: string | null;
    thumbnail_url: string | null;
  };
}

interface PlaylistManagerProps {
  currentUserId: string;
  channelId?: string;
  onPlayVideo?: (postId: string) => void;
}

const PlaylistManager = ({ currentUserId, channelId, onPlayVideo }: PlaylistManagerProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlaylists();
  }, [currentUserId, channelId]);

  const fetchPlaylists = async () => {
    try {
      let query = supabase
        .from("playlists")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (channelId) {
        query = query.eq("channel_id", channelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPlaylists(data || []);

      if (data && data.length > 0 && !selectedPlaylist) {
        setSelectedPlaylist(data[0]);
        fetchPlaylistItems(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistItems = async (playlistId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("playlist_items")
        .select(`
          id,
          position,
          post_id,
          posts (id, content, media_url, thumbnail_url)
        `)
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });

      if (error) throw error;

      const items = (data || []).map((item: any) => ({
        id: item.id,
        position: item.position,
        post_id: item.post_id,
        post: item.posts,
      }));

      setPlaylistItems(items);
    } catch (error: any) {
      console.error("Error fetching playlist items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const createPlaylist = async () => {
    if (!name.trim()) return;

    try {
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: currentUserId,
          name: name.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          channel_id: channelId || null,
        })
        .select()
        .single();

      if (error) throw error;

      setPlaylists((prev) => [data, ...prev]);
      setShowCreate(false);
      resetForm();
      toast({ title: "Playlist created!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updatePlaylist = async () => {
    if (!selectedPlaylist || !name.trim()) return;

    try {
      const { error } = await supabase
        .from("playlists")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        })
        .eq("id", selectedPlaylist.id);

      if (error) throw error;

      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === selectedPlaylist.id
            ? { ...p, name: name.trim(), description: description.trim() || null, is_public: isPublic }
            : p
        )
      );
      setSelectedPlaylist((prev) =>
        prev ? { ...prev, name: name.trim(), description: description.trim() || null, is_public: isPublic } : null
      );
      setShowEdit(false);
      toast({ title: "Playlist updated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    try {
      // Delete items first
      await supabase.from("playlist_items").delete().eq("playlist_id", playlistId);
      
      // Delete playlist
      const { error } = await supabase.from("playlists").delete().eq("id", playlistId);
      if (error) throw error;

      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        const remaining = playlists.filter((p) => p.id !== playlistId);
        if (remaining.length > 0) {
          setSelectedPlaylist(remaining[0]);
          fetchPlaylistItems(remaining[0].id);
        } else {
          setSelectedPlaylist(null);
          setPlaylistItems([]);
        }
      }
      toast({ title: "Playlist deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removeFromPlaylist = async (itemId: string) => {
    try {
      const { error } = await supabase.from("playlist_items").delete().eq("id", itemId);
      if (error) throw error;

      setPlaylistItems((prev) => prev.filter((item) => item.id !== itemId));
      toast({ title: "Removed from playlist" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const selectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    fetchPlaylistItems(playlist.id);
  };

  const openEditDialog = () => {
    if (selectedPlaylist) {
      setName(selectedPlaylist.name);
      setDescription(selectedPlaylist.description || "");
      setIsPublic(selectedPlaylist.is_public);
      setShowEdit(true);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsPublic(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ListVideo className="w-5 h-5" />
          Playlists
        </h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Playlist name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublic(true)}
                  className="flex-1"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Public
                </Button>
                <Button
                  type="button"
                  variant={!isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublic(false)}
                  className="flex-1"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Private
                </Button>
              </div>
              <Button onClick={createPlaylist} disabled={!name.trim()} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12 hairline rounded-lg">
          <ListVideo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No playlists yet</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Playlists sidebar */}
          <div className="md:col-span-1 space-y-2">
            <ScrollArea className="h-80 md:h-[400px] pr-4">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-smooth hairline ${
                    selectedPlaylist?.id === playlist.id
                      ? "bg-primary/10"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => selectPlaylist(playlist)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ListVideo className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="truncate text-sm font-medium block">{playlist.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {playlist.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {playlist.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedPlaylist(playlist);
                        openEditDialog();
                      }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deletePlaylist(playlist.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Playlist items */}
          <div className="md:col-span-3">
            {selectedPlaylist && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedPlaylist.name}</h3>
                    {selectedPlaylist.description && (
                      <p className="text-sm text-muted-foreground">{selectedPlaylist.description}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={openEditDialog}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>

                {loadingItems ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : playlistItems.length === 0 ? (
                  <div className="text-center py-12 hairline rounded-lg">
                    <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No videos in this playlist</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add videos to this playlist from the video page
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2 pr-4">
                      {playlistItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg hairline hover:bg-accent transition-smooth group"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                          <div
                            className="w-24 h-14 rounded bg-muted flex-shrink-0 overflow-hidden cursor-pointer"
                            onClick={() => onPlayVideo?.(item.post_id)}
                          >
                            {item.post?.thumbnail_url || item.post?.media_url ? (
                              <img
                                src={item.post.thumbnail_url || item.post.media_url || ""}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.post?.content || "Untitled Video"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFromPlaylist(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Playlist name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={isPublic ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPublic(true)}
                className="flex-1"
              >
                <Globe className="w-4 h-4 mr-2" />
                Public
              </Button>
              <Button
                type="button"
                variant={!isPublic ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPublic(false)}
                className="flex-1"
              >
                <Lock className="w-4 h-4 mr-2" />
                Private
              </Button>
            </div>
            <Button onClick={updatePlaylist} disabled={!name.trim()} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaylistManager;
