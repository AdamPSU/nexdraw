"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface BoardContextValue {
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  return (
    <BoardContext.Provider value={{ isChatOpen, setIsChatOpen }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoardContext() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoardContext must be used within BoardProvider");
  return ctx;
}
