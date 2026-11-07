"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Trash2 } from "lucide-react";
import { deleteTransaction } from "@/app/actions";
import { EmptyState, PageHeader, cx, useConfirm, useToast } from "@/components/ui";
import { describeItems } from "@/lib/calc";
import { dateFull, dayLabel, money, moneyPlain, normalize, startOfDay, time } from "@/lib/format";
import { METHOD_LABEL, type Transaction } from "@/lib/types";

type Period = "hoje" | "7d" | "mes" | "mes_passado" | "tudo";
type Kind = "todos" | "compra" | "pagamento";

function range(p: Period): [string | null, string | null] {
  const now = new Date();
  if (p === "hoje") return [startOfDay(now).toISOString(), null];
  if (p === "7d") return [startOfDay(new Date(now.getTime() - 6 * 86_400_000)).toISOString(), null];
  if (p === "mes") return [new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), null];
  if (p === "mes_passado")
    return [new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), new Date(now.getFullYear(), now.getMonth(), 1).toISOString()];
  return [null, null];
}

export function HistoryView({
  transactions,
  names,
}: {
  transactions: Transaction[];
  names: Record<string, { name: string; grade: string }>;
}) {
  const [period, setPeriod] = useState<Period>("mes");
  const [kind, setKind] = useState<Kind>("todos");
  const [q, setQ] = useState("");
  const confirm = useConfirm();
  const toast = useToast();
  const [, start] = useTransition();

  const [from, to] = range(period);
  const list = useMemo(() => {
    const nq = normalize(q);
    return transactions.filter((t) => {
      if (from && t.createdAt < from) return false;
      if (to && t.createdAt >= to) return false;
      if (kind !== "todos" && t.type !== kind) return false;
      if (nq) {
        const n = names[t.studentId];
        if (!normalize(`${n?.name ?? ""} ${n?.grade ?? ""} ${describeItems(t)} ${t.note}`).includes(nq)) return false;
      }
      return true;
    });
  }, [transactions, from, to, kind, q, names]);

  const sold = list.filter((t) => t.type === "compra").reduce((a, t) => a + t.amount, 0);
  const received = list.filter((t) => t.type === "pagamento" && t.method !== "desconto").reduce((a, t) => a + t.amount, 0);
  const discounts = list.filter((t) => t.method === "desconto").reduce((a, t) => a + t.amount, 0);

  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: Transaction[] }[] = [];
    for (const t of list.slice(0, 500)) {
      const key = new Date(t.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last?.key === key) last.rows.push(t);
      else out.push({ key, label: dayLabel(t.createdAt), rows: [t] });
    }
    return out;
  }, [list]);

  const exportUrl = `/api/export?tipo=movimentos${from ? `&de=${encodeURIComponent(from)}` : ""}${to ? `&ate=${encodeURIComponent(to)}` : ""}`;

  const remove = async (t: Transaction) => {
    const ok = await confirm({
      title: "Apagar lançamento?",
      message: (
        <>
          {names[t.studentId]?.name}: {describeItems(t)}, {money(t.amount)}, em {dateFull(t.createdAt)}.
        </>
      ),
      confirmLabel: "Apagar",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await deleteTransaction(t.id);
      toast({ kind: "info", text: "Lançamento apagado." });
    });
  };

  const periods: [Period, string][] = [
    ["hoje", "Hoje"],
    ["7d", "7 dias"],
    ["mes", "Este mês"],
    ["mes_passado", "Mês passado"],
    ["tudo", "Tudo"],
  ];

  return (
    <div className="animate-in">
      <PageHeader
        title="Histórico"
        subtitle="Tudo o que foi anotado e recebido."
        actions={
          <>
            <a className="btn btn-secondary" href="/api/export?tipo=saldos">
              Planilha de saldos
            </a>
            <a className="btn btn-secondary" href={exportUrl}>
              Planilha do período
            </a>
          </>
        }
      />

      <div className="tabs">
        {periods.map(([id, label]) => (
          <button key={id} className="tab" data-active={period === id} onClick={() => setPeriod(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 border-b border-line">
        {[
          ["Fiado", sold, ""],
          ["Recebido", received, "text-paid"],
          ["Descontos", discounts, "text-ink-3"],
        ].map(([label, v, color], i) => (
          <div key={label as string} className={cx("py-5", i > 0 && "border-l border-line pl-5")}>
            <div className="text-[12.5px] text-ink-3">{label}</div>
            <div className={cx("figure mt-1 text-[28px] leading-none", color as string)}>
              <span className="text-[15px] text-ink-3">R$ </span>
              {moneyPlain(v as number)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 mb-2 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-md border border-line-strong text-[13px]">
          {(
            [
              ["todos", "Tudo"],
              ["compra", "Fiados"],
              ["pagamento", "Pagamentos"],
            ] as [Kind, string][]
          ).map(([id, label], i) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={cx(
                "h-8 px-3 transition-colors",
                i > 0 && "border-l border-line-strong",
                kind === id ? "bg-ink text-paper" : "bg-surface text-ink-2 hover:bg-sunken",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input className="input h-8 pl-9 text-[13px]" placeholder="Buscar aluno ou item" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Nada neste período." text="Troque o período ou limpe a busca." />
      ) : (
        <table className="w-full text-[14px]">
          {groups.map((g) => (
            <tbody key={g.key}>
              <tr>
                <td colSpan={4} className="pt-5 pb-1.5 text-[12px] font-medium text-ink-3">
                  {g.label}
                </td>
              </tr>
              {g.rows.map((t) => (
                <tr key={t.id} className="group border-t border-line">
                  <td className="tabular w-14 py-2.5 pr-3 text-[12.5px] text-ink-3">{time(t.createdAt)}</td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/alunos/${t.studentId}`} className="hover:underline">
                      {names[t.studentId]?.name ?? "Aluno removido"}
                    </Link>
                    <div className="text-[12.5px] text-ink-3">
                      {t.type === "compra" ? describeItems(t) : `pagou em ${METHOD_LABEL[t.method ?? "outro"].toLowerCase()}`}
                      {t.note && t.type === "pagamento" ? ` · ${t.note}` : ""}
                    </div>
                  </td>
                  <td className={cx("tabular py-2.5 pr-3 text-right whitespace-nowrap", t.type === "pagamento" && "text-paid")}>
                    {t.type === "pagamento" ? "− " : "+ "}
                    {moneyPlain(t.amount)}
                  </td>
                  <td className="w-8 py-2.5 text-right">
                    <button
                      className="btn btn-ghost h-7 w-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-debt"
                      title="Apagar"
                      onClick={() => remove(t)}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
      {list.length > 500 && <p className="mt-4 text-center text-[12.5px] text-ink-3">Mostrando os 500 mais recentes. Use os filtros ou a planilha.</p>}
    </div>
  );
}
