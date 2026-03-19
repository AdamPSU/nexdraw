import { useCallback, useState, useRef, useEffect } from "react";
import {
  useEditor,
  TLShapeId,
  createShapeId,
  AssetRecordType,
  Box,
} from "tldraw";
import { logger } from "@/lib/logger";
import { useDebounceActivity } from "@/features/board/hooks/useDebounceActivity";
import { StatusIndicatorState } from "@/features/ai/components/StatusIndicator";
import { registerLassoCallback, unregisterLassoCallback } from "@/features/ai/tools/LassoTool";
import { CANVAS_MARGIN_RATIO } from "@/lib/constants";

export function useCanvasSolver(isVoiceSessionActive: boolean) {
  const editor = useEditor();

  // — State —
  const [pendingImageIds, setPendingImageIds] = useState<TLShapeId[]>([]);
  const [status, setStatus] = useState<StatusIndicatorState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isAIEnabled, setIsAIEnabled] = useState<boolean>(true);

  // — Lasso State —
  const [lassoState, setLassoState] = useState<{
    shapeId: TLShapeId; expandedBounds: Box; image: File
  } | null>(null);
  const lassoStateRef = useRef(lassoState);
  useEffect(() => { lassoStateRef.current = lassoState; }, [lassoState]);

  // — Refs —
  const isLassoPendingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUpdatingImageRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStatusMessage = useCallback((statusType: "generating" | "success") => {
    if (statusType === "generating") return "Thinking...";
    if (statusType === "success") return "Success!";
    return "";
  }, []);

  // — Lasso Registration —
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorId = (editor as any).instanceId as string;
    registerLassoCallback(editorId, async (shapeId) => {
      isLassoPendingRef.current = true;
      const shape = editor.getShape(shapeId);
      if (!shape) { isLassoPendingRef.current = false; return; }
      const bounds = editor.getShapePageBounds(shape)!;
      const dx = bounds.w * CANVAS_MARGIN_RATIO, dy = bounds.h * CANVAS_MARGIN_RATIO;
      const expanded = new Box(bounds.x - dx, bounds.y - dy, bounds.w + dx * 2, bounds.h + dy * 2);
      const allShapeIds = [...editor.getCurrentPageShapeIds()].filter(id => id !== shapeId);
      const result = await editor.toImage(allShapeIds, {
        format: 'png', scale: 1, pixelRatio: 1,
        bounds: expanded, background: true, padding: 0,
      });
      const file = new File([result.blob], 'lasso.png', { type: 'image/png' });
      setLassoState({ shapeId, expandedBounds: expanded, image: file });
      isLassoPendingRef.current = false;
    });
    return () => unregisterLassoCallback(editorId);
  }, [editor]);

  // — Image Generation —
  const generateSolution = useCallback(
    async (options?: {
      promptOverride?: string;
      force?: boolean;
      source?: "auto" | "voice" | "chat";
      images?: File[];
    }): Promise<{ success: boolean; textContent: string }> => {
      if (
        !editor ||
        isProcessingRef.current ||
        (isVoiceSessionActive && options?.source !== "voice")
      ) {
        return { success: false, textContent: "" };
      }

      if (!isAIEnabled && options?.source === "auto") {
        return { success: false, textContent: "" };
      }

      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size === 0 && options?.source !== "chat" && options?.source !== "voice") {
        return { success: false, textContent: "" };
      }

      isProcessingRef.current = true;
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const lasso = lassoStateRef.current;
        const viewportBounds = editor.getViewportPageBounds();
        const placementOrigin = lasso ? { x: lasso.expandedBounds.x, y: lasso.expandedBounds.y } : { x: viewportBounds.x, y: viewportBounds.y };

        let blob: Blob | null = null;
        if (lasso) {
          blob = lasso.image;
        } else {
          const shapesToCapture = [...shapeIds].filter(id => !pendingImageIds.includes(id));
          if (shapesToCapture.length > 0) {
            const result = await editor.toImage(shapesToCapture, {
              format: "png", scale: 1, pixelRatio: 1,
              bounds: viewportBounds, background: true, padding: 0,
            });
            blob = result.blob;
          }
          if (shapesToCapture.length > 0 && !blob) {
            isProcessingRef.current = false;
            return { success: false, textContent: "" };
          }
        }

        if (signal.aborted) return { success: false, textContent: "" };

        const formData = new FormData();
        if (blob) formData.append("image", blob, "canvas.png");
        if (lasso) formData.append("skipCrop", "true");
        if (options?.promptOverride) formData.append("prompt", options.promptOverride);
        if (options?.images && options.images.length > 0) {
          options.images.forEach((file, index) => {
            formData.append(`reference_${index}`, file);
          });
        }
        formData.append("source", options?.source ?? "auto");

        if (options?.source === "auto") {
          statusTimerRef.current = setTimeout(() => {
            setStatus("generating");
            setStatusMessage(getStatusMessage("generating"));
          }, 2000);
        } else {
          setStatus("generating");
          setStatusMessage(getStatusMessage("generating"));
        }

        const solutionResponse = await fetch('/api/generate-solution', {
          method: 'POST',
          body: formData,
          signal,
        });

        if (!solutionResponse.ok || signal.aborted) {
          throw new Error('Solution generation failed');
        }

        const solutionData = await solutionResponse.json();

        const imageUrl = solutionData.imageUrl as string | null | undefined;
        const textContent = solutionData.textContent || '';

        logger.info({
          hasImageUrl: !!imageUrl,
          imageUrlLength: imageUrl?.length,
          textContent,
        }, 'Solution data received');

        if (solutionData.success === false) {
          throw new Error(textContent || 'Generation failed');
        }

        if (!imageUrl || signal.aborted) {
          logger.info({ textContent }, 'Classifier decided not to draw');
          setStatus("idle");
          setStatusMessage("");
          isProcessingRef.current = false;
          return { success: true, textContent };
        }

        if (signal.aborted) return { success: false, textContent: "" };

        const assetId = AssetRecordType.createId();
        const img = new Image();

        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = () => reject(new Error('Failed to load generated image'));
          img.src = imageUrl;
        });

        if (signal.aborted) return { success: false, textContent: "" };

        isUpdatingImageRef.current = true;

        editor.createAssets([
          {
            id: assetId,
            type: 'image',
            typeName: 'asset',
            props: {
              name: 'generated-solution.png',
              src: imageUrl,
              w: img.width,
              h: img.height,
              mimeType: 'image/png',
              isAnimated: false,
            },
            meta: {},
          },
        ]);

        const shapeId = createShapeId();
        const crop = solutionData.crop as [number, number, number, number] | null;
        const x = placementOrigin.x + (crop ? crop[0] : 0);
        const y = placementOrigin.y + (crop ? crop[1] : 0);
        const w = lasso ? lasso.expandedBounds.w : crop ? crop[2] - crop[0] : img.width;
        const h = lasso ? lasso.expandedBounds.h : crop ? crop[3] - crop[1] : img.height;

        editor.createShape({
          id: shapeId,
          type: "image",
          x, y,
          isLocked: true,
          props: { w, h, assetId },
          meta: {},
        });

        setPendingImageIds((prev) => [...prev, shapeId]);
        if (lasso) setLassoState(null);

        setStatus("success");
        setStatusMessage(getStatusMessage("success"));
        setTimeout(() => {
          setStatus("idle");
          setStatusMessage("");
        }, 2000);

        setTimeout(() => {
          isUpdatingImageRef.current = false;
        }, 100);

        return { success: true, textContent };
      } catch (error) {
        if (signal.aborted) {
          setStatus("idle");
          setStatusMessage("");
          return { success: false, textContent: "" };
        }

        logger.error(error, 'Auto-generation error');
        setErrorMessage(error instanceof Error ? error.message : 'Generation failed');
        setStatus("error");
        setStatusMessage("");

        setTimeout(() => {
          setStatus("idle");
          setErrorMessage("");
        }, 3000);

        return { success: false, textContent: "" };
      } finally {
        if (statusTimerRef.current) {
          clearTimeout(statusTimerRef.current);
          statusTimerRef.current = null;
        }
        isProcessingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [editor, pendingImageIds, isVoiceSessionActive, getStatusMessage, isAIEnabled],
  );

  // — Auto Generation —
  const handleAutoGeneration = useCallback(() => {
    if (!isAIEnabled) return;
    if (editor?.getCurrentToolId() === 'lasso') return;
    if (isLassoPendingRef.current) return;
    if (lassoStateRef.current) return;
    void generateSolution({ source: "auto" });
  }, [generateSolution, isAIEnabled, editor]);

  useDebounceActivity(handleAutoGeneration, 100, editor, isUpdatingImageRef, isProcessingRef);

  useEffect(() => {
    if (!editor) return;

    const handleEditorChange = () => {
      if (isUpdatingImageRef.current) return;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setStatus("idle");
        setStatusMessage("");
        isProcessingRef.current = false;
      }
    };

    const dispose = editor.store.listen(handleEditorChange, {
      source: 'user',
      scope: 'document'
    });

    return () => dispose();
  }, [editor]);

  // — Accept / Reject —
  const handleAccept = useCallback(
    (shapeId: TLShapeId) => {
      if (!editor) return;
      isUpdatingImageRef.current = true;
      const lassoShapeId = lassoStateRef.current?.shapeId;
      editor.updateShape({ id: shapeId, type: "image", isLocked: false });
      if (lassoShapeId) editor.deleteShape(lassoShapeId);
      setPendingImageIds((prev) => prev.filter((id) => id !== shapeId));
      setTimeout(() => { isUpdatingImageRef.current = false; }, 100);
    },
    [editor]
  );

  const handleReject = useCallback(
    (shapeId: TLShapeId) => {
      if (!editor) return;
      isUpdatingImageRef.current = true;
      const lassoShapeId = lassoStateRef.current?.shapeId;
      editor.updateShape({ id: shapeId, type: "image", isLocked: false });
      editor.deleteShape(shapeId);
      if (lassoShapeId) editor.deleteShape(lassoShapeId);
      setPendingImageIds((prev) => prev.filter((id) => id !== shapeId));
      setTimeout(() => { isUpdatingImageRef.current = false; }, 100);
    },
    [editor]
  );

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("idle");
      setStatusMessage("");
      isProcessingRef.current = false;
    }
  }, []);

  return {
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
  };
}
