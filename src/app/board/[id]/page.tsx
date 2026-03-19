"use client";

import {
  Tldraw,
  DefaultColorThemePalette,
  DefaultToolbar,
  TldrawUiMenuItem,
  useTools,
  type TLUiOverrides,
  loadSnapshot,
} from "tldraw";
import { useState, useEffect } from "react";
import "tldraw/tldraw.css";
import { LassoTool } from "@/features/ai/tools/LassoTool";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BoardContent } from "@/features/board/components/BoardContent";
import { BoardProvider, useBoardContext } from "@/features/board/context/BoardContext";
import { TOOL_ICON_MAP } from "@/lib/constants";
import { logger } from "@/lib/logger";

// Ensure the tldraw canvas background is pure white in both light and dark modes
DefaultColorThemePalette.lightMode.background = "#FFFFFF";
DefaultColorThemePalette.darkMode.background = "#FFFFFF";

const hugeIconsOverrides: TLUiOverrides = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools(editor: any, tools: Record<string, any>) {
    Object.keys(TOOL_ICON_MAP).forEach((id) => {
      if (tools[id]) tools[id].icon = TOOL_ICON_MAP[id];
    });

    tools.lasso = {
      id: 'lasso',
      label: 'Lasso',
      icon: TOOL_ICON_MAP.lasso,
      kbd: 'l',
      readonlyOk: false,
      onSelect() { editor.setCurrentTool('lasso'); },
    };

    return tools;
  },
};

const VISIBLE_TOOLS = ['hand', 'draw', 'eraser', 'text', 'lasso', 'asset'];

function CustomToolbar() {
  const tools = useTools();
  return (
    <DefaultToolbar>
      {VISIBLE_TOOLS.map((id) => tools[id] && <TldrawUiMenuItem key={id} {...tools[id]} />)}
    </DefaultToolbar>
  );
}

export default function BoardPage() {
  return (
    <BoardProvider>
      <BoardPageContent />
    </BoardProvider>
  );
}

function BoardPageContent() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);
  const { isChatOpen, setIsChatOpen } = useBoardContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setIsChatOpen(!isChatOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatOpen, setIsChatOpen]);

  useEffect(() => {
    async function loadBoard() {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('whiteboards')
          .select('data')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data?.data && Object.keys(data.data).length > 0) {
          setInitialData(data.data);
        }
      } catch (e) {
        logger.error(e, "Error loading board");
        toast.error("Failed to load board");
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-white font-display font-bold tracking-tighter text-xl animate-pulse">
              Initializing Workspace
            </p>
            <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em]">
              Fetching remote state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        paddingLeft: isChatOpen ? '350px' : '0px',
        transition: 'padding-left 0.3s ease-in-out'
      }}
    >
      <Tldraw
        tools={[LassoTool]}
        overrides={hugeIconsOverrides}
        components={{
          MenuPanel: null,
          NavigationPanel: null,
          HelperButtons: null,
          Toolbar: CustomToolbar,
        }}
        onMount={(editor) => {
          if (initialData) {
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
  );
}
