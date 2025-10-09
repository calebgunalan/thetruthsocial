import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Image,
  Video,
  Music,
  MessageCircle,
  Users,
  Zap,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      navigate("/feed");
    }
  };

  const features = [
    {
      icon: Zap,
      title: "Share Your Truth",
      description: "Express yourself with text, images, videos, and music",
    },
    {
      icon: Image,
      title: "Visual Stories",
      description: "Share moments with stunning images and shorts",
    },
    {
      icon: Video,
      title: "Video Content",
      description: "Create and share short videos and long-form content",
    },
    {
      icon: Music,
      title: "Music Sharing",
      description: "Discover and share your favorite tracks",
    },
    {
      icon: MessageCircle,
      title: "Real Conversations",
      description: "Connect through messages and voice notes",
    },
    {
      icon: Users,
      title: "Build Your Network",
      description: "Follow, engage, and grow your community",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-shine">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card hairline-b shadow-subtle backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-silver bg-clip-text text-transparent">
              The Truth
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/auth")}
              variant="ghost"
              className="transition-smooth"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="gradient-silver hover:opacity-90 transition-smooth"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
              <Sparkles className="w-12 h-12 text-primary" />
              <h1 className="text-6xl font-bold gradient-silver bg-clip-text text-transparent">
                The Truth
              </h1>
            </div>
            <p className="text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your all-in-one social platform. Share, connect, and express yourself
              without limits.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="gradient-silver hover:opacity-90 transition-smooth text-lg px-8 py-6"
            >
              Join The Truth
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-lg shadow-subtle hairline p-6 transition-smooth hover:shadow-medium"
              >
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg shadow-medium hairline p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need in One Place
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              From tweets to videos, music to messages - The Truth brings together
              the best features of every platform you love.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="gradient-silver hover:opacity-90 transition-smooth"
              >
                Create Account
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="hairline transition-smooth hover:bg-secondary"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="hairline-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 The Truth. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
