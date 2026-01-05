import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import BusinessProfileCard from "@/components/BusinessProfileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  User, 
  Edit2, 
  Save, 
  BadgeCheck, 
  Users, 
  Bookmark,
  Heart,
  Grid,
  Loader2,
  Building2,
  Plus,
  Camera
} from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

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

interface Collection {
  id: string;
  name: string;
  items_count?: number;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  description: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessDesc, setNewBusinessDesc] = useState("");
  const [newBusinessCategory, setNewBusinessCategory] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();
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
      fetchProfile(),
      fetchUserPosts(),
      fetchLikedPosts(),
      fetchCollections(),
      fetchFollowCounts(),
      fetchBusinessProfile(),
    ]);
    setLoading(false);
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (id, username, display_name, avatar_url, is_verified)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    }
  };

  const fetchLikedPosts = async () => {
    try {
      const { data: likes, error: likesError } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id);

      if (likesError) throw likesError;

      if (likes && likes.length > 0) {
        const postIds = likes.map((l) => l.post_id);
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(`
            *,
            profiles (id, username, display_name, avatar_url, is_verified)
          `)
          .in("id", postIds);

        if (postsError) throw postsError;
        setLikedPosts(postsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching liked posts:", error);
    }
  };

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_collections")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setCollections(data || []);
    } catch (error: any) {
      console.error("Error fetching collections:", error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact" }).eq("following_id", user.id),
        supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", user.id),
      ]);

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
    } catch (error: any) {
      console.error("Error fetching follow counts:", error);
    }
  };

  const fetchBusinessProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setBusinessProfile(data);
    } catch (error: any) {
      console.error("Error fetching business profile:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file, "avatars", user.id);
    if (result) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: result.url })
          .eq("id", user.id);

        if (error) throw error;

        toast({ title: "Avatar updated!" });
        fetchProfile();
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Success", description: "Profile updated successfully" });
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const createBusinessProfile = async () => {
    if (!newBusinessName.trim()) return;

    try {
      const { error } = await supabase.from("business_profiles").insert({
        profile_id: user.id,
        business_name: newBusinessName.trim(),
        description: newBusinessDesc.trim() || null,
        category: newBusinessCategory.trim() || null,
      });

      if (error) throw error;

      toast({ title: "Business profile created!" });
      setShowBusinessForm(false);
      setNewBusinessName("");
      setNewBusinessDesc("");
      setNewBusinessCategory("");
      fetchBusinessProfile();
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
      
      <main className="max-w-4xl mx-auto pt-20 px-4 pb-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="hairline rounded-lg p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              
              <div className="flex-1 w-full">
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display Name"
                    />
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Bio"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateProfile} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
                        {profile?.is_verified && (
                          <BadgeCheck className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                    <p className="text-muted-foreground mb-2">@{profile?.username}</p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-6 my-4">
                      <div className="text-center">
                        <p className="text-xl font-bold">{posts.length}</p>
                        <p className="text-sm text-muted-foreground">Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold">{followersCount}</p>
                        <p className="text-sm text-muted-foreground">Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold">{followingCount}</p>
                        <p className="text-sm text-muted-foreground">Following</p>
                      </div>
                    </div>
                    
                    {profile?.bio && (
                      <p className="text-sm">{profile.bio}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Profile */}
        {businessProfile ? (
          <div className="mb-6">
            <BusinessProfileCard business={businessProfile} />
          </div>
        ) : (
          <Dialog open={showBusinessForm} onOpenChange={setShowBusinessForm}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-6 w-full md:w-auto">
                <Building2 className="w-4 h-4 mr-2" />
                Create Business Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Business Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="Business Name"
                />
                <Input
                  value={newBusinessCategory}
                  onChange={(e) => setNewBusinessCategory(e.target.value)}
                  placeholder="Category (e.g., Restaurant, Tech, Fashion)"
                />
                <Textarea
                  value={newBusinessDesc}
                  onChange={(e) => setNewBusinessDesc(e.target.value)}
                  placeholder="Description"
                  rows={3}
                />
                <Button onClick={createBusinessProfile} disabled={!newBusinessName.trim()} className="w-full">
                  Create Business Profile
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="likes" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Likes
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserId={user?.id}
                onRefresh={fetchUserPosts}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12">
                <Grid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <div className="grid grid-cols-3 gap-2">
              {posts
                .filter((p) => p.media_url)
                .map((post) => (
                  <div key={post.id} className="aspect-square rounded-lg overflow-hidden hairline group relative">
                    {post.media_type?.includes("image") && (
                      <img
                        src={post.media_url!}
                        alt="Media"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {post.media_type?.includes("video") && (
                      <video
                        src={post.media_url!}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center gap-4 text-white">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {post.likes_count}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {posts.filter((p) => p.media_url).length === 0 && (
              <div className="text-center py-12">
                <Grid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No media yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="likes" className="space-y-4 mt-6">
            {likedPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserId={user?.id}
              />
            ))}
            {likedPosts.length === 0 && (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No liked posts yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="p-4 rounded-lg hairline hover:bg-accent transition-smooth cursor-pointer"
                >
                  <div className="w-full aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                    <Bookmark className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">{collection.name}</p>
                </div>
              ))}
            </div>
            {collections.length === 0 && (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved collections yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Bookmark posts to save them here
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
