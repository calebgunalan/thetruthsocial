import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    ends_at: string;
    created_at: string;
    post_id: string;
  };
  options: PollOption[];
  currentUserId: string;
}

const PollCard = ({ poll, options: initialOptions, currentUserId }: PollCardProps) => {
  const [options, setOptions] = useState(initialOptions);
  const [voted, setVoted] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const { toast } = useToast();

  const isEnded = new Date(poll.ends_at) < new Date();

  useEffect(() => {
    const total = options.reduce((sum, opt) => sum + opt.vote_count, 0);
    setTotalVotes(total);
    checkIfVoted();
  }, [options]);

  const checkIfVoted = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", poll.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    
    if (data) {
      setVoted(data.option_id);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!currentUserId || voted || isEnded) return;

    try {
      await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        option_id: optionId,
        user_id: currentUserId,
      });

      setVoted(optionId);
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === optionId ? { ...opt, vote_count: opt.vote_count + 1 } : opt
        )
      );
      setTotalVotes((t) => t + 1);

      toast({ title: "Vote recorded!", description: "Thanks for participating" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getPercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  return (
    <div className="bg-card rounded-lg shadow-subtle hairline p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="font-semibold">Poll</span>
      </div>

      <p className="text-lg font-medium mb-4">{poll.question}</p>

      <div className="space-y-3">
        {options.map((option) => {
          const percentage = getPercentage(option.vote_count);
          const isSelected = voted === option.id;

          return (
            <Button
              key={option.id}
              variant="outline"
              className={`w-full justify-start relative overflow-hidden h-auto py-3 ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${voted || isEnded ? "pointer-events-none" : ""}`}
              onClick={() => handleVote(option.id)}
            >
              {(voted || isEnded) && (
                <div
                  className="absolute inset-0 bg-primary/10 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative z-10 flex items-center justify-between w-full">
                <span>{option.option_text}</span>
                {(voted || isEnded) && (
                  <span className="font-semibold">{percentage}%</span>
                )}
              </div>
            </Button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span>{totalVotes.toLocaleString()} votes</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {isEnded ? (
            <span>Poll ended</span>
          ) : (
            <span>Ends {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollCard;