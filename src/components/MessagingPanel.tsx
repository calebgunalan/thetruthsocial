import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { MessageCircle, Send, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

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
}

const MessagingPanel = ({ currentUserId }: { currentUserId: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations (id, name, chat_type)
        `)
        .eq("user_id", currentUserId);

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
        sender_id: currentUserId,
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
            sender_id: currentUserId,
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
      (error) => {
        toast({
          title: "Error",
          description: "Could not get your location",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elegant bg-primary">
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Messages</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full mt-4">
          {!selectedConversation ? (
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className="w-full p-4 rounded-lg border hairline hover:bg-accent transition-smooth text-left"
                  >
                    <div className="font-medium">
                      {conv.name || `${conv.chat_type} Chat`}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setSelectedConversation(null)}
                className="mb-4"
              >
                ← Back
              </Button>
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === currentUserId
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
              <div className="flex gap-2">
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MessagingPanel;
