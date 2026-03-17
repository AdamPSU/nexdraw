import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon } from "hugeicons-react";

export type StatusIndicatorState =
  | "idle"
  | "generating"
  | "success"
  | "error";

interface StatusIndicatorProps {
  status: StatusIndicatorState;
  errorMessage?: string;
  customMessage?: string;
}

export function StatusIndicator({ status, errorMessage, customMessage }: StatusIndicatorProps) {
  if (status === "idle" || status === "success") return null;

  const isError = status === "error";
  const isGenerating = status === "generating";

  const message = customMessage || (isError && errorMessage
    ? errorMessage
    : isGenerating ? "AI is thinking..." : "Success!");

  const nodes = [
    { id: 1, top: "20%", left: "10%" },
    { id: 2, top: "70%", left: "30%" },
    { id: 3, top: "30%", left: "60%" },
    { id: 4, top: "80%", left: "80%" },
    { id: 5, top: "40%", left: "90%" },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className={`flex items-center gap-3 px-4 py-2 bg-white/90 dark:bg-neutral-900/90 border rounded-none shadow-sm overflow-hidden relative backdrop-blur-md ${
          isError ? "border-red-200 dark:border-red-900/50" : "border-neutral-200 dark:border-neutral-800"
        }`}
      >
        {isGenerating && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:10px_10px]" />

            {nodes.map((node) => (
              <motion.div
                key={node.id}
                className="absolute w-1 h-1 bg-blue-500/20 rounded-full"
                style={{ top: node.top, left: node.left }}
                animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}

            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`packet-${i}`}
                className="absolute h-[1px] w-4 bg-blue-500/30"
                style={{ top: `${25 + i * 25}%` }}
                animate={{ x: ["-100%", "400%"] }}
                transition={{ duration: 1.2, delay: i * 0.4, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex items-center gap-2">
          {isGenerating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <SparklesIcon size={16} className="text-blue-500" />
            </motion.div>
          ) : (
            <div className={isError ? "text-red-500" : "text-green-500"}>
              <SparklesIcon size={16} fill="currentColor" />
            </div>
          )}

          {!isGenerating && (
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] font-medium ${
              isError ? "text-red-600" : "text-neutral-700 dark:text-neutral-300"
            }`}>
              {message}
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
