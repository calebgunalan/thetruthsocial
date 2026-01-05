import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, Video, Music, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
  uploading: boolean;
  progress: number;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

const FileUploader = ({
  onFileSelect,
  onRemove,
  selectedFile,
  previewUrl,
  uploading,
  progress,
  accept = "image/*,video/*,audio/*",
  maxSize = 50,
  className,
}: FileUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }
    onFileSelect(file);
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-8 h-8" />;
    
    const type = selectedFile.type;
    if (type.startsWith("image/")) return <Image className="w-8 h-8" />;
    if (type.startsWith("video/")) return <Video className="w-8 h-8" />;
    if (type.startsWith("audio/")) return <Music className="w-8 h-8" />;
    return <Upload className="w-8 h-8" />;
  };

  const renderPreview = () => {
    if (!selectedFile || !previewUrl) return null;

    const type = selectedFile.type;

    if (type.startsWith("image/")) {
      return (
        <img
          src={previewUrl}
          alt="Preview"
          className="max-h-48 rounded-lg object-cover"
        />
      );
    }

    if (type.startsWith("video/")) {
      return (
        <video
          src={previewUrl}
          className="max-h-48 rounded-lg"
          controls
          muted
        />
      );
    }

    if (type.startsWith("audio/")) {
      return (
        <audio src={previewUrl} controls className="w-full" />
      );
    }

    return null;
  };

  if (selectedFile && previewUrl) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative rounded-lg border hairline bg-muted/30 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 z-10"
            onClick={onRemove}
            disabled={uploading}
          >
            <X className="h-3 w-3" />
          </Button>
          
          <div className="flex flex-col items-center gap-3">
            {renderPreview()}
            <p className="text-sm text-muted-foreground truncate max-w-full">
              {selectedFile.name}
            </p>
          </div>

          {uploading && (
            <div className="mt-3 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading... {progress}%
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors",
        dragActive 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <div
        className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          {getFileIcon()}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {dragActive ? "Drop file here" : "Click or drag to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Images, videos, or audio (max {maxSize}MB)
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
