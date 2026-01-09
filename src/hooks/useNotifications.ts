import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const useNotifications = (userId: string | null) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      setEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Not supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setEnabled(result === "granted");

      if (result === "granted") {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive push notifications.",
        });
        return true;
      } else if (result === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [toast]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted" || !("Notification" in window)) {
        return;
      }

      try {
        const notification = new Notification(title, {
          icon: "/logo.png",
          badge: "/logo.png",
          tag: options?.tag || "the-truth-notification",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    },
    [permission]
  );

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as {
            title: string;
            message: string | null;
            type: string;
          };

          sendNotification(notification.title, {
            body: notification.message || undefined,
            tag: `notification-${Date.now()}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, permission, sendNotification]);

  return {
    permission,
    enabled,
    requestPermission,
    sendNotification,
    isSupported: "Notification" in window,
  };
};
