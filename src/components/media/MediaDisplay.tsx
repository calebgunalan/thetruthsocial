import { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaDisplayProps {
  url: string;
  type: "image" | "short_video" | "long_video" | "music" | string | null;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  showControls?: boolean;
}

const MediaDisplay = ({
  url,
  type,
  alt = "Media content",
  className,
  aspectRatio = "auto",
  showControls = true,
}: MediaDisplayProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  };

  if (!url) return null;

  if (type === "image") {
    return (
      <div className={cn("relative overflow-hidden rounded-lg", aspectClasses[aspectRatio], className)}>
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (type === "short_video" || type === "long_video") {
    return (
      <div className={cn("relative overflow-hidden rounded-lg bg-black", aspectClasses[aspectRatio], className)}>
        <video
          src={url}
          className="w-full h-full object-contain"
          controls={showControls}
          muted={isMuted}
          loop={type === "short_video"}
          playsInline
          onClick={(e) => {
            const video = e.currentTarget;
            if (video.paused) {
              video.play();
              setIsPlaying(true);
            } else {
              video.pause();
              setIsPlaying(false);
            }
          }}
        />
        
        {!showControls && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (type === "music") {
    return (
      <div className={cn("relative rounded-lg bg-gradient-silver p-4", className)}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-primary" />
          </div>
          <audio src={url} controls className="flex-1 h-10" />
        </div>
      </div>
    );
  }

  // Fallback for unknown media types - try to display as image
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <img
        src={url}
        alt={alt}
        className="w-full h-auto object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default MediaDisplay;
