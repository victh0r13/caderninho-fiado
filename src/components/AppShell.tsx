"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Lock,
  House,
  Users,
  BellRing,
  ReceiptText,
  UtensilsCrossed,
  ChevronRight,
  Store,
  Plus,
  CircleDollarSign,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
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
  { href: "/", label: "Início", icon: House },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/cobrancas", label: "Cobranças", icon: BellRing },
  { href: "/historico", label: "Histórico", icon: ReceiptText },
  { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
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
  const topDebtors = data.summaries
    .filter((s) => s.balance > 0 && !s.student.archived)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 4);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Ctx.Provider value={actions}>
          <div className="flex h-screen gap-3 p-0 md:p-3">
            {/* Menu lateral */}
            <aside className="shell-panel no-print hidden w-[268px] shrink-0 flex-col overflow-y-auto px-4 pt-6 pb-4 md:flex">
              <div className="flex items-center justify-between px-2">
                <Link href="/" className="text-[24px] leading-none font-bold tracking-[-0.05em]">
                  caderninho
                </Link>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-line-strong text-ink-2 transition hover:bg-sunken hover:text-ink"
                  onClick={lockNow}
                  title={lockMinutes ? `Bloquear agora (bloqueia sozinho após ${lockMinutes} min parado)` : "Bloquear agora"}
                  aria-label="Bloquear"
                >
                  <Lock size={15} strokeWidth={1.75} />
                </button>
              </div>

              <nav className="mt-7 space-y-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cx(
                        "flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium transition",
                        active ? "gloss text-ink" : "border border-transparent text-ink-2 hover:text-ink",
                      )}
                    >
                      <Icon size={19} strokeWidth={1.75} />
                      {label}
                      {href === "/cobrancas" && overdue > 0 && !active && (
                        <span className="tabular ml-auto text-[12px] text-debt">{overdue}</span>
                      )}
                      {active && <span className="dot ml-auto" />}
                    </Link>
                  );
                })}
              </nav>

              <div className="mx-3 my-6 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />

              <div className="flex items-center justify-between px-2">
                <span className="text-[13.5px] font-semibold">Devendo mais</span>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line-strong text-ink-2 transition hover:bg-sunken hover:text-ink"
                  onClick={() => setSale({ open: true })}
                  title="Anotar fiado (F)"
                  aria-label="Anotar fiado"
                >
                  <Plus size={15} strokeWidth={1.75} />
                </button>
              </div>
              <button
                className="mt-3 flex h-10 w-full items-center gap-2.5 rounded-xl border border-line-strong px-3 text-[13px] text-ink-3 transition hover:text-ink"
                onClick={() => setSearch(true)}
              >
                <Search size={15} strokeWidth={1.75} /> Buscar aluno
                <span className="kbd ml-auto">⌘K</span>
              </button>
              <ul className="mt-2 space-y-0.5">
                {topDebtors.map((s) => {
                  const active = pathname === `/alunos/${s.student.id}`;
                  return (
                    <li key={s.student.id}>
                      <Link
                        href={`/alunos/${s.student.id}`}
                        className={cx(
                          "flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] transition",
                          active ? "bg-sunken text-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
                        )}
                      >
                        <CircleDollarSign size={15} strokeWidth={1.75} className="shrink-0 text-ink-3" />
                        <span className="truncate">{s.student.name}</span>
                        <span className="tabular ml-auto shrink-0 text-[12px] text-debt">{moneyPlain(s.balance)}</span>
                      </Link>
                    </li>
                  );
                })}
                {topDebtors.length === 0 && <li className="px-3 py-2 text-[12.5px] text-ink-3">Ninguém devendo.</li>}
              </ul>

              <div className="mt-auto space-y-3 pt-6">
                <ThemeToggle />
                <Link
                  href="/configuracoes"
                  className={cx(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                    isActive("/configuracoes") ? "gloss" : "border border-line hover:bg-sunken",
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink-2">
                    <Store size={16} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{data.settings.shopName}</span>
                    <span className="block text-[12px] text-ink-3">Ajustes e PIN</span>
                  </span>
                  <ChevronRight size={16} className="text-ink-3" />
                </Link>
              </div>
            </aside>

            {/* Área principal */}
            <div className="shell-panel print-full flex min-w-0 flex-1 flex-col overflow-hidden max-md:rounded-none max-md:border-0">
              <header className="no-print flex shrink-0 items-center gap-3 border-b border-line px-5 py-3 md:px-8">
                <div className="flex min-w-0 items-center gap-2 text-[13px] text-ink-3">
                  <span className="md:hidden text-[18px] font-bold tracking-[-0.05em] text-ink">caderninho</span>
                  <span className="hidden md:inline">A receber</span>
                  <span className="tabular hidden font-semibold text-ink md:inline">{moneyPlain(receivable)}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button className="btn btn-secondary" onClick={() => setPayment({ open: true })}>
                    Receber <span className="kbd hidden sm:inline-flex">R</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => setSale({ open: true })}>
                    <Plus size={15} strokeWidth={2.25} /> Anotar fiado
                  </button>
                </div>
              </header>
              <nav className="no-print flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
                {[...NAV, { href: "/configuracoes", label: "Ajustes", icon: Store }].map(({ href, label }) => (
                  <Link key={href} href={href} className="chip shrink-0" data-active={isActive(href)}>
                    {label}
                  </Link>
                ))}
              </nav>
              <main className="print-full min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[1060px] px-5 py-8 md:px-10 md:py-10">{children}</div>
              </main>
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
