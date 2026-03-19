"use client";

import React, { useState, useEffect } from "react";
import { TLShapeId, useEditor } from "tldraw";
import { Button } from "@/components/ui/button";
import {
  Tick01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SparklesIcon,
  Mic02Icon,
  MicOff02Icon,
  AiChat02Icon
} from "hugeicons-react";
import { useVoiceAgent } from "@/features/voice/hooks/useVoiceAgent";
import { useCanvasSolver } from "@/features/ai/hooks/useCanvasSolver";
import { useBoardSync } from "@/features/board/hooks/useBoardSync";
import { useLayers } from "@/features/board/hooks/useLayers";
import { LayersPanel } from "@/features/board/components/LayersPanel";
import { StatusIndicator } from "@/features/ai/components/StatusIndicator";
import { AIChatSidebar } from "@/features/ai/components/AIChatSidebar";
import { useBoardContext } from "@/features/board/context/BoardContext";
import { cn } from "@/lib/utils";
import { BOARD_Z_INDEX } from "@/lib/constants";

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
        zIndex: BOARD_Z_INDEX.overlay,
        display: 'flex',
        gap: '8px',
      }}
    >
      <Button
        variant="outline"
        onClick={() => onReject(currentImageId)}
        className="rounded-none shadow-sm h-10 bg-white dark:bg-neutral-900 border-neutral-200 px-6 font-mono text-[11px] uppercase tracking-widest"
      >
        <Cancel01Icon size={16} strokeWidth={2.5} />
        <span className="ml-2">Reject</span>
      </Button>
      <Button
        variant="default"
        onClick={() => onAccept(currentImageId)}
        className="rounded-none shadow-sm h-10 px-6 font-mono text-[11px] uppercase tracking-widest bg-black text-white hover:bg-neutral-800"
      >
        <Tick01Icon size={16} strokeWidth={2.5} />
        <span className="ml-2">Accept</span>
      </Button>
    </div>
  );
}

export function BoardContent({ id }: { id: string }) {
  const { isChatOpen, setIsChatOpen } = useBoardContext();
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
    lassoState,
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
  const { layers, activeLayerId, setActiveLayerId, addLayer, deleteLayer, renameLayer, toggleVisibility, toggleLock, reorderLayers } = useLayers(editor);

  // Cancel any ongoing AI generation when the chat sidebar is opened
  useEffect(() => {
    if (isChatOpen) {
      cancelGeneration();
    }
  }, [isChatOpen, cancelGeneration]);

  // Open sidebar automatically when a lasso region is captured
  useEffect(() => {
    if (lassoState) setIsChatOpen(true);
  }, [lassoState, setIsChatOpen]);

  return (
    <>
      {!isVoiceSessionActive && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: BOARD_Z_INDEX.overlay,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(!isChatOpen)}>
            {isChatOpen ? <ArrowLeft01Icon size={20} strokeWidth={2} /> : <ArrowRight01Icon size={20} strokeWidth={2} />}
          </Button>

          <Button
            variant={isAIEnabled ? "default" : "outline"}
            onClick={() => setIsAIEnabled(!isAIEnabled)}
            className={cn(
              "h-10 px-6 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 transition-all gap-3 font-mono text-[11px] uppercase tracking-widest",
              isAIEnabled ? "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200" : "bg-white dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-50"
            )}
          >
            <SparklesIcon size={16} fill={isAIEnabled ? "currentColor" : "none"} />
            <span>
              {isAIEnabled ? "AI Enabled" : "AI Disabled"}
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
          zIndex: BOARD_Z_INDEX.overlay,
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
          <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 px-4 py-2 rounded-none shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md font-mono text-[10px] uppercase tracking-widest">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              voiceAgent.status === "recording" ? "bg-red-500 animate-pulse" : "bg-blue-500 animate-pulse"
            )} />
            <span className="text-neutral-700 dark:text-neutral-300">
              {voiceAgent.statusDetail || voiceAgent.status}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: 'calc(50% - 236px)',
          zIndex: BOARD_Z_INDEX.overlay,
          display: 'flex',
          gap: '8px',
        }}
      >
        <Button
          variant={isChatOpen ? "default" : "outline"}
          size="icon"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "h-10 w-10 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 transition-all flex items-center justify-center",
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
            "h-10 w-10 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 transition-all flex items-center justify-center",
            voiceAgent.status === "recording" ? "bg-red-600 text-white hover:bg-red-700" : "bg-white dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-50"
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
        status={status}
        lassoImage={lassoState?.image ?? null}
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

      <LayersPanel
        layers={layers}
        activeLayerId={activeLayerId}
        onSetActive={setActiveLayerId}
        onAdd={addLayer}
        onDelete={deleteLayer}
        onRename={renameLayer}
        onToggleVisibility={toggleVisibility}
        onToggleLock={toggleLock}
        onReorder={reorderLayers}
      />
    </>
  );
}
