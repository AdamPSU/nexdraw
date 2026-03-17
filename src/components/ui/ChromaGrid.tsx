"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';

export interface ChromaItem {
  image: string;
  title: string;
  subtitle: string;
  borderColor?: string;
  gradient?: string;
}

interface ChromaGridProps {
  items?: ChromaItem[];
  radius?: number;
  damping?: number;
  onItemClick?: (item: ChromaItem, index: number) => void;
  onRename?: (index: number) => void;
  onDelete?: (index: number) => void;
}

export default function ChromaGrid({
  items = [],
  radius = 300,
  damping = 0.45,
  onItemClick,
  onRename,
  onDelete,
}: ChromaGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const smoothPos = useRef({ x: -9999, y: -9999 });
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const updateCards = useCallback(() => {
    smoothPos.current.x += (mousePos.current.x - smoothPos.current.x) * damping;
    smoothPos.current.y += (mousePos.current.y - smoothPos.current.y) * damping;

    cardRefs.current.forEach((card) => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((smoothPos.current.x - cx) ** 2 + (smoothPos.current.y - cy) ** 2);
      const t = Math.max(0, 1 - dist / radius);
      card.style.filter = `saturate(${0.4 + 0.6 * t}) brightness(${0.8 + 0.4 * t})`;
      card.style.opacity = `${0.85 + 0.15 * t}`;
    });

    rafRef.current = requestAnimationFrame(updateCards);
  }, [radius, damping]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateCards);
    return () => cancelAnimationFrame(rafRef.current);
  }, [updateCards]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mousePos.current = { x: -9999, y: -9999 };
  }, []);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-4 gap-2 w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {items.slice(0, 11).map((item, i) => (
        <div
          key={i}
          ref={(el) => { cardRefs.current[i] = el; }}
          onClick={() => onItemClick?.(item, i)}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
          style={{
            border: `1px solid ${item.borderColor ?? 'rgba(255,255,255,0.1)'}`,
            background: item.gradient ?? 'rgba(26,26,29,1)',
            aspectRatio: '4/3',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
            ...(i === 0 ? { gridColumnStart: 2 } : {}),
          }}
        >
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
            <p className="text-[11px] font-display font-bold text-white truncate tracking-tight mb-0.5">
              {item.title}
            </p>
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/50 truncate">
              {item.subtitle}
            </p>
          </div>
          {hoveredIndex === i && (onRename || onDelete) && (
            <div
              className="absolute top-2 right-2 flex gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {onRename && (
                <button
                  onClick={() => onRename(i)}
                  className="text-[8px] font-mono uppercase tracking-widest bg-white/10 backdrop-blur-md text-white px-2 py-1 rounded-sm hover:bg-white/20 transition-colors border border-white/5"
                >
                  Rename
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(i)}
                  className="text-[8px] font-mono uppercase tracking-widest bg-red-500/10 backdrop-blur-md text-red-400 px-2 py-1 rounded-sm hover:bg-red-500/20 transition-colors border border-red-500/10"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
