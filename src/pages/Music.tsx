import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import MusicPlayer from "@/components/MusicPlayer";
import FileUploader from "@/components/media/FileUploader";
import { useFileUpload } from "@/hooks/useFileUpload";
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
import { Music2, Plus, Play, Loader2, Disc3 } from "lucide-react";

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  coverUrl?: string;
  userId?: string;
  createdAt?: string;
}

const Music = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadFile, uploading: fileUploading, progress } = useFileUpload();

  useEffect(() => {
    checkUser();
    fetchTracks();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          media_url,
          created_at,
          profiles (username, display_name)
        `)
        .eq("media_type", "audio")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedTracks: Track[] = (data || []).map((post: any) => ({
        id: post.id,
        title: post.content || "Untitled Track",
        artist: post.profiles?.display_name || "Unknown Artist",
        url: post.media_url,
        userId: post.user_id,
        createdAt: post.created_at,
      }));

      setTracks(formattedTracks);
    } catch (error: any) {
      console.error("Error fetching tracks:", error);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast({ title: "Error", description: "Please add a title and select a file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(selectedFile, "audio", user.id);
      if (!result) {
        setUploading(false);
        return;
      }

      // Create post with the music
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: `${title.trim()}${artist.trim() ? ` - ${artist.trim()}` : ""}`,
        media_url: result.url,
        media_type: "audio",
        post_type: "music",
      });

      if (error) throw error;

      toast({ title: "Track uploaded!" });
      handleRemoveFile();
      setTitle("");
      setArtist("");
      setShowUpload(false);
      fetchTracks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      
      <main className="max-w-4xl mx-auto pt-20 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music2 className="w-6 h-6" />
            Music
          </h1>
          
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Upload Track
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Music</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Track Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  placeholder="Artist Name (optional)"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                />
                <FileUploader
                  onFileSelect={handleFileSelect}
                  onRemove={handleRemoveFile}
                  selectedFile={selectedFile}
                  previewUrl={previewUrl}
                  uploading={fileUploading}
                  progress={progress}
                  accept="audio/*"
                  maxSize={50}
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !title.trim() || uploading || fileUploading}
                  className="w-full"
                >
                  {uploading || fileUploading ? "Uploading..." : "Upload Track"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-12 hairline rounded-lg">
            <Disc3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No music yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to share a track!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`flex items-center gap-4 p-4 rounded-lg hairline cursor-pointer transition-smooth hover:bg-accent ${
                    currentTrack?.id === track.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-silver flex items-center justify-center flex-shrink-0">
                    {currentTrack?.id === track.id ? (
                      <div className="flex gap-0.5">
                        <div className="w-1 h-4 bg-primary animate-pulse" />
                        <div className="w-1 h-6 bg-primary animate-pulse delay-75" />
                        <div className="w-1 h-4 bg-primary animate-pulse delay-150" />
                      </div>
                    ) : (
                      <Music2 className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track);
                    }}
                  >
                    <Play className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      {currentTrack && (
        <MusicPlayer
          track={currentTrack}
          playlist={tracks}
          onTrackChange={setCurrentTrack}
          onClose={() => setCurrentTrack(null)}
        />
      )}
    </div>
  );
};

export default Music;
