"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { moneyPlain } from "@/lib/format";
import type { StudentStatus } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ---------------- Modal ----------------

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:px-6 sm:pt-[8vh]" role="dialog" aria-modal>
      <div className="absolute inset-0 animate-fade bg-[#1b1a17]/35" onClick={onClose} />
      <div
        className={cx(
          "relative flex max-h-[90vh] w-full animate-in flex-col overflow-hidden rounded-t-xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] sm:max-h-[84vh] sm:rounded-xl",
          width,
        )}
      >
        <div className="flex items-start gap-3 px-6 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-3">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon -mt-1 -mr-2" aria-label="Fechar">
            <X size={17} strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------- Confirm ----------------

type ConfirmOpts = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: string;
};

const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState("");
  const confirm = useCallback(
    (o: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setTyped("");
        setState({ ...o, resolve });
      }),
    [],
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const blocked = !!state?.requireText && typed.trim().toUpperCase() !== state.requireText.toUpperCase();
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => close(false)}>
              Cancelar
            </button>
            <button className={cx("btn", state?.danger ? "btn-danger" : "btn-primary")} disabled={blocked} onClick={() => close(true)} autoFocus>
              {state?.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        }
      >
        <div className="text-[14px] leading-relaxed text-ink-2">{state?.message}</div>
        {state?.requireText && (
          <div className="mt-4">
            <label className="label">
              Para confirmar, digite <b className="text-ink">{state.requireText}</b>
            </label>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

// ---------------- Toast ----------------

type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  text: ReactNode;
  action?: { label: string; onClick: () => void };
};

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.action ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-0 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 p-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto flex animate-in items-center gap-4 rounded-md px-4 py-2.5 text-[13.5px] shadow-lg",
              t.kind === "error" ? "bg-debt text-surface" : "bg-ink text-paper",
            )}
          >
            <div className="min-w-0">{t.text}</div>
            {t.action && (
              <button
                className="-mr-1 shrink-0 font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
                onClick={() => {
                  t.action?.onClick();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- Status & valores ----------------

export function StatusText({ status, days, className }: { status: StudentStatus; days?: number; className?: string }) {
  const map: Record<StudentStatus, [string, string]> = {
    atrasado: ["text-debt", days ? `${days} dias em aberto` : "atrasado"],
    devendo: ["text-warn", days ? `${days} ${days === 1 ? "dia" : "dias"} em aberto` : "em aberto"],
    credito: ["text-paid", "tem crédito"],
    em_dia: ["text-ink-3", "em dia"],
  };
  const [color, label] = map[status];
  return <span className={cx("text-[12.5px]", color, className)}>{label}</span>;
}

export function BalanceText({ cents, className }: { cents: number; className?: string }) {
  const color = cents > 0 ? "text-debt" : cents < 0 ? "text-paid" : "text-ink-3";
  return (
    <span className={cx("tabular whitespace-nowrap", color, className)}>
      {cents < 0 ? "+" : ""}R$ {moneyPlain(Math.abs(cents))}
    </span>
  );
}

// ---------------- Money input ----------------

/** Campo de dinheiro estilo maquininha: digitar 1 2 5 0 vira 12,50. */
export function MoneyInput({
  value,
  onChange,
  autoFocus,
  className,
  inputClassName,
  placeholder = "0,00",
  onEnter,
  id,
}: {
  value: number;
  onChange: (cents: number) => void;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onEnter?: () => void;
  id?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-ink-3">R$</span>
      <input
        id={id}
        inputMode="numeric"
        autoFocus={autoFocus}
        className={cx("input tabular pl-9", inputClassName)}
        placeholder={placeholder}
        value={value ? moneyPlain(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-serif text-[19px] italic text-ink-2">{title}</p>
      {text && <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-3">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-2.5 text-[13.5px] text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-semibold">{children}</h2>
      {aside && <div className="text-[12.5px] text-ink-3">{aside}</div>}
    </div>
  );
}
