import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon } from "hugeicons-react";

export type StatusIndicatorState = "idle" | "generating" | "success" | "error";

interface StatusIndicatorProps {
  status: StatusIndicatorState;
  errorMessage?: string;
  customMessage?: string;
}

const LOADER_STYLE = `
  .maestro-loader {
    display: flex;
    justify-content: center;
    align-items: center;
    --ml-color: hsl(0, 0%, 0%);
    --ml-anim: 2s ease-in-out infinite;
  }
  .maestro-loader .ml-circle {
    display: flex; align-items: center; justify-content: center;
    position: relative; width: 12px; height: 12px;
    border: solid 2px var(--ml-color); border-radius: 50%;
    margin: 0 5px; background-color: transparent;
    animation: maestro-circle-keys var(--ml-anim);
  }
  .maestro-loader .ml-dot {
    position: absolute; transform: translate(-50%, -50%);
    width: 8px; height: 8px; border-radius: 50%;
    background-color: var(--ml-color);
    animation: maestro-dot-keys var(--ml-anim);
  }
  .maestro-loader .ml-outline {
    position: absolute; transform: translate(-50%, -50%);
    width: 12px; height: 12px; border-radius: 50%;
    animation: maestro-outline-keys var(--ml-anim);
  }
  .maestro-loader .ml-circle:nth-child(2) { animation-delay: 0.3s; }
  .maestro-loader .ml-circle:nth-child(3) { animation-delay: 0.6s; }
  .maestro-loader .ml-circle:nth-child(4) { animation-delay: 0.9s; }
  .maestro-loader .ml-circle:nth-child(2) .ml-dot { animation-delay: 0.3s; }
  .maestro-loader .ml-circle:nth-child(3) .ml-dot { animation-delay: 0.6s; }
  .maestro-loader .ml-circle:nth-child(4) .ml-dot { animation-delay: 0.9s; }
  .maestro-loader .ml-circle:nth-child(1) .ml-outline { animation-delay: 0.9s; }
  .maestro-loader .ml-circle:nth-child(2) .ml-outline { animation-delay: 1.2s; }
  .maestro-loader .ml-circle:nth-child(3) .ml-outline { animation-delay: 1.5s; }
  .maestro-loader .ml-circle:nth-child(4) .ml-outline { animation-delay: 1.8s; }
  @keyframes maestro-circle-keys {
    0%   { transform: scale(1);   opacity: 1; }
    50%  { transform: scale(1.5); opacity: 0.5; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes maestro-dot-keys {
    0%   { transform: scale(1); }
    50%  { transform: scale(0); }
    100% { transform: scale(1); }
  }
  @keyframes maestro-outline-keys {
    0%   { transform: scale(0); outline: solid 12px var(--ml-color); outline-offset: 0; opacity: 1; }
    100% { transform: scale(1); outline: solid 0 transparent; outline-offset: 12px; opacity: 0; }
  }
`;

export function StatusIndicator({ status, errorMessage, customMessage }: StatusIndicatorProps) {
  if (status === "idle" || status === "success") return null;

  const isError = status === "error";
  const isGenerating = status === "generating";
  const message = customMessage || (isError && errorMessage ? errorMessage : "Success!");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
      >
        {isGenerating ? (
          <>
            <style>{LOADER_STYLE}</style>
            <div className="maestro-loader">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="ml-circle">
                  <div className="ml-dot" />
                  <div className="ml-outline" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={`flex items-center gap-3 px-4 py-2 bg-white/90 dark:bg-neutral-900/90 border rounded-none shadow-sm backdrop-blur-md ${
            isError ? "border-red-200 dark:border-red-900/50" : "border-neutral-200 dark:border-neutral-800"
          }`}>
            <div className={isError ? "text-red-500" : "text-green-500"}>
              <SparklesIcon size={16} fill="currentColor" />
            </div>
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] font-medium ${
              isError ? "text-red-600" : "text-neutral-700 dark:text-neutral-300"
            }`}>
              {message}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
