"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { addPurchase, deleteTransaction, saveStudent } from "@/app/actions";
import { money, toDateInput } from "@/lib/format";
import type { Product, StudentSummary, TxItem } from "@/lib/types";
import { useApp } from "./AppShell";
import { StudentPicker } from "./StudentPicker";
import { BalanceText, Modal, MoneyInput, cx, useToast } from "./ui";

export function SaleDialog(props: { open: boolean; initialStudentId?: string; onClose: () => void }) {
  if (!props.open) return null;
  return <SaleDialogInner {...props} />;
}

function SaleDialogInner({ initialStudentId, onClose }: { initialStudentId?: string; onClose: () => void }) {
  const { data } = useApp();
  const toast = useToast();
  const [studentId, setStudentId] = useState<string | undefined>(initialStudentId);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [showDate, setShowDate] = useState(false);
  const [category, setCategory] = useState<string>("Tudo");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const summary = data.summaries.find((s) => s.student.id === studentId);
  const products = data.products.filter((p) => p.active);
  const categories = useMemo(() => ["Tudo", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visible = category === "Tudo" ? products : products.filter((p) => p.category === category);

  const items: TxItem[] = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([pid, qty]) => {
      const p = data.products.find((x) => x.id === pid)!;
      return { productId: p.id, name: p.name, unitPrice: p.price, qty };
    });
  const total = items.reduce((a, i) => a + i.qty * i.unitPrice, 0) + extra;
  const newBalance = (summary?.balance ?? 0) + total;
  const willExceed = summary && summary.limit > 0 && newBalance > summary.limit;

  const add = (p: Product, d = 1) => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) + d) }));

  const submit = () => {
    if (!summary || total <= 0 || pending) return;
    setError("");
    start(async () => {
      try {
        const res = await addPurchase({ studentId: summary.student.id, items, extraAmount: extra, note, date });
        toast({
          kind: "success",
          text: `${money(total)} anotado para ${summary.student.name.split(" ")[0]}.`,
          action: {
            label: "Desfazer",
            onClick: async () => {
              await deleteTransaction(res.id);
              toast({ kind: "info", text: "Lançamento desfeito." });
            },
          },
        });
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const quickCreate = (name: string) => {
    start(async () => {
      const { id } = await saveStudent(null, { name, grade: "", guardianName: "", phone: "", notes: "", creditLimit: null });
      setStudentId(id);
      toast({ kind: "success", text: `${name} cadastrado. Complete os dados depois, na ficha.` });
    });
  };

  if (!summary) {
    return (
      <Modal open onClose={onClose} title="Anotar fiado" subtitle="Para quem é?">
        <StudentPicker summaries={data.summaries} onPick={(s) => setStudentId(s.student.id)} onCreate={quickCreate} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-baseline gap-2">
          Fiado para {summary.student.name}
          <button className="text-[12.5px] font-normal text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => setStudentId(undefined)}>
            trocar
          </button>
        </span>
      }
      subtitle={
        <>
          {summary.student.grade && `${summary.student.grade} · `}deve hoje <BalanceText cents={summary.balance} />
          {summary.limit > 0 && <> · limite {money(summary.limit)}</>}
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-baseline gap-6">
            <div>
              <div className="text-[12px] text-ink-3">Este lanche</div>
              <div className="figure text-[26px] leading-tight">{money(total)}</div>
            </div>
            <div>
              <div className="text-[12px] text-ink-3">Fica devendo</div>
              <div className="figure text-[18px] leading-tight">
                <BalanceText cents={newBalance} />
              </div>
            </div>
          </div>
          <span className="hidden text-[12px] text-ink-3 sm:inline">
            <span className="kbd">⌘</span> <span className="kbd">Enter</span>
          </span>
          <button className="btn btn-secondary btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-lg min-w-36" disabled={total <= 0 || pending} onClick={submit}>
            {pending ? "Anotando…" : "Anotar"}
          </button>
        </div>
      }
    >
      {(summary.student.notes || summary.student.blocked || willExceed) && (
        <div className="mb-5 space-y-2">
          {summary.student.notes && (
            <p className="border-l-2 border-warn bg-warn-soft px-3 py-2 text-[13.5px]">{summary.student.notes}</p>
          )}
          {summary.student.blocked && (
            <p className="border-l-2 border-debt bg-debt-soft px-3 py-2 text-[13.5px]">
              O fiado deste aluno está <b>bloqueado</b>. Só anote se combinou com o responsável.
            </p>
          )}
          {willExceed && (
            <p className="border-l-2 border-debt bg-debt-soft px-3 py-2 text-[13.5px]">
              Com este lanche passa do limite de {money(summary.limit)}.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="tabs mb-4">
            {categories.map((c) => (
              <button key={c} className="tab" data-active={category === c} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((p) => {
              const q = cart[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    add(p, -1);
                  }}
                  className={cx(
                    "relative flex min-h-[64px] flex-col justify-between rounded-md border px-3 py-2.5 text-left transition-colors active:bg-sunken",
                    q > 0 ? "border-ink bg-surface" : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span className="pr-6 text-[14px] leading-snug">{p.name}</span>
                  <span className="tabular text-[12.5px] text-ink-3">{money(p.price)}</span>
                  {q > 0 && (
                    <span className="tabular absolute top-2 right-2 grid h-5 min-w-5 place-items-center rounded bg-ink px-1 text-[11.5px] font-semibold text-paper">
                      {q}
                    </span>
                  )}
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="col-span-full py-6 text-[13.5px] text-ink-3">
                Nenhum produto no cardápio. Use o valor avulso ou cadastre produtos em Cardápio.
              </p>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="label">Valor avulso</label>
              <MoneyInput value={extra} onChange={setExtra} onEnter={submit} />
            </div>
            <div>
              <label className="label">Descrição</label>
              <input className="input" placeholder="Opcional" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 text-[12.5px]">
            {showDate ? (
              <label className="flex items-center gap-2 text-ink-2">
                Data do lanche
                <input type="date" className="input h-8 w-auto" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} />
              </label>
            ) : (
              <button className="text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => setShowDate(true)}>
                Foi em outro dia?
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-[12px] text-ink-3">Itens</p>
          <div className="mt-2 border-t border-line">
            {items.length === 0 && extra === 0 && <p className="py-5 text-[13px] text-ink-3">Toque nos produtos para adicionar.</p>}
            {items.map((it) => {
              const p = data.products.find((x) => x.id === it.productId)!;
              return (
                <div key={it.productId} className="flex items-center gap-2 border-b border-line py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px]">{it.name}</div>
                    <div className="tabular text-[12px] text-ink-3">{money(it.unitPrice * it.qty)}</div>
                  </div>
                  <button className="btn btn-ghost h-7 w-7 px-0" onClick={() => add(p, -1)} aria-label="Menos">
                    <Minus size={13} />
                  </button>
                  <span className="tabular w-4 text-center text-[13.5px] font-medium">{it.qty}</span>
                  <button className="btn btn-ghost h-7 w-7 px-0" onClick={() => add(p, 1)} aria-label="Mais">
                    <Plus size={13} />
                  </button>
                </div>
              );
            })}
            {extra > 0 && (
              <div className="flex items-center justify-between border-b border-line py-2 text-[13.5px]">
                <span className="truncate">{note || "Valor avulso"}</span>
                <span className="tabular">{money(extra)}</span>
              </div>
            )}
          </div>
          {items.length > 0 && (
            <button className="mt-2 text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => setCart({})}>
              Limpar itens
            </button>
          )}
          {error && <p className="mt-3 text-[13px] text-debt">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
