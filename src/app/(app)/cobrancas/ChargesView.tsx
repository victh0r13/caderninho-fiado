"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusText, cx } from "@/components/ui";
import { dateShort, daysBetween, money, moneyPlain, relativeDays } from "@/lib/format";

type Filter = "todos" | "atrasados" | "sem_cobranca";

export function ChargesView() {
  const { data, openCharge, openPayment } = useApp();
  const [filter, setFilter] = useState<Filter>("todos");
  const [grade, setGrade] = useState("todas");
  const [copied, setCopied] = useState(false);
  const now = new Date();

  const debtors = useMemo(
    () =>
      data.summaries
        .filter((s) => s.balance > 0 && !s.student.archived)
        .sort((a, b) => b.daysOpen - a.daysOpen || b.balance - a.balance),
    [data.summaries],
  );
  const grades = Array.from(new Set(debtors.map((s) => s.student.grade).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true }),
  );

  const notChargedRecently = (iso: string | null) => !iso || daysBetween(new Date(iso), now) >= 7;
  const chargedToday = (iso: string | null) => !!iso && daysBetween(new Date(iso), now) === 0;

  let list = debtors;
  if (filter === "atrasados") list = list.filter((s) => s.status === "atrasado");
  if (filter === "sem_cobranca") list = list.filter((s) => notChargedRecently(s.student.lastChargedAt));
  if (grade !== "todas") list = list.filter((s) => s.student.grade === grade);

  const total = list.reduce((a, s) => a + s.balance, 0);
  const allTotal = debtors.reduce((a, s) => a + s.balance, 0);
  const doneToday = debtors.filter((s) => chargedToday(s.student.lastChargedAt)).length;

  const copyList = async () => {
    const text =
      `Fiados em aberto — ${data.settings.shopName}, ${now.toLocaleDateString("pt-BR")}\n\n` +
      list.map((s) => `${s.student.name}${s.student.grade ? ` (${s.student.grade})` : ""}: ${money(s.balance)}`).join("\n") +
      `\n\nTotal: ${money(total)}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="animate-in">
      <PageHeader
        title="Cobranças"
        subtitle={
          debtors.length ? (
            <>
              <span className="tabular text-debt">{money(allTotal)}</span> com {debtors.length} {debtors.length === 1 ? "aluno" : "alunos"}.
              {" "}
              {doneToday > 0 ? `${doneToday} já cobrados hoje.` : "Os mais antigos aparecem primeiro."}
            </>
          ) : (
            "Ninguém devendo."
          )
        }
        actions={
          <>
            <button className="btn btn-secondary" onClick={copyList} disabled={!list.length}>
              {copied ? "Copiado" : "Copiar lista"}
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()} disabled={!list.length}>
              Imprimir
            </button>
          </>
        }
      />

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div className="tabs flex-1">
          <button className="tab" data-active={filter === "todos"} onClick={() => setFilter("todos")}>
            Todos <span className="count">{debtors.length}</span>
          </button>
          <button className="tab" data-active={filter === "atrasados"} onClick={() => setFilter("atrasados")}>
            Há mais de {data.settings.overdueDays} dias <span className="count">{debtors.filter((s) => s.status === "atrasado").length}</span>
          </button>
          <button className="tab" data-active={filter === "sem_cobranca"} onClick={() => setFilter("sem_cobranca")}>
            Sem cobrança na semana{" "}
            <span className="count">{debtors.filter((s) => notChargedRecently(s.student.lastChargedAt)).length}</span>
          </button>
        </div>
        {grades.length > 1 && (
          <select className="input mb-2 h-8 w-auto text-[13px]" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="todas">Todas as turmas</option>
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={debtors.length ? "Ninguém nesta aba." : "Nenhum fiado em aberto."}
          text={debtors.length ? "Troque a aba para ver os outros." : "Todo mundo pagou. Bom descanso."}
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-ink-3">
              <th className="py-2.5 pr-3 font-normal">Aluno</th>
              <th className="hidden py-2.5 pr-3 font-normal md:table-cell">Em aberto</th>
              <th className="hidden py-2.5 pr-3 font-normal lg:table-cell">Última cobrança</th>
              <th className="py-2.5 pr-3 text-right font-normal">Deve</th>
              <th className="no-print w-0" />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const today = chargedToday(s.student.lastChargedAt);
              return (
                <tr key={s.student.id} className="border-b border-line">
                  <td className="py-3 pr-3">
                    <Link href={`/alunos/${s.student.id}`} className="hover:underline">
                      {s.student.name}
                    </Link>
                    <div className="text-[12.5px] text-ink-3">
                      {[s.student.grade, s.student.guardianName].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="hidden py-3 pr-3 md:table-cell">
                    <StatusText status={s.status} days={s.daysOpen} />
                    <div className="text-[12.5px] text-ink-3">
                      desde {s.oldestOpenDate ? dateShort(s.oldestOpenDate) : "—"} · {s.openPurchases.length}{" "}
                      {s.openPurchases.length === 1 ? "lanche" : "lanches"}
                    </div>
                  </td>
                  <td className={cx("hidden py-3 pr-3 text-[13px] lg:table-cell", today ? "text-paid" : "text-ink-3")}>
                    {today ? "cobrado hoje" : relativeDays(s.student.lastChargedAt)}
                  </td>
                  <td className="figure py-3 pr-3 text-right text-[18px] whitespace-nowrap text-debt">{moneyPlain(s.balance)}</td>
                  <td className="no-print py-3 whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn btn-ghost btn-sm" onClick={() => openPayment(s.student.id)}>
                        Recebi
                      </button>
                      <button className={cx("btn btn-sm", today ? "btn-secondary" : "btn-primary")} onClick={() => openCharge(s.student.id)}>
                        Cobrar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-[13px] text-ink-3">
              <td className="pt-3" colSpan={2}>
                {list.length} {list.length === 1 ? "aluno" : "alunos"}
              </td>
              <td className="hidden lg:table-cell" />
              <td className="pt-3 pr-3 text-right">
                total <span className="tabular text-ink">{money(total)}</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
