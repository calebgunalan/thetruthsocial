import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Edit2, Save } from "lucide-react";

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

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserPosts();
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
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
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

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-4xl mx-auto pt-20 px-4 pb-8">
        <div className="mb-8">
          <div className="hairline rounded-lg p-6">
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
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
                    <div className="flex items-center justify-between mb-2">
                      <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
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
                    {profile?.bio && (
                      <p className="text-sm mt-4">{profile.bio}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
            <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
            <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <div className="grid grid-cols-3 gap-2">
              {posts
                .filter(p => p.media_url)
                .map((post) => (
                  <div key={post.id} className="aspect-square rounded-lg overflow-hidden hairline">
                    {post.media_type?.startsWith("image") && (
                      <img
                        src={post.media_url!}
                        alt="Media"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {post.media_type?.startsWith("video") && (
                      <video
                        src={post.media_url!}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
            </div>
            {posts.filter(p => p.media_url).length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No media yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="likes" className="space-y-4 mt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Liked posts will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
