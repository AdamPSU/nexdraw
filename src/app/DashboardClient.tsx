"use client";

import { useOptimistic, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import ChromaGrid, { ChromaItem } from "@/components/ui/ChromaGrid";
import Dither from "@/components/Dither";
import { createWhiteboard, deleteWhiteboard, renameWhiteboard } from "./actions";
import { cn } from "@/lib/utils";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { LineShadowText } from "@/components/ui/line-shadow-text";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Whiteboard = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview?: string;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function DashboardClient({ initialWhiteboards }: { initialWhiteboards: Whiteboard[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticWhiteboards, setOptimistic] = useOptimistic(initialWhiteboards);
  const [renameTarget, setRenameTarget] = useState<Whiteboard | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreate = () => {
    startTransition(async () => {
      const board = await createWhiteboard();
      router.push(`/board/${board.id}`);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setOptimistic((prev) => prev.filter((w) => w.id !== id));
      await deleteWhiteboard(id);
    });
  };

  const handleRename = (board: Whiteboard) => {
    setRenameTarget(board);
    setRenameValue(board.title);
  };

  const submitRename = () => {
    if (!renameTarget) return;
    startTransition(async () => {
      setOptimistic((prev) =>
        prev.map((w) => (w.id === renameTarget.id ? { ...w, title: renameValue } : w))
      );
      await renameWhiteboard(renameTarget.id, renameValue);
      setRenameTarget(null);
    });
  };

  const PALETTES = [
    { borderColor: 'rgba(139,92,246,0.7)',  gradient: 'linear-gradient(145deg,rgba(109,40,217,0.45),rgba(5,5,15,0.85))' },
    { borderColor: 'rgba(192,38,211,0.7)',  gradient: 'linear-gradient(210deg,rgba(162,28,175,0.45),rgba(5,5,15,0.85))' },
    { borderColor: 'rgba(37,99,235,0.7)',   gradient: 'linear-gradient(165deg,rgba(29,78,216,0.45),rgba(5,5,15,0.85))' },
    { borderColor: 'rgba(79,70,229,0.7)',   gradient: 'linear-gradient(195deg,rgba(67,56,202,0.45),rgba(5,5,15,0.85))' },
    { borderColor: 'rgba(14,165,233,0.7)',  gradient: 'linear-gradient(225deg,rgba(2,132,199,0.45),rgba(5,5,15,0.85))' },
    { borderColor: 'rgba(124,58,237,0.7)',  gradient: 'linear-gradient(180deg,rgba(109,40,217,0.45),rgba(5,5,15,0.85))' },
  ];

  const cards = optimisticWhiteboards.length > 0
    ? optimisticWhiteboards.slice(0, 12)
    : Array.from({ length: 12 }, (_, i) => ({ id: `placeholder-${i}`, title: "Untitled Canvas", created_at: "", updated_at: "", preview: undefined }));

  const chromaItems: ChromaItem[] = cards.map((board, i) => ({
    image: board.preview ?? '',
    title: board.title,
    subtitle: board.updated_at ? formatTime(board.updated_at) : 'New Canvas',
    ...PALETTES[i % PALETTES.length],
  }));

  return (
    <div className="h-screen overflow-hidden flex flex-col relative">
      {/* Dither background */}
      <div className="absolute inset-0 z-0">
        <Dither
          waveColor={[0.19607843137254902, 0.03529411764705882, 0.3058823529411765]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={4}
          pixelSize={2}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)`,
          backgroundSize: '90px 90px',
        }}
      />

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-3 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-5 h-5 bg-white rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
            <div className="flex flex-col">
              <span className="text-sm font-display font-bold tracking-tighter text-white leading-none">NEXHACKS</span>
            </div>
          </div>
          
          <div className="h-4 w-[1px] bg-white/10 mx-2" />

          <div className="hidden md:flex items-center gap-8 font-code">
            {[
              { label: 'Home', active: true },
              { label: 'Canvases', active: false },
              { label: 'Cloud', active: false },
              { label: 'Documentation', active: false },
            ].map((link) => (
              <a 
                key={link.label}
                href="#" 
                className={cn(
                  "text-[10px] uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2 group",
                  link.active ? "text-white" : "text-white/40 hover:text-white"
                )}
              >
                <span className={cn(
                  "w-1 h-1 rounded-full transition-all duration-300",
                  link.active ? "bg-white scale-100" : "bg-white/0 scale-0 group-hover:scale-100 group-hover:bg-white/40"
                )} />
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 font-mono">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-white font-bold tracking-tight">Adam Torres</span>
              <span className="text-[8px] text-white/30 uppercase tracking-widest">Pro Developer</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-[10px] text-white/60 font-bold overflow-hidden">
              AT
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 grid flex-1 gap-x-16 px-8 md:px-16 pt-10 pb-0 overflow-hidden"
           style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Left: hero text */}
        <div className="flex flex-col pt-0 pb-12 h-full gap-10">
          <div className="flex flex-col gap-4">
            <h1 className="text-hero text-white">
              The AI-powered <br/>
              <LineShadowText className="text-white italic" shadowColor="white">
                canvas.
              </LineShadowText>
            </h1>
            <p className="text-sm text-body-code text-white/70 max-w-sm">
              Sketch, brainstorm, and build with an AI copilot that understands your spatial intent in real-time.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ShimmerButton
              onClick={handleCreate}
              disabled={isPending}
              borderRadius="0px"
              shimmerSize="0.1em"
              background="white"
              shimmerColor="#000000"
              className="text-xs font-mono uppercase tracking-widest text-black px-12 py-5 transform transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 border-none shadow-2xl"
            >
              <span className="relative z-10">
                {isPending ? "Initializing..." : "Create New Artifact"}
              </span>
            </ShimmerButton>
          </div>
        </div>

        {/* Right: ChromaGrid */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-4 overflow-hidden" style={{ left: '44%' }}>
          <div className="flex items-center justify-end px-2 self-end w-full max-w-[900px]">
            <span className="text-4xl font-display font-black text-white tracking-tighter">
              Recent Work
            </span>
          </div>
          <ChromaGrid
            items={chromaItems}
            radius={250}
            damping={0.45}
            onItemClick={(_, i) => {
              const board = cards[i];
              if (board && !board.id.startsWith('placeholder')) router.push(`/board/${board.id}`);
            }}
            onRename={(i) => {
              const board = cards[i];
              if (board && !board.id.startsWith('placeholder')) handleRename(board);
            }}
            onDelete={(i) => {
              const board = cards[i];
              if (board && !board.id.startsWith('placeholder')) handleDelete(board.id);
            }}
          />
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="font-code rounded-none border-2 border-white/10 bg-black/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold tracking-tight text-white">
              Rename Artifact
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em] mb-2 block">
              Label identifier
            </label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setRenameTarget(null)}
              className="text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white px-6 py-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitRename}
              className="text-[10px] font-mono uppercase tracking-widest bg-white text-black px-8 py-2 hover:bg-neutral-200 transition-all"
            >
              Update
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
