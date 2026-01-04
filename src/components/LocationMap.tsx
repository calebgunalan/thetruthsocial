import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Eye, EyeOff, RefreshCw } from "lucide-react";

interface UserLocation {
  id: string;
  latitude: number;
  longitude: number;
  is_public: boolean;
  updated_at: string;
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface LocationMapProps {
  currentUserId: string;
}

const LocationMap = ({ currentUserId }: LocationMapProps) => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
    checkMyLocationStatus();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("user_locations")
        .select(`
          id,
          latitude,
          longitude,
          is_public,
          updated_at,
          profile:profiles!user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq("is_public", true);

      if (error) throw error;
      setLocations((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching locations:", error);
    }
  };

  const checkMyLocationStatus = async () => {
    const { data } = await supabase
      .from("user_locations")
      .select("is_public, latitude, longitude")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (data) {
      setIsPublic(data.is_public || false);
      setMyLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
    }
  };

  const updateMyLocation = async () => {
    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { error } = await supabase.from("user_locations").upsert({
        user_id: currentUserId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      toast({ title: "Location updated", description: "Your location has been refreshed" });
      fetchLocations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not get your location",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async () => {
    try {
      const newValue = !isPublic;
      await supabase
        .from("user_locations")
        .update({ is_public: newValue })
        .eq("user_id", currentUserId);
      
      setIsPublic(newValue);
      toast({
        title: newValue ? "Location visible" : "Location hidden",
        description: newValue ? "Friends can now see you on the map" : "Your location is now private",
      });
      fetchLocations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-subtle hairline overflow-hidden">
      <div className="p-4 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Snap Map</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVisibility}
            className="text-muted-foreground"
          >
            {isPublic ? (
              <Eye className="w-4 h-4 mr-1" />
            ) : (
              <EyeOff className="w-4 h-4 mr-1" />
            )}
            {isPublic ? "Visible" : "Hidden"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={updateMyLocation}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Update
          </Button>
        </div>
      </div>

      {/* Map placeholder - would integrate with real map API */}
      <div className="relative h-64 bg-muted">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Map View</p>
            <p className="text-xs">{locations.length} friends sharing location</p>
          </div>
        </div>

        {/* Location markers - simplified representation */}
        {locations.map((loc, index) => (
          <div
            key={loc.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${20 + (index * 15) % 60}%`,
              top: `${20 + (index * 20) % 60}%`,
            }}
          >
            <div className="group relative">
              <div className="w-10 h-10 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-smooth">
                {loc.profile?.avatar_url ? (
                  <img
                    src={loc.profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {loc.profile?.display_name?.charAt(0) || "?"}
                  </span>
                )}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card rounded shadow-lg opacity-0 group-hover:opacity-100 transition-smooth whitespace-nowrap z-10">
                <p className="text-xs font-medium">{loc.profile?.display_name}</p>
              </div>
            </div>
          </div>
        ))}

        {/* My location */}
        {myLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
          >
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
          </div>
        )}
      </div>

      {/* Friends list */}
      <div className="p-4">
        <h3 className="text-sm font-medium mb-3">Nearby Friends</h3>
        <div className="space-y-2">
          {locations.slice(0, 5).map((loc) => (
            <div key={loc.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-silver flex items-center justify-center overflow-hidden">
                {loc.profile?.avatar_url ? (
                  <img
                    src={loc.profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold">
                    {loc.profile?.display_name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{loc.profile?.display_name}</p>
                <p className="text-xs text-muted-foreground">@{loc.profile?.username}</p>
              </div>
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends sharing location
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationMap;