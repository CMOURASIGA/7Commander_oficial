"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "error" | "info";

type ToastItem = { id: string; tone: ToastTone; message: string };

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { id, tone, message }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notificacoes">
        {items.map((item) => (
          <div key={item.id} className={`toast-item toast-${item.tone}`} role="status">
            <span className="toast-message">{item.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => dismiss(item.id)}
              aria-label="Fechar notificacao"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
