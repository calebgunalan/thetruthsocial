import { Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StreakCardProps {
  streak: {
    id: string;
    count: number;
    last_interaction_at: string;
    friend: {
      display_name: string;
      username: string;
      avatar_url: string | null;
    };
  };
}

const StreakCard = ({ streak }: StreakCardProps) => {
  const isHot = streak.count >= 7;
  const isFire = streak.count >= 30;
  const isLegendary = streak.count >= 100;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hairline hover:bg-accent transition-smooth">
      <div className="w-12 h-12 rounded-full bg-gradient-silver flex items-center justify-center flex-shrink-0">
        {streak.friend.avatar_url ? (
          <img
            src={streak.friend.avatar_url}
            alt={streak.friend.display_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold">
            {streak.friend.display_name?.charAt(0) || "?"}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{streak.friend.display_name}</p>
        <p className="text-sm text-muted-foreground">@{streak.friend.username}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
          isLegendary 
            ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" 
            : isFire 
            ? "bg-orange-500/10 text-orange-500" 
            : isHot 
            ? "bg-red-500/10 text-red-500" 
            : "bg-muted text-muted-foreground"
        }`}>
          <Flame className={`w-4 h-4 ${isLegendary ? "animate-pulse" : ""}`} />
          <span className="font-bold">{streak.count}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(streak.last_interaction_at), { addSuffix: true })}
      </div>
    </div>
  );
};

export default StreakCard;