"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Substitui window.confirm() por um dialogo no mesmo padrao visual do resto
 * do app. Uso: const confirm = useConfirm(); const ok = await confirm({ title, description }).
 */
export function useConfirm(): ConfirmContextValue["confirm"] {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider.");
  }
  return context.confirm;
}

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const respond = useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending],
  );

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") respond(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, respond]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending ? (
        <div className="confirm-overlay" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="confirm-card">
            <h2 id="confirm-dialog-title">{pending.title}</h2>
            {pending.description ? <p>{pending.description}</p> : null}
            <div className="confirm-actions">
              <button type="button" className="workspace-button-secondary" onClick={() => respond(false)}>
                {pending.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="button"
                className={pending.tone === "danger" ? "workspace-button-danger" : "workspace-button-primary"}
                onClick={() => respond(true)}
                autoFocus
              >
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
