import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
  priority?: boolean;
  blur?: boolean;
  onLoad?: () => void;
  onClick?: () => void;
}

const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  aspectRatio = "auto",
  priority = false,
  blur = true,
  onLoad,
  onClick,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  };

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  // Generate optimized URL with size parameters for Supabase Storage
  const getOptimizedUrl = (url: string, w?: number, h?: number) => {
    if (!url) return "";
    
    // If it's a Supabase storage URL, we can add transform params
    if (url.includes("supabase") && url.includes("/storage/")) {
      const params = new URLSearchParams();
      if (w) params.append("width", String(w));
      if (h) params.append("height", String(h));
      params.append("quality", "80");
      
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}${params.toString()}`;
    }
    
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src, width, height);

  if (error) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground",
          aspectClasses[aspectRatio],
          className
        )}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden",
        aspectClasses[aspectRatio],
        className
      )}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-all duration-300",
            blur && !isLoaded && "blur-sm scale-105",
            isLoaded && "blur-0 scale-100"
          )}
          style={{
            opacity: isLoaded ? 1 : 0,
          }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
