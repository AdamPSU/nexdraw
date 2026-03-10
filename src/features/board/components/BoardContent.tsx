"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TLShapeId, useEditor } from "tldraw";
import { Button } from "@/components/ui/button";
import {
  Tick01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  SparklesIcon,
  Mic02Icon,
  MicOff02Icon,
  AiChat02Icon
} from "hugeicons-react";
import { useVoiceAgent } from "@/features/voice/hooks/useVoiceAgent";
import { useCanvasSolver } from "@/features/ai/hooks/useCanvasSolver";
import { useBoardSync } from "@/features/board/hooks/useBoardSync";
import { StatusIndicator } from "@/features/ai/components/StatusIndicator";
import { AIChatSidebar } from "@/features/ai/components/AIChatSidebar";
import { cn } from "@/lib/utils";

function ImageActionButtons({
  pendingImageIds,
  onAccept,
  onReject,
  isVoiceSessionActive,
}: {
  pendingImageIds: TLShapeId[];
  onAccept: (shapeId: TLShapeId) => void;
  onReject: (shapeId: TLShapeId) => void;
  isVoiceSessionActive: boolean;
}) {
  if (pendingImageIds.length === 0) return null;
  const currentImageId = pendingImageIds[pendingImageIds.length - 1];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
      }}
    >
      <Button
        variant="outline"
        onClick={() => onReject(currentImageId)}
        className="rounded-xl shadow-md h-9 bg-white dark:bg-neutral-900 border-neutral-200"
      >
        <Cancel01Icon size={18} strokeWidth={2.5} />
        <span className="ml-2 font-medium">Reject</span>
      </Button>
      <Button
        variant="default"
        onClick={() => onAccept(currentImageId)}
        className="rounded-xl shadow-md h-9"
      >
        <Tick01Icon size={18} strokeWidth={2.5} />
        <span className="ml-2 font-medium">Accept</span>
      </Button>
    </div>
  );
}

export function BoardContent({
  id,
  isChatOpen,
  setIsChatOpen
}: {
  id: string;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);

  const editor = useEditor();

  const {
    pendingImageIds,
    status,
    errorMessage,
    statusMessage,
    isAIEnabled,
    setIsAIEnabled,
    generateSolution,
    handleAccept,
    handleReject,
    cancelGeneration,
    isUpdatingImageRef,
  } = useCanvasSolver(isVoiceSessionActive);

  const voiceAgent = useVoiceAgent({
    onSessionChange: setIsVoiceSessionActive,
    onSolveWithPrompt: async (instructions) => {
      return await generateSolution({
        promptOverride: instructions,
        force: true,
        source: "voice",
      });
    },
  });

  useBoardSync(id, isUpdatingImageRef);

  // Cancel any ongoing AI generation when the chat sidebar is opened
  useEffect(() => {
    if (isChatOpen) {
      cancelGeneration();
    }
  }, [isChatOpen, cancelGeneration]);

  return (
    <>
      {!isVoiceSessionActive && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft01Icon size={20} strokeWidth={2} />
          </Button>

          <Button
            variant={isAIEnabled ? "default" : "outline"}
            onClick={() => setIsAIEnabled(!isAIEnabled)}
            className={cn(
              "h-10 px-4 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 transition-all gap-2",
              isAIEnabled ? "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200" : "bg-white dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-50"
            )}
          >
            <SparklesIcon size={18} fill={isAIEnabled ? "currentColor" : "none"} />
            <span className="text-sm font-medium">
              {isAIEnabled ? "AI Enabled" : "Enable AI"}
            </span>
          </Button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <StatusIndicator
          status={status}
          errorMessage={errorMessage}
          customMessage={statusMessage}
        />
        {voiceAgent.status !== "idle" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-4 py-2 rounded-xl shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              voiceAgent.status === "recording" ? "bg-blue-500 animate-pulse" : "bg-blue-500 animate-pulse"
            )} />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {voiceAgent.statusDetail || voiceAgent.status}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-280px) translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
        }}
      >
        <Button
          variant={isChatOpen ? "default" : "outline"}
          size="icon"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "h-10 w-10 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 transition-all flex items-center justify-center",
            isChatOpen ? "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200" : "bg-white dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-50"
          )}
          title="Toggle AI Chat"
        >
          <AiChat02Icon size={18} />
        </Button>

        <Button
          variant={voiceAgent.status === "recording" ? "default" : "outline"}
          onClick={voiceAgent.toggleSession}
          disabled={voiceAgent.status !== "idle" && voiceAgent.status !== "recording" && voiceAgent.status !== "error"}
          className={cn(
            "h-10 w-10 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 transition-all flex items-center justify-center",
            voiceAgent.status === "recording" ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" : "bg-white dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-50"
          )}
          title={voiceAgent.status === "recording" ? "Stop Recording" : "Voice Command"}
        >
          {voiceAgent.status === "recording" ? (
            <div className="relative flex items-center justify-center">
              <MicOff02Icon size={18} />
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            </div>
          ) : (
            <Mic02Icon size={18} />
          )}
        </Button>
      </div>

      <AIChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        status={status}
        onSubmit={async (prompt, images) => {
          return await generateSolution({
            promptOverride: prompt,
            images,
            source: "chat",
            force: true,
          });
        }}
      />

      <ImageActionButtons
        pendingImageIds={pendingImageIds}
        isVoiceSessionActive={isVoiceSessionActive}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </>
  );
}
