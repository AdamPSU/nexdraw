"use client";

import {
  Tldraw,
  type TLUiOverrides,
  loadSnapshot,
} from "tldraw";
import React, { useState, type ReactElement } from "react";
import {
  Cursor02Icon,
  ThreeFinger05Icon,
  PencilIcon,
  EraserIcon,
  ArrowUpRight01Icon,
  TextIcon,
  StickyNote01Icon,
  Image01Icon,
  AddSquareIcon,
} from "hugeicons-react";
import { BoardContent } from "./BoardContent";

const hugeIconsOverrides: TLUiOverrides = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools(_editor: unknown, tools: Record<string, any>) {
    const toolIconMap: Record<string, ReactElement> = {
      select: <Cursor02Icon size={22} strokeWidth={1.5} />,
      hand: <ThreeFinger05Icon size={22} strokeWidth={1.5} />,
      draw: <PencilIcon size={22} strokeWidth={1.5} />,
      eraser: <EraserIcon size={22} strokeWidth={1.5} />,
      arrow: <ArrowUpRight01Icon size={22} strokeWidth={1.5} />,
      text: <TextIcon size={22} strokeWidth={1.5} />,
      note: <StickyNote01Icon size={22} strokeWidth={1.5} />,
      asset: <Image01Icon size={22} strokeWidth={1.5} />,
      rectangle: <AddSquareIcon size={22} strokeWidth={1.5} />,
    };

    Object.keys(toolIconMap).forEach((id) => {
      if (tools[id]) tools[id].icon = toolIconMap[id];
    });

    return tools;
  },
};

interface BoardClientProps {
  id: string;
  initialData: any;
}

export function BoardClient({ id, initialData }: BoardClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
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
            console.error("Failed to load snapshot:", e);
          }
        }
      }}
    >
      <BoardContent
        id={id}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
      />
    </Tldraw>
    </div>
  );
}
