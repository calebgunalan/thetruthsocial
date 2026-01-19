import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Share2,
  Calendar,
  Loader2,
  BarChart3,
  Activity,
} from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfWeek } from "date-fns";

interface AnalyticsData {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
  postsThisWeek: number;
  likesThisWeek: number;
  engagementRate: number;
  postsByDay: { date: string; posts: number; likes: number }[];
  topPosts: {
    id: string;
    content: string;
    likes: number;
    comments: number;
    created_at: string;
  }[];
  mediaTypeDistribution: { name: string; value: number }[];
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const Analytics = () => {
  const [user, setUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate("/auth");
      return;
    }
    setUser(authUser);
  };

  const fetchAnalytics = async () => {
    try {
      const weekAgo = subDays(new Date(), 7).toISOString();
      
      // Fetch all data in parallel
      const [
        postsRes,
        likesRes,
        commentsRes,
        followersRes,
        followingRes,
        recentPostsRes,
        topPostsRes,
      ] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact" }).eq("user_id", user.id),
        supabase.from("likes").select("post_id, posts!inner(user_id)", { count: "exact" }).eq("posts.user_id", user.id),
        supabase.from("comments").select("post_id, posts!inner(user_id)", { count: "exact" }).eq("posts.user_id", user.id),
        supabase.from("follows").select("id", { count: "exact" }).eq("following_id", user.id),
        supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", user.id),
        supabase.from("posts").select("*").eq("user_id", user.id).gte("created_at", weekAgo),
        supabase.from("posts")
          .select("id, content, likes_count, comments_count, created_at, media_type")
          .eq("user_id", user.id)
          .order("likes_count", { ascending: false })
          .limit(5),
      ]);

      const totalPosts = postsRes.count || 0;
      const totalLikes = likesRes.count || 0;
      const totalComments = commentsRes.count || 0;
      const totalFollowers = followersRes.count || 0;
      const totalFollowing = followingRes.count || 0;
      const postsThisWeek = recentPostsRes.data?.length || 0;

      // Calculate engagement rate
      const engagementRate = totalFollowers > 0 
        ? ((totalLikes + totalComments) / (totalPosts * totalFollowers) * 100) || 0
        : 0;

      // Get posts by day for the chart
      const days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const postsByDay = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayPosts = recentPostsRes.data?.filter(
          (p) => format(new Date(p.created_at), "yyyy-MM-dd") === dayStr
        ) || [];
        
        return {
          date: format(day, "EEE"),
          posts: dayPosts.length,
          likes: dayPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0),
        };
      });

      // Calculate likes this week
      const likesThisWeek = postsByDay.reduce((sum, d) => sum + d.likes, 0);

      // Transform top posts to match interface
      const topPosts = (topPostsRes.data || []).map((post) => ({
        id: post.id,
        content: post.content || "",
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        created_at: post.created_at,
      }));

      // Media type distribution
      const mediaTypes = postsRes.data?.reduce((acc: Record<string, number>, post) => {
        const type = post.media_type || "text";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};

      const mediaTypeDistribution = Object.entries(mediaTypes).map(([name, value]) => ({
        name: name === "null" ? "Text Only" : name.replace("_", " "),
        value: value as number,
      }));

      setAnalytics({
        totalPosts,
        totalLikes,
        totalComments,
        totalFollowers,
        totalFollowing,
        postsThisWeek,
        likesThisWeek,
        engagementRate,
        postsByDay,
        topPosts,
        mediaTypeDistribution,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

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
      
      <main className="max-w-7xl mx-auto pt-20 px-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track your engagement and growth</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.totalPosts || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.totalLikes || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.totalFollowers || 0}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.engagementRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{analytics?.postsThisWeek || 0}</p>
                  <p className="text-sm text-muted-foreground">Posts this week</p>
                </div>
                <Calendar className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{analytics?.likesThisWeek || 0}</p>
                  <p className="text-sm text-muted-foreground">Likes this week</p>
                </div>
                <Heart className="w-8 h-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{analytics?.totalComments || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Comments</p>
                </div>
                <MessageCircle className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="posts">Top Posts</TabsTrigger>
            <TabsTrigger value="content">Content Mix</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>Posts and likes over the past 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.postsByDay || []}>
                      <defs>
                        <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                      <Area
                        type="monotone"
                        dataKey="posts"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorPosts)"
                        name="Posts"
                      />
                      <Area
                        type="monotone"
                        dataKey="likes"
                        stroke="hsl(var(--chart-2))"
                        fillOpacity={1}
                        fill="url(#colorLikes)"
                        name="Likes"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>Your most liked content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topPosts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No posts yet. Create your first post!
                    </p>
                  ) : (
                    analytics?.topPosts.map((post, index) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                      >
                        <span className="text-2xl font-bold text-primary/50">
                          #{index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">
                            {post.content || "Media post"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {post.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {post.comments || 0}
                            </span>
                            <span>
                              {format(new Date(post.created_at), "MMM d")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Content Mix</CardTitle>
                <CardDescription>Distribution of your content types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {analytics?.mediaTypeDistribution.length === 0 ? (
                    <p className="text-muted-foreground">No content data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics?.mediaTypeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => 
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {analytics?.mediaTypeDistribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;
