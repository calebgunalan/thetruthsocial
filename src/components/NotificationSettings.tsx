import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationSettingsProps {
  userId: string | null;
}

const NotificationSettings = ({ userId }: NotificationSettingsProps) => {
  const { permission, enabled, requestPermission, isSupported, sendNotification } =
    useNotifications(userId);

  if (!isSupported) {
    return null;
  }

  const handleTestNotification = () => {
    sendNotification("Test Notification", {
      body: "Push notifications are working! 🎉",
      tag: "test-notification",
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {enabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {enabled && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              Push Notifications
            </h4>
            <p className="text-sm text-muted-foreground">
              Get notified about likes, comments, and new followers.
            </p>
          </div>

          {permission === "default" && (
            <Button onClick={requestPermission} className="w-full">
              Enable Notifications
            </Button>
          )}

          {permission === "denied" && (
            <div className="p-3 rounded-lg bg-destructive/10 text-sm">
              <p className="text-destructive font-medium">Notifications blocked</p>
              <p className="text-muted-foreground mt-1">
                Please enable notifications in your browser settings to receive alerts.
              </p>
            </div>
          )}

          {permission === "granted" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications-enabled" className="text-sm">
                  Enabled
                </Label>
                <Switch id="notifications-enabled" checked={enabled} disabled />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="w-full"
              >
                Send Test Notification
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSettings;
