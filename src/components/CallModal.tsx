import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  Loader2,
  User
} from "lucide-react";

interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType: "voice" | "video";
  isIncoming?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

const CallModal = ({
  open,
  onOpenChange,
  currentUserId,
  recipientId,
  recipientName,
  recipientAvatar,
  callType,
  isIncoming = false,
  onAccept,
  onReject,
}: CallModalProps) => {
  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice");
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !isIncoming) {
      initializeCall();
    }

    return () => {
      cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current && callType === "video") {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate call connection after 2 seconds (in real app, use WebRTC signaling)
      setTimeout(() => {
        setCallStatus("connected");
        toast({ title: "Connected", description: `Call with ${recipientName} started` });
      }, 2000);
    } catch (error: any) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Error",
        description: "Could not access camera/microphone",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCallDuration(0);
    setCallStatus("ringing");
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    cleanup();
    onOpenChange(false);
  };

  const handleAccept = async () => {
    await initializeCall();
    onAccept?.();
  };

  const handleReject = () => {
    onReject?.();
    onOpenChange(false);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-20 text-white hover:bg-white/20"
          onClick={handleEndCall}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="relative min-h-[500px] flex flex-col">
          {/* Video area */}
          {callType === "video" && callStatus === "connected" && (
            <>
              {/* Remote video (full screen) */}
              <div className="absolute inset-0 bg-gray-800">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar className="w-32 h-32">
                      <AvatarImage src={recipientAvatar} />
                      <AvatarFallback className="text-4xl bg-gray-700">
                        <User className="w-16 h-16" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>

              {/* Local video (picture-in-picture) */}
              <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden bg-gray-700 shadow-lg z-10">
                {!isVideoOff && localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Voice call or ringing state */}
          {(callType === "voice" || callStatus === "ringing") && (
            <div className="flex-1 flex flex-col items-center justify-center text-white p-8">
              <Avatar className="w-28 h-28 mb-6">
                <AvatarImage src={recipientAvatar} />
                <AvatarFallback className="text-3xl bg-gray-700">
                  <User className="w-14 h-14" />
                </AvatarFallback>
              </Avatar>

              <h2 className="text-2xl font-semibold mb-2">{recipientName}</h2>

              {callStatus === "ringing" ? (
                <div className="flex items-center gap-2 text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isIncoming ? "Incoming call..." : "Calling..."}</span>
                </div>
              ) : (
                <span className="text-gray-300">{formatDuration(callDuration)}</span>
              )}
            </div>
          )}

          {/* Call duration for video calls */}
          {callType === "video" && callStatus === "connected" && (
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
              {formatDuration(callDuration)}
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {isIncoming && callStatus === "ringing" ? (
              <div className="flex items-center justify-center gap-8">
                <Button
                  onClick={handleReject}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-7 h-7" />
                </Button>
                <Button
                  onClick={handleAccept}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                >
                  <Phone className="w-7 h-7" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full ${
                    isMuted ? "bg-red-500/20 text-red-400" : "bg-white/20 text-white"
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {callType === "video" && (
                  <Button
                    variant="ghost"
                    onClick={toggleVideo}
                    className={`w-14 h-14 rounded-full ${
                      isVideoOff ? "bg-red-500/20 text-red-400" : "bg-white/20 text-white"
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </Button>
                )}

                <Button
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;
