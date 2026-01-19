import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Hash, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendingHashtag {
  id: string;
  tag: string;
  use_count: number;
  trending_score: number;
  trend_direction: "up" | "down" | "stable";
}

interface TrendingHashtagsProps {
  limit?: number;
  showCard?: boolean;
  className?: string;
}

const TrendingHashtags = ({ 
  limit = 10, 
  showCard = true,
  className 
}: TrendingHashtagsProps) => {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrendingHashtags();
  }, [limit]);

  const fetchTrendingHashtags = async () => {
    try {
      const { data, error } = await supabase
        .from("hashtags")
        .select("*")
        .order("trending_score", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Add trend direction based on score
      const withTrends = (data || []).map((tag) => ({
        ...tag,
        trend_direction: 
          tag.trending_score > 50 ? "up" as const : 
          tag.trending_score < 20 ? "down" as const : 
          "stable" as const,
      }));

      setHashtags(withTrends);
    } catch (error) {
      console.error("Error fetching hashtags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    navigate(`/search?q=%23${tag}`);
  };

  const getTrendIcon = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up":
        return <ArrowUp className="w-3 h-3 text-green-500" />;
      case "down":
        return <ArrowDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const content = (
    <>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : hashtags.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No trending topics yet
        </p>
      ) : (
        <div className="space-y-2">
          {hashtags.map((hashtag, index) => (
            <button
              key={hashtag.id}
              onClick={() => handleTagClick(hashtag.tag)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <span className="text-sm font-medium text-muted-foreground w-5">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="font-medium truncate">{hashtag.tag}</span>
                  {getTrendIcon(hashtag.trend_direction)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCount(hashtag.use_count || 0)} posts
                </p>
              </div>
              {hashtag.trend_direction === "up" && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                  Trending
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default TrendingHashtags;
