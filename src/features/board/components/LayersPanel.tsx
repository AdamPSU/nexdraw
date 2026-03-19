"use client";

import React, { useState, useRef } from "react";
import { Eye, EyeOff, Lock, Unlock, GripVertical, Plus, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Layer } from "@/features/board/hooks/useLayers";

type Props = {
  layers: Layer[];
  activeLayerId: string;
  onSetActive: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorder: (layers: Layer[]) => void;
};

export function LayersPanel({ layers, activeLayerId, onSetActive, onAdd, onDelete, onRename, onToggleVisibility, onToggleLock, onReorder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const dragLayerRef = useRef<string | null>(null);

  const reversed = [...layers].reverse();

  const commitRename = () => {
    if (editingId && editName.trim()) onRename(editingId, editName.trim());
    setEditingId(null);
  };

  const handleDrop = (targetId: string) => {
    const dragId = dragLayerRef.current;
    if (!dragId || dragId === targetId) return;
    dragLayerRef.current = null;
    const dragIdx = layers.findIndex(l => l.id === dragId);
    const targetIdx = layers.findIndex(l => l.id === targetId);
    const next = [...layers];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onReorder(next);
  };

  return (
    <div style={{ position: "absolute", bottom: 0, right: 0, zIndex: 1000 }}>
      {/* Opaque cover for tldraw license sticker */}
      <div className="absolute bottom-0 right-0 w-52 h-24 bg-white dark:bg-neutral-950" style={{ pointerEvents: "none" }} />

      {isOpen && (
        <div className="absolute bottom-16 right-4 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-md overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {reversed.map(layer => (
              <div
                key={layer.id}
                draggable
                onDragStart={() => { dragLayerRef.current = layer.id; }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(layer.id)}
                onClick={() => onSetActive(layer.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 cursor-pointer group hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-mono",
                  activeLayerId === layer.id && "bg-neutral-100 dark:bg-neutral-800"
                )}
              >
                <GripVertical size={12} className="text-neutral-400 shrink-0 cursor-grab" />

                <button onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id); }} className="shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                  {layer.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>

                <button onClick={e => { e.stopPropagation(); onToggleLock(layer.id); }} className="shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                  {layer.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>

                {editingId === layer.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-transparent outline-none border-b border-neutral-400 text-xs font-mono"
                  />
                ) : (
                  <span
                    className="flex-1 min-w-0 truncate"
                    onDoubleClick={e => { e.stopPropagation(); setEditingId(layer.id); setEditName(layer.name); }}
                  >
                    {layer.name}
                  </span>
                )}

                {layers.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(layer.id); }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 px-2 py-1">
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 w-full py-0.5"
            >
              <Plus size={12} />
              Add Layer
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(v => !v)}
        style={{ position: "absolute", bottom: "16px", right: "16px" }}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm",
          isOpen
            ? "bg-black text-white dark:bg-white dark:text-black"
            : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
        )}
        title="Layers"
      >
        <Layers size={16} />
      </button>
    </div>
  );
}
