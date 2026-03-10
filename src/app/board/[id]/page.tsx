"use client";

import {
  Tldraw,
  DefaultColorThemePalette,
  type TLUiOverrides,
  loadSnapshot,
} from "tldraw";
import React, { useState, useEffect, type ReactElement } from "react";
import "tldraw/tldraw.css";
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
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BoardContent } from "@/features/board/components/BoardContent";

// Ensure the tldraw canvas background is pure white in both light and dark modes
DefaultColorThemePalette.lightMode.background = "#FFFFFF";
DefaultColorThemePalette.darkMode.background = "#FFFFFF";

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

export default function BoardPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        console.error("Error loading board:", e);
        toast.error("Failed to load board");
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your canvas...</p>
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
        overrides={hugeIconsOverrides}
        components={{
          MenuPanel: null,
          NavigationPanel: null,
          HelperButtons: null,
        }}
        onMount={(editor) => {
          if (initialData) {
            try {
              loadSnapshot(editor.store, initialData);
            } catch (e) {
              console.error("Failed to load snapshot:", e);
            }
          }
        }}
      >
        <BoardContent id={id} isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />
      </Tldraw>
    </div>
  );
}
