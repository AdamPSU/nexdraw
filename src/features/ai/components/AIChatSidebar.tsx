"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  images?: string[];
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, images?: File[]) => Promise<{ success: boolean; textContent: string }>;
  status: "idle" | "generating" | "success" | "error";
}

export function AIChatSidebar({ isOpen, onClose, onSubmit, status }: AIChatSidebarProps) {
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages((prev) => [...prev, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) setSelectedImages((prev) => [...prev, file]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || status === "generating") return;

    const imageUrls = selectedImages.map(file => URL.createObjectURL(file));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      images: imageUrls,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentImages = [...selectedImages];
    setInput("");
    setSelectedImages([]);

    try {
      const result = await onSubmit(currentInput, currentImages);
      if (result.textContent) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "ai", content: result.textContent },
        ]);
      } else if (result.success) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "ai", content: "I've processed your request on the canvas." },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: "Sorry, I encountered an error while processing that." },
      ]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 h-full w-[350px] bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 z-[3000] shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-neutral-600 dark:text-neutral-400">
                <Sparkles size={18} />
              </div>
              <h2 className="font-semibold text-sm">AI Agent</h2>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X size={16} />
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar [direction:rtl]"
          >
            <div className="[direction:ltr] p-4 flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                    <Sparkles size={24} />
                  </div>
                  <p className="text-sm font-medium">How can I help you draw today?</p>
                  <p className="text-xs mt-1">Try "draw a cat" or "add a table".</p>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm shadow-sm",
                      m.role === "user"
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    )}
                  >
                    {m.images && m.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {m.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="uploaded"
                            className="w-20 h-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-800"
                          />
                        ))}
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {status === "generating" && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 italic px-2">
                  <Loader2 size={12} className="animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-sm">
            {selectedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-1">
                {selectedImages.map((file, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="w-14 h-14 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Ask AI to draw..."
                  className="pr-10 h-11 rounded-xl bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 focus-visible:ring-black dark:focus-visible:ring-white"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!input.trim() && selectedImages.length === 0) || status === "generating"}
                  className="absolute right-1 top-1 h-9 w-9 rounded-lg bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-30"
                >
                  <Send size={16} />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 w-11 rounded-xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 flex-shrink-0"
              >
                <ImageIcon size={18} className="text-neutral-500" />
              </Button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                multiple
                accept="image/*"
                className="hidden"
              />
            </form>
            <p className="text-[10px] text-center mt-2 text-neutral-400 uppercase tracking-widest font-medium">
              Ctrl+L to toggle • Multimodal AI
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
