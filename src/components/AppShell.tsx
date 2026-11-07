"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Lock } from "lucide-react";
import type { Product, Settings, StudentSummary } from "@/lib/types";
import { lock } from "@/app/auth-actions";
import { ConfirmProvider, ToastProvider, cx } from "./ui";
import { SaleDialog } from "./SaleDialog";
import { PaymentDialog } from "./PaymentDialog";
import { StudentDialog } from "./StudentDialog";
import { ChargeDialog } from "./ChargeDialog";
import { CommandPalette } from "./CommandPalette";
import { moneyPlain } from "@/lib/format";

export interface AppData {
  summaries: StudentSummary[];
  products: Product[];
  settings: Settings;
}

interface AppActions {
  data: AppData;
  lockMinutes: number;
  openSale: (studentId?: string) => void;
  openPayment: (studentId?: string, amount?: number) => void;
  openStudent: (studentId?: string | null) => void;
  openCharge: (studentId: string) => void;
  openSearch: () => void;
  lockNow: () => void;
}

const Ctx = createContext<AppActions | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do AppShell");
  return c;
}

const NAV = [
  { href: "/", label: "Hoje" },
  { href: "/alunos", label: "Alunos" },
  { href: "/cobrancas", label: "Cobranças" },
  { href: "/historico", label: "Histórico" },
  { href: "/cardapio", label: "Cardápio" },
  { href: "/configuracoes", label: "Ajustes" },
];

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
}

export function AppShell({ data, lockMinutes, children }: { data: AppData; lockMinutes: number; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sale, setSale] = useState<{ open: boolean; studentId?: string }>({ open: false });
  const [payment, setPayment] = useState<{ open: boolean; studentId?: string; amount?: number }>({ open: false });
  const [student, setStudent] = useState<{ open: boolean; studentId?: string | null }>({ open: false });
  const [charge, setCharge] = useState<{ open: boolean; studentId?: string }>({ open: false });
  const [search, setSearch] = useState(false);

  const anyOpen = sale.open || payment.open || student.open || charge.open || search;

  const lockNow = useCallback(async () => {
    await lock();
    window.location.replace(`/desbloquear?de=${encodeURIComponent(window.location.pathname)}`);
  }, []);

  // Bloqueio automático por inatividade
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (!lockMinutes) return;
    const bump = () => (lastActivity.current = Date.now());
    const events = ["pointerdown", "keydown", "mousemove", "wheel", "touchstart"] as const;
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));
    const check = () => {
      if (Date.now() - lastActivity.current > lockMinutes * 60_000) lockNow();
    };
    const timer = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump));
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [lockMinutes, lockNow]);

  const actions = useMemo<AppActions>(
    () => ({
      data,
      lockMinutes,
      openSale: (studentId) => setSale({ open: true, studentId }),
      openPayment: (studentId, amount) => setPayment({ open: true, studentId, amount }),
      openStudent: (studentId) => setStudent({ open: true, studentId: studentId ?? null }),
      openCharge: (studentId) => setCharge({ open: true, studentId }),
      openSearch: () => setSearch(true),
      lockNow,
    }),
    [data, lockMinutes, lockNow],
  );

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
        return;
      }
      if (anyOpen || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "f" || k === "n") {
        e.preventDefault();
        setSale({ open: true });
      } else if (k === "r") {
        e.preventDefault();
        setPayment({ open: true });
      } else if (k === "/") {
        e.preventDefault();
        setSearch(true);
      }
    },
    [anyOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const overdue = data.summaries.filter((s) => s.status === "atrasado" && !s.student.archived).length;
  const receivable = data.summaries.reduce((a, s) => a + Math.max(0, s.balance), 0);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Ctx.Provider value={actions}>
          <div className="flex min-h-screen">
            <aside className="no-print sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line px-5 pt-7 pb-5 md:flex">
              <Link href="/" className="block">
                <div className="font-serif text-[24px] leading-none italic">Caderninho</div>
                <div className="mt-1.5 truncate text-[12px] text-ink-3">{data.settings.shopName}</div>
              </Link>

              <div className="mt-7 space-y-2">
                <button className="btn btn-primary btn-lg w-full justify-between" onClick={() => setSale({ open: true })}>
                  Anotar fiado <span className="kbd">F</span>
                </button>
                <button className="btn btn-secondary btn-lg w-full justify-between" onClick={() => setPayment({ open: true })}>
                  Receber <span className="kbd">R</span>
                </button>
              </div>

              <button
                className="mt-3 flex h-9 w-full items-center gap-2 rounded-md px-2 text-[13px] text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                onClick={() => setSearch(true)}
              >
                <Search size={14} strokeWidth={1.75} /> Buscar aluno
                <span className="kbd ml-auto">⌘K</span>
              </button>

              <nav className="mt-6 flex-1 space-y-px">
                {NAV.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cx(
                      "flex h-9 items-center justify-between rounded-md px-2 text-[14px] transition-colors",
                      isActive(href) ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {label}
                    {href === "/cobrancas" && overdue > 0 && <span className="tabular text-[12px] font-medium text-debt">{overdue}</span>}
                  </Link>
                ))}
              </nav>

              <div className="border-t border-line pt-4">
                <div className="text-[12px] text-ink-3">A receber</div>
                <div className="figure mt-0.5 text-[26px] leading-tight">
                  <span className="text-[15px] text-ink-3">R$ </span>
                  {moneyPlain(receivable)}
                </div>
                <button
                  className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink"
                  onClick={lockNow}
                  title={lockMinutes ? `Bloqueia sozinho após ${lockMinutes} min parado` : undefined}
                >
                  <Lock size={13} strokeWidth={1.75} /> Bloquear
                </button>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <header className="no-print sticky top-0 z-30 flex items-center gap-4 overflow-x-auto border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur md:hidden">
                <span className="font-serif text-[18px] italic">Caderninho</span>
                {NAV.map(({ href, label }) => (
                  <Link key={href} href={href} className={cx("shrink-0 text-[13.5px]", isActive(href) ? "font-medium text-ink" : "text-ink-3")}>
                    {label}
                  </Link>
                ))}
              </header>
              <main className="print-full mx-auto w-full max-w-[1080px] px-5 py-10 md:px-12">{children}</main>
              <div className="no-print fixed right-4 bottom-4 flex gap-2 md:hidden">
                <button className="btn btn-secondary btn-lg shadow-lg" onClick={() => setPayment({ open: true })}>
                  Receber
                </button>
                <button className="btn btn-primary btn-lg shadow-lg" onClick={() => setSale({ open: true })}>
                  Anotar fiado
                </button>
              </div>
            </div>
          </div>

          <SaleDialog open={sale.open} initialStudentId={sale.studentId} onClose={() => setSale({ open: false })} />
          <PaymentDialog
            open={payment.open}
            initialStudentId={payment.studentId}
            initialAmount={payment.amount}
            onClose={() => setPayment({ open: false })}
          />
          <StudentDialog
            open={student.open}
            studentId={student.studentId ?? null}
            onClose={() => setStudent({ open: false })}
            onCreated={(id) => router.push(`/alunos/${id}`)}
          />
          <ChargeDialog open={charge.open} studentId={charge.studentId} onClose={() => setCharge({ open: false })} />
          <CommandPalette open={search} onClose={() => setSearch(false)} />
        </Ctx.Provider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
