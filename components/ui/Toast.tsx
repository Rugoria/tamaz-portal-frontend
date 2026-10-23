"use client";
import {useT} from "@/i18n/client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Small dark confirmation that fades after a few seconds ("Profile saved."). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const translate = useT();
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    window.setTimeout(() => setMessage((cur) => (cur === m ? null : cur)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 end-6 z-[60]">
        {message && (
          <div className="flex items-center gap-2.5 rounded-lg bg-deep px-4 py-3 text-deep-ink shadow-[0_8px_24px_rgba(11,31,58,.18)]">
            <span className="h-2 w-2 rounded-full bg-deep-aqua" />
            {translate(message)}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
