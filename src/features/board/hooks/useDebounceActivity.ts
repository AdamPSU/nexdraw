import React, { useEffect, useRef } from "react";
import { Editor } from "tldraw";

export function useDebounceActivity(
  callback: () => void,
  delay: number = 3000,
  editor?: Editor,
  shouldIgnoreRef?: React.MutableRefObject<boolean>,
  isProcessingRef?: React.MutableRefObject<boolean>
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) return;

    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const resetTimer = () => {
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        callback();
      }, delay);
    };

    const handleHistoryChange = () => {
      if (shouldIgnoreRef?.current) return;
      if (isProcessingRef?.current) return;

      try {
        const currentToolId = editor.getCurrentToolId();
        if (currentToolId === 'eraser') return;
      } catch (e) {
        // Safe fallback
      }

      resetTimer();
    };

    const dispose = editor.store.listen(handleHistoryChange, {
      source: 'user',
      scope: 'document'
    });

    return () => {
      clearTimer();
      dispose();
    };
  }, [callback, delay, editor, shouldIgnoreRef, isProcessingRef]);
}
