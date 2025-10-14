import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Sparkles,
  Home,
  Search,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card hairline-b shadow-subtle backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/feed" className="flex items-center gap-2 transition-smooth hover:opacity-80">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-silver bg-clip-text text-transparent">
              The Truth
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/feed"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link
              to="/explore"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth"
            >
              <Search className="w-5 h-5" />
              <span>Explore</span>
            </Link>
            <Link
              to="/notifications"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth"
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </Link>
            <Link
              to="/messages"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Messages</span>
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-foreground"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 hairline-t space-y-2">
            <Link
              to="/feed"
              className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-smooth"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link
              to="/explore"
              className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-smooth"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Search className="w-5 h-5" />
              <span>Explore</span>
            </Link>
            <Link
              to="/notifications"
              className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-smooth"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </Link>
            <Link
              to="/messages"
              className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-smooth"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <MessageCircle className="w-5 h-5" />
              <span>Messages</span>
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-smooth"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2 w-full text-left text-destructive hover:bg-secondary rounded-lg transition-smooth"
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
