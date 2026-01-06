import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bookmark, Plus, Trash2, FolderOpen, Loader2, Grid } from "lucide-react";
import PostCard from "./PostCard";

interface Collection {
  id: string;
  name: string;
  created_at: string;
}

interface CollectionItem {
  id: string;
  post_id: string;
  saved_at: string;
}

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

interface CollectionsManagerProps {
  currentUserId: string;
}

const CollectionsManager = ({ currentUserId }: CollectionsManagerProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCollections();
  }, [currentUserId]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_collections")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCollections(data || []);
      
      if (data && data.length > 0 && !selectedCollection) {
        setSelectedCollection(data[0]);
        fetchCollectionPosts(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionPosts = async (collectionId: string) => {
    setLoadingPosts(true);
    try {
      // First get the collection items
      const { data: items, error: itemsError } = await supabase
        .from("collection_items")
        .select("post_id")
        .eq("collection_id", collectionId);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const postIds = items.map((item) => item.post_id);
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(`
            *,
            profiles (id, username, display_name, avatar_url, is_verified)
          `)
          .in("id", postIds);

        if (postsError) throw postsError;
        setPosts(postsData || []);
      } else {
        setPosts([]);
      }
    } catch (error: any) {
      console.error("Error fetching collection posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("saved_collections")
        .insert({
          user_id: currentUserId,
          name: newCollectionName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setCollections((prev) => [data, ...prev]);
      setNewCollectionName("");
      setShowCreateDialog(false);
      toast({ title: "Collection created!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteCollection = async (collectionId: string) => {
    try {
      // First delete all items in the collection
      await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionId);

      // Then delete the collection
      const { error } = await supabase
        .from("saved_collections")
        .delete()
        .eq("id", collectionId);

      if (error) throw error;

      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      
      if (selectedCollection?.id === collectionId) {
        const remaining = collections.filter((c) => c.id !== collectionId);
        if (remaining.length > 0) {
          setSelectedCollection(remaining[0]);
          fetchCollectionPosts(remaining[0].id);
        } else {
          setSelectedCollection(null);
          setPosts([]);
        }
      }
      
      toast({ title: "Collection deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const selectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    fetchCollectionPosts(collection.id);
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
          <Bookmark className="w-5 h-5" />
          Saved Collections
        </h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
              />
              <Button onClick={createCollection} disabled={!newCollectionName.trim()} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12 hairline rounded-lg">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No collections yet</p>
          <p className="text-sm text-muted-foreground">
            Save posts by clicking the bookmark icon to organize them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Collections sidebar */}
          <div className="md:col-span-1 space-y-2">
            <ScrollArea className="h-80 md:h-[500px] pr-4">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-smooth hairline ${
                    selectedCollection?.id === collection.id
                      ? "bg-primary/10"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => selectCollection(collection)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{collection.name}</span>
                  </div>
                  {collection.name !== "Saved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCollection(collection.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Posts grid */}
          <div className="md:col-span-3">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 hairline rounded-lg">
                <Grid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved posts in this collection</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      onRefresh={() => fetchCollectionPosts(selectedCollection!.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsManager;
