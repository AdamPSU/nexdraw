import { useCallback, useState, useRef, useEffect } from "react";
import {
  useEditor,
  TLShapeId,
  createShapeId,
  AssetRecordType
} from "tldraw";
import { logger } from "@/lib/logger";
import { useDebounceActivity } from "@/features/board/hooks/useDebounceActivity";
import { StatusIndicatorState } from "@/features/ai/components/StatusIndicator";
import { removeWhiteBackground } from "@/utils/image-processing";

export function useCanvasSolver(isVoiceSessionActive: boolean) {
  const editor = useEditor();
  const [pendingImageIds, setPendingImageIds] = useState<TLShapeId[]>([]);
  const [status, setStatus] = useState<StatusIndicatorState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isAIEnabled, setIsAIEnabled] = useState<boolean>(true);

  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUpdatingImageRef = useRef(false);

  const getStatusMessage = useCallback((statusType: "generating" | "success") => {
    if (statusType === "generating") return "Thinking...";
    if (statusType === "success") return "Success!";
    return "";
  }, []);

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
        const viewportBounds = editor.getViewportPageBounds();
        const shapesToCapture = [...shapeIds].filter(id => !pendingImageIds.includes(id));

        let blob: Blob | null = null;
        if (shapesToCapture.length > 0) {
          const result = await editor.toImage(shapesToCapture, {
            format: "jpeg",
            quality: 0.7,
            scale: 0.7,
            bounds: viewportBounds,
            background: true,
            padding: 0,
          });
          blob = result.blob;
        }

        if (shapesToCapture.length > 0 && !blob) {
          isProcessingRef.current = false;
          return { success: false, textContent: "" };
        }

        if (signal.aborted) return { success: false, textContent: "" };

        const formData = new FormData();
        if (blob) formData.append("image", blob, "canvas.jpg");
        if (options?.promptOverride) formData.append("prompt", options.promptOverride);
        if (options?.images && options.images.length > 0) {
          options.images.forEach((file, index) => {
            formData.append(`reference_${index}`, file);
          });
        }
        formData.append("source", options?.source ?? "auto");

        setStatus("generating");
        setStatusMessage(getStatusMessage("generating"));

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

        const processedImageUrl = await removeWhiteBackground(imageUrl);

        const assetId = AssetRecordType.createId();
        const img = new Image();

        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = () => reject(new Error('Failed to load generated image'));
          img.src = processedImageUrl;
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
              src: processedImageUrl,
              w: img.width,
              h: img.height,
              mimeType: 'image/png',
              isAnimated: false,
            },
            meta: {},
          },
        ]);

        const shapeId = createShapeId();
        const scale = Math.min(
          viewportBounds.width / img.width,
          viewportBounds.height / img.height
        );
        const shapeWidth = img.width * scale;
        const shapeHeight = img.height * scale;

        editor.createShape({
          id: shapeId,
          type: "image",
          x: viewportBounds.x + (viewportBounds.width - shapeWidth) / 2,
          y: viewportBounds.y + (viewportBounds.height - shapeHeight) / 2,
          isLocked: true,
          props: {
            w: shapeWidth,
            h: shapeHeight,
            assetId: assetId,
          },
          meta: {},
        });

        setPendingImageIds((prev) => [...prev, shapeId]);

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
        isProcessingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [editor, pendingImageIds, isVoiceSessionActive, getStatusMessage, isAIEnabled],
  );

  const handleAutoGeneration = useCallback(() => {
    if (!isAIEnabled) return;
    void generateSolution({ source: "auto" });
  }, [generateSolution, isAIEnabled]);

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

  const handleAccept = useCallback(
    (shapeId: TLShapeId) => {
      if (!editor) return;
      isUpdatingImageRef.current = true;
      editor.updateShape({ id: shapeId, type: "image", isLocked: false });
      setPendingImageIds((prev) => prev.filter((id) => id !== shapeId));
      setTimeout(() => { isUpdatingImageRef.current = false; }, 100);
    },
    [editor]
  );

  const handleReject = useCallback(
    (shapeId: TLShapeId) => {
      if (!editor) return;
      isUpdatingImageRef.current = true;
      editor.updateShape({ id: shapeId, type: "image", isLocked: false });
      editor.deleteShape(shapeId);
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
  };
}
