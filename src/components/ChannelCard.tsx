import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, BadgeCheck } from "lucide-react";

interface ChannelCardProps {
  channel: {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    subscriber_count: number;
    owner_id: string;
  };
  currentUserId: string;
  isSubscribed?: boolean;
  onSubscriptionChange?: () => void;
}

const ChannelCard = ({ channel, currentUserId, isSubscribed: initialSubscribed, onSubscriptionChange }: ChannelCardProps) => {
  const [subscribed, setSubscribed] = useState(initialSubscribed || false);
  const [subscriberCount, setSubscriberCount] = useState(channel.subscriber_count);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!currentUserId) return;

    try {
      if (subscribed) {
        await supabase
          .from("channel_subscribers")
          .delete()
          .eq("channel_id", channel.id)
          .eq("user_id", currentUserId);
        setSubscribed(false);
        setSubscriberCount((c) => c - 1);
        toast({ title: "Unsubscribed", description: `Unfollowed ${channel.name}` });
      } else {
        await supabase.from("channel_subscribers").insert({
          channel_id: channel.id,
          user_id: currentUserId,
        });
        setSubscribed(true);
        setSubscriberCount((c) => c + 1);
        toast({ title: "Subscribed!", description: `Now following ${channel.name}` });
      }
      onSubscriptionChange?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-subtle hairline overflow-hidden transition-smooth hover:shadow-medium">
      {/* Banner */}
      <div className="h-24 bg-gradient-silver relative">
        {channel.banner_url && (
          <img
            src={channel.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-0 relative">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-gradient-silver border-4 border-card -mt-8 relative z-10 flex items-center justify-center overflow-hidden">
          {channel.avatar_url ? (
            <img
              src={channel.avatar_url}
              alt={channel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold">{channel.name.charAt(0)}</span>
          )}
        </div>

        <div className="mt-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{channel.name}</h3>
            <BadgeCheck className="w-4 h-4 text-primary" />
          </div>
          
          {channel.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {channel.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{subscriberCount.toLocaleString()} subscribers</span>
            </div>

            {channel.owner_id !== currentUserId && (
              <Button
                variant={subscribed ? "outline" : "default"}
                size="sm"
                onClick={handleSubscribe}
                className="transition-smooth"
              >
                {subscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelCard;