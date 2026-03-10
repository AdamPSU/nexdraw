import { useEffect, RefObject } from "react";
import { useEditor, getSnapshot } from "tldraw";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export function useBoardSync(id: string, isUpdatingImageRef: RefObject<boolean>) {
  const editor = useEditor();

  useEffect(() => {
    if (!editor) return;

    let saveTimeout: NodeJS.Timeout;

    const handleChange = () => {
      if (isUpdatingImageRef.current) return;

      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (typeof window !== "undefined" && window.navigator && !window.navigator.onLine) {
          logger.warn({ id }, "Skipping auto-save while offline");
          return;
        }

        try {
          if (!editor || !editor.store) return;

          const snapshot = getSnapshot(editor.store);
          if (!snapshot) return;

          let safeSnapshot: unknown = snapshot;
          try {
            safeSnapshot = JSON.parse(JSON.stringify(snapshot));
          } catch (e) {
            logger.error({ error: String(e), id }, "Failed to serialize board snapshot for auto-save");
            return;
          }

          let previewUrl = null;
          try {
            const shapeIds = editor.getCurrentPageShapeIds();
            if (shapeIds.size > 0) {
              const viewportBounds = editor.getViewportPageBounds();
              const { blob } = await editor.toImage([...shapeIds], {
                format: "png",
                bounds: viewportBounds,
                background: false,
                scale: 0.5,
              });

              if (blob) {
                previewUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
              }
            }
          } catch (e) {
            logger.warn({ error: String(e), id }, "Thumbnail generation failed, continuing without preview");
          }

          const updateData: any = {
            data: safeSnapshot,
            updated_at: new Date().toISOString()
          };

          if (previewUrl) {
            const MAX_PREVIEW_LENGTH = 8000;
            if (previewUrl.length <= MAX_PREVIEW_LENGTH) {
              updateData.preview = previewUrl;
            }
          }

          if (!supabase) throw new Error("Supabase client not initialized");

          const { error } = await supabase
            .from("whiteboards")
            .update(updateData)
            .eq("id", id);

          if (error) {
            const isTimeoutError = (error as any)?.code === "57014" || /statement timeout/i.test(error.message ?? "");
            if (isTimeoutError) {
              logger.warn({ id, code: (error as any)?.code, message: error.message }, "Supabase auto-save timed out; ignoring.");
              return;
            }
            throw error;
          }

          logger.info({ id }, "Board auto-saved successfully");
        } catch (error) {
          logger.error({ error, id }, "Error auto-saving board");
        }
      }, 2000);
    };

    const dispose = editor.store.listen(handleChange, {
      source: 'user',
      scope: 'document'
    });

    return () => {
      clearTimeout(saveTimeout);
      dispose();
    };
  }, [editor, id, isUpdatingImageRef]);
}
