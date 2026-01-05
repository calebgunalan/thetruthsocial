import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Trash2, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
  uploading?: boolean;
  className?: string;
}

const AudioRecorder = ({
  onRecordingComplete,
  onCancel,
  uploading = false,
  className,
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onCancel();
  };

  const sendRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50", className)}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {!audioBlob ? (
        // Recording mode
        <>
          <div className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                isRecording ? "bg-destructive animate-pulse" : "bg-muted-foreground"
              )}
            />
            <span className="text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
            {isRecording && (
              <span className="text-xs text-muted-foreground">Recording...</span>
            )}
          </div>

          {isRecording ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={startRecording}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </>
          )}
        </>
      ) : (
        // Preview mode
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={playRecording}
          >
            <Play className={cn("h-4 w-4", isPlaying && "text-primary")} />
          </Button>

          <div className="flex-1">
            <div className="h-8 bg-muted rounded flex items-center px-3">
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
              <div className="flex-1 mx-3 h-1 bg-muted-foreground/30 rounded">
                <div
                  className="h-full bg-primary rounded transition-all"
                  style={{ width: isPlaying ? "50%" : "0%" }}
                />
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={discardRecording}
            disabled={uploading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={sendRecording}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default AudioRecorder;
