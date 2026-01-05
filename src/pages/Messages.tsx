import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Send, 
  MapPin, 
  Plus, 
  Mic,
  Lock,
  Timer,
  Loader2,
  Phone,
  Video,
  Image,
  X,
  Play,
  Volume2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AudioRecorder from "@/components/media/AudioRecorder";
import FileUploader from "@/components/media/FileUploader";
import MediaDisplay from "@/components/media/MediaDisplay";
import { useFileUpload } from "@/hooks/useFileUpload";

interface Message {
  id: string;
  content: string | null;
  media_url: string | null;
  sender_id: string;
  message_type: string;
  location_lat: number | null;
  location_lng: number | null;
  self_destruct_at: string | null;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  name: string | null;
  chat_type: string;
  is_secret: boolean;
  avatar_url: string | null;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [foundUsers, setFoundUsers] = useState<Profile[]>([]);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSecret, setIsSecret] = useState(false);
  const [selfDestructMinutes, setSelfDestructMinutes] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadFile, uploading, progress, getMediaType } = useFileUpload();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      const unsubscribe = subscribeToMessages(selectedConversation);
      return unsubscribe;
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations (id, name, chat_type, is_secret, avatar_url)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      const convs = data?.map((d: any) => d.conversations).filter(Boolean) || [];
      setConversations(convs);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles!sender_id (display_name, avatar_url)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select(`*, profiles!sender_id (display_name, avatar_url)`)
            .eq("id", payload.new.id)
            .single();
          
          if (data) {
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${searchUser}%,display_name.ilike.%${searchUser}%`)
      .neq("id", user.id)
      .limit(10);
    
    setFoundUsers(data || []);
  };

  const startConversation = async (otherUserId: string) => {
    try {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({
          chat_type: "direct",
          is_secret: isSecret,
        })
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: otherUserId },
      ]);

      setShowNewChat(false);
      setSearchUser("");
      setFoundUsers([]);
      setIsSecret(false);
      fetchConversations();
      setSelectedConversation(conv.id);
      
      toast({ title: "Chat started!", description: isSecret ? "Secret chat enabled" : "You can now send messages" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const sendMessage = async (type: "text" | "voice" | "media" = "text", mediaUrl?: string) => {
    if ((type === "text" && !newMessage.trim()) || !selectedConversation) return;

    try {
      const messageData: any = {
        conversation_id: selectedConversation,
        sender_id: user.id,
        message_type: type,
        content: type === "text" ? newMessage : (type === "voice" ? "🎤 Voice message" : "📎 Media"),
        media_url: mediaUrl || null,
      };

      if (selfDestructMinutes) {
        const destructAt = new Date();
        destructAt.setMinutes(destructAt.getMinutes() + selfDestructMinutes);
        messageData.self_destruct_at = destructAt.toISOString();
      }

      const { error } = await supabase.from("messages").insert(messageData);

      if (error) throw error;

      setNewMessage("");
      setShowAudioRecorder(false);
      setShowMediaUpload(false);
      handleRemoveFile();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    const result = await uploadFile(file, "audio", user.id);
    if (result) {
      await sendMessage("voice", result.url);
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

  const handleSendMedia = async () => {
    if (!selectedFile) return;
    
    const result = await uploadFile(selectedFile, "messages", user.id);
    if (result) {
      await sendMessage("media", result.url);
    }
  };

  const shareLocation = async () => {
    if (!selectedConversation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await supabase.from("messages").insert({
            conversation_id: selectedConversation,
            sender_id: user.id,
            message_type: "location",
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
            content: "📍 Shared location",
          });

          toast({ title: "Location shared" });
        } catch (error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      },
      () => {
        toast({ title: "Error", description: "Could not get location", variant: "destructive" });
      }
    );
  };

  const currentConv = conversations.find((c) => c.id === selectedConversation);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
          {/* Conversations List */}
          <div className="md:col-span-1 hairline rounded-lg flex flex-col">
            <div className="flex items-center justify-between p-4 hairline-b">
              <h2 className="text-xl font-bold">Messages</h2>
              <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && searchUsers()}
                        placeholder="Search username..."
                        className="flex-1"
                      />
                      <Button onClick={searchUsers}>Search</Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isSecret ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsSecret(!isSecret)}
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        Secret Chat
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {foundUsers.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => startConversation(profile.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hairline hover:bg-accent transition-smooth"
                        >
                          <Avatar>
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback>{profile.display_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium">{profile.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-3 rounded-lg hairline hover:bg-accent transition-smooth text-left flex items-center gap-3 ${
                      selectedConversation === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={conv.avatar_url || undefined} />
                      <AvatarFallback>
                        {conv.name?.charAt(0) || conv.chat_type.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {conv.name || `${conv.chat_type} Chat`}
                        </span>
                        {conv.is_secret && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No conversations yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowNewChat(true)}
                    >
                      Start a chat
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="md:col-span-2 hairline rounded-lg flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 hairline-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={currentConv?.avatar_url || undefined} />
                      <AvatarFallback>
                        {currentConv?.name?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {currentConv?.name || "Conversation"}
                        {currentConv?.is_secret && (
                          <Lock className="w-4 h-4 text-green-500" />
                        )}
                      </h3>
                      {currentConv?.is_secret && (
                        <p className="text-xs text-green-500">End-to-end encrypted</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div className="flex items-end gap-2 max-w-[70%]">
                          {msg.sender_id !== user?.id && (
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {msg.profiles?.display_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`rounded-lg p-3 ${
                              msg.sender_id === user?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary"
                            }`}
                          >
                            {msg.message_type === "location" ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <a 
                                  href={`https://maps.google.com/?q=${msg.location_lat},${msg.location_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm underline"
                                >
                                  View location
                                </a>
                              </div>
                            ) : msg.message_type === "voice" && msg.media_url ? (
                              <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4" />
                                <audio src={msg.media_url} controls className="h-8 max-w-[200px]" />
                              </div>
                            ) : msg.message_type === "media" && msg.media_url ? (
                              <div className="max-w-[250px]">
                                <MediaDisplay
                                  url={msg.media_url}
                                  type="image"
                                  className="rounded"
                                />
                              </div>
                            ) : (
                              <p className="text-sm">{msg.content}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs opacity-70">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </span>
                              {msg.self_destruct_at && (
                                <Timer className="w-3 h-3 opacity-70" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 hairline-t space-y-3">
                  {/* Self-destruct options for secret chats */}
                  {currentConv?.is_secret && (
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <select
                        value={selfDestructMinutes || ""}
                        onChange={(e) => setSelfDestructMinutes(e.target.value ? Number(e.target.value) : null)}
                        className="text-xs bg-transparent border-none text-muted-foreground"
                      >
                        <option value="">No timer</option>
                        <option value="1">1 minute</option>
                        <option value="5">5 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                      </select>
                    </div>
                  )}

                  {/* Audio Recorder */}
                  {showAudioRecorder && (
                    <AudioRecorder
                      onRecordingComplete={handleVoiceRecordingComplete}
                      onCancel={() => setShowAudioRecorder(false)}
                      uploading={uploading}
                    />
                  )}

                  {/* Media Upload Preview */}
                  {showMediaUpload && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground z-10"
                        onClick={() => {
                          setShowMediaUpload(false);
                          handleRemoveFile();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <FileUploader
                        onFileSelect={handleFileSelect}
                        onRemove={handleRemoveFile}
                        selectedFile={selectedFile}
                        previewUrl={previewUrl}
                        uploading={uploading}
                        progress={progress}
                        accept="image/*,video/*"
                        maxSize={50}
                      />
                      {selectedFile && (
                        <Button 
                          onClick={handleSendMedia} 
                          disabled={uploading}
                          className="w-full mt-2"
                        >
                          {uploading ? "Uploading..." : "Send Media"}
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {!showAudioRecorder && !showMediaUpload && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowMediaUpload(true)}
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={shareLocation}
                        title="Share location"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAudioRecorder(true)}
                        title="Voice message"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button onClick={() => sendMessage()} size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Send className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Select a conversation</p>
                  <p className="text-sm text-muted-foreground mt-1">or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
