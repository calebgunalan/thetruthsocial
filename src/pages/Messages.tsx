import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MapPin, Plus } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
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
  conversations?: any;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    }
  }, [selectedConversation]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations (id, name, chat_type)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setConversations(data?.map((d: any) => d.conversations) || []);
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
          profiles (display_name, avatar_url)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        message_type: "text",
        content: newMessage,
      });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedConversation);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

          fetchMessages(selectedConversation);
          toast({
            title: "Location shared",
            description: "Your location has been sent",
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      },
      () => {
        toast({
          title: "Error",
          description: "Could not get your location",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-6xl mx-auto pt-20 px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
          <div className="md:col-span-1 hairline rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Messages</h2>
              <Button size="icon" variant="ghost">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-3 rounded-lg hairline hover:bg-accent transition-smooth text-left ${
                      selectedConversation === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="font-medium">
                      {conv.name || `${conv.chat_type} Chat`}
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No conversations yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="md:col-span-2 hairline rounded-lg flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 hairline-b">
                  <h3 className="font-semibold">
                    {conversations.find(c => c.id === selectedConversation)?.name || "Conversation"}
                  </h3>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <span className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 hairline-t flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={shareLocation}
                    title="Share location"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
