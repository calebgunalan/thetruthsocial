import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Repeat2 } from "lucide-react";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "repost";
  created_at: string;
  actor: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  content?: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    // For now, we'll show mock notifications since we haven't set up the notifications table
    loadMockNotifications();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const loadMockNotifications = () => {
    // Mock data - in production, this would come from a notifications table
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "like",
        created_at: new Date().toISOString(),
        actor: {
          username: "user1",
          display_name: "User One",
          avatar_url: null,
        },
        content: "liked your post",
      },
    ];
    setNotifications(mockNotifications);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case "repost":
        return <Repeat2 className="w-5 h-5 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-2xl mx-auto pt-20 px-4 pb-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 rounded-lg hairline hover:bg-accent transition-smooth cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={notification.actor.avatar_url || undefined} />
                  <AvatarFallback>{notification.actor.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{notification.actor.display_name}</span>
                    {" "}
                    <span className="text-muted-foreground">{notification.content}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
