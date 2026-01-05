import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export type BucketName = "avatars" | "media" | "stories" | "messages" | "audio";

interface UploadResult {
  url: string;
  path: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (
    file: File,
    bucket: BucketName,
    userId: string,
    folder?: string
  ): Promise<UploadResult | null> => {
    if (!file) return null;

    setUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder 
        ? `${userId}/${folder}/${fileName}`
        : `${userId}/${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(progressInterval);
      setProgress(100);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return { url: publicUrl, path: filePath };
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (bucket: BucketName, path: string) => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getMediaType = (file: File): "image" | "short_video" | "long_video" | "music" | null => {
    const type = file.type;
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) {
      // Consider videos under 60s as short, otherwise long
      // For now we'll default to short_video
      return "short_video";
    }
    if (type.startsWith("audio/")) return "music";
    return null;
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress,
    getMediaType,
  };
};
