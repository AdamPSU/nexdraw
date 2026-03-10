import { useCallback, useState, useRef, useEffect } from "react";
import { WavRecorder } from 'wavtools';
import { voiceLogger } from "@/lib/logger";

export type VoiceStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "processing"
  | "error";

interface UseVoiceAgentProps {
  onSessionChange: (active: boolean) => void;
  onSolveWithPrompt: (
    instructions?: string
  ) => Promise<{ success: boolean; textContent: string }>;
}

export function useVoiceAgent({
  onSessionChange,
  onSolveWithPrompt,
}: UseVoiceAgentProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 16000 })
  );

  const startRecording = useCallback(async () => {
    try {
      setStatus("recording");
      setStatusDetail("Listening...");
      await wavRecorderRef.current.begin();
      await wavRecorderRef.current.record();
      setIsSessionActive(true);
      onSessionChange(true);
    } catch (error) {
      voiceLogger.error({ error }, "Failed to start recording");
      setStatus("error");
      setStatusDetail("Microphone access failed");
    }
  }, [onSessionChange]);

  const stopRecording = useCallback(async () => {
    try {
      setStatus("transcribing");
      setStatusDetail("Transcribing...");

      await wavRecorderRef.current.pause();
      const audioData = await wavRecorderRef.current.save();
      await wavRecorderRef.current.end();

      const formData = new FormData();
      formData.append('audio', audioData.blob, 'audio.wav');

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');

      const { text } = await response.json();

      if (!text || text.trim().length === 0) {
        setStatus("idle");
        setStatusDetail(null);
        setIsSessionActive(false);
        onSessionChange(false);
        return;
      }

      setStatus("processing");
      setStatusDetail(`Executing: "${text}"`);

      const { success } = await onSolveWithPrompt(text);

      if (success) {
        setStatus("idle");
        setStatusDetail(null);
      } else {
        setStatus("error");
        setStatusDetail("Action failed");
      }
    } catch (error) {
      voiceLogger.error({ error }, "Failed to process voice");
      setStatus("error");
      setStatusDetail("Transcription failed");
    } finally {
      setIsSessionActive(false);
      onSessionChange(false);
    }
  }, [onSolveWithPrompt, onSessionChange]);

  const toggleSession = useCallback(() => {
    if (status === "recording") {
      void stopRecording();
    } else if (status === "idle" || status === "error") {
      void startRecording();
    }
  }, [status, startRecording, stopRecording]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      if (wavRecorderRef.current.getStatus() !== 'ended') {
        void wavRecorderRef.current.end();
      }
    };
  }, []);

  return {
    isSessionActive,
    status,
    statusDetail,
    isMuted,
    toggleSession,
    toggleMute,
  };
}
