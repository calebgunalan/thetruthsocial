import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationSettings from "@/components/NotificationSettings";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Home,
  Search,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Menu,
  X,
  Tv,
  Play,
  Music2,
  Bookmark,
  Building2,
  Shield,
} from "lucide-react";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { isAdminOrModerator } = useUserRole(userId);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const baseNavLinks = [
    { to: "/feed", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/explore", icon: Search, label: "Explore" },
    { to: "/shorts", icon: Play, label: "Shorts" },
    { to: "/channels", icon: Tv, label: "Channels" },
    { to: "/music", icon: Music2, label: "Music" },
    { to: "/business", icon: Building2, label: "Business" },
    { to: "/collections", icon: Bookmark, label: "Saved" },
    { to: "/notifications", icon: Bell, label: "Alerts" },
    { to: "/messages", icon: MessageCircle, label: "Messages" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const navLinks = isAdminOrModerator
    ? [...baseNavLinks, { to: "/admin", icon: Shield, label: "Admin" }]
    : baseNavLinks;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card hairline-b shadow-subtle backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/feed" className="flex items-center gap-2 transition-smooth hover:opacity-80">
            <img src="/logo.png" alt="The Truth" className="w-8 h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 dark:from-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
              The Truth
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-smooth ${
                  isActive(to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
            <NotificationSettings userId={userId} />
            <ThemeToggle />
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <NotificationSettings userId={userId} />
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 hairline-t space-y-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth ${
                  isActive(to)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            ))}
            <button
              onClick={() => {
                handleSignOut();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-destructive hover:bg-secondary rounded-lg transition-smooth"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
