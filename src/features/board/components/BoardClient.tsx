"use client";

import {
  Tldraw,
  type TLUiOverrides,
  loadSnapshot,
} from "tldraw";
import { BoardContent } from "./BoardContent";
import { BoardProvider } from "@/features/board/context/BoardContext";
import { TOOL_ICON_MAP } from "@/lib/constants";
import { logger } from "@/lib/logger";

const hugeIconsOverrides: TLUiOverrides = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools(_editor: unknown, tools: Record<string, any>) {
    Object.keys(TOOL_ICON_MAP).forEach((id) => {
      if (tools[id]) tools[id].icon = TOOL_ICON_MAP[id];
    });
    return tools;
  },
};

interface BoardClientProps {
  id: string;
  initialData: any;
}

export function BoardClient({ id, initialData }: BoardClientProps) {
  return (
    <BoardProvider>
      <div className="tldraw__editor w-full h-full relative group">
        <style>{`
          .tlui-lock-button { display: none !important; }
        `}</style>
        <Tldraw
          overrides={hugeIconsOverrides}
          components={{
            MenuPanel: null,
            NavigationPanel: null,
            HelperButtons: null,
          }}
          onMount={(editor) => {
            if (initialData && Object.keys(initialData).length > 0) {
              try {
                loadSnapshot(editor.store, initialData);
              } catch (e) {
                logger.error(e, "Failed to load snapshot");
              }
            }
          }}
        >
          <BoardContent id={id} />
        </Tldraw>
      </div>
    </BoardProvider>
  );
}
