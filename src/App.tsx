import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Channels from "./pages/Channels";
import Shorts from "./pages/Shorts";
import Collections from "./pages/Collections";
import Music from "./pages/Music";
import Playlists from "./pages/Playlists";
import Business from "./pages/Business";
import Admin from "./pages/Admin";
import Search from "./pages/Search";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/music" element={<Music />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/business" element={<Business />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/search" element={<Search />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
