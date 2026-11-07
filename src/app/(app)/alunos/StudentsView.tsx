"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useApp } from "@/components/AppShell";
import { BalanceText, EmptyState, PageHeader, StatusText, cx } from "@/components/ui";
import { money, normalize, relativeDays } from "@/lib/format";

type Filter = "todos" | "devendo" | "atrasado" | "em_dia" | "bloqueados" | "arquivados";
type Sort = "nome" | "saldo" | "atraso" | "recente";

export function StudentsView() {
  const { data, openStudent, openSale, openPayment, openCharge } = useApp();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("todas");
  const [filter, setFilter] = useState<Filter>("todos");
  const [sort, setSort] = useState<Sort>("nome");

  const grades = useMemo(
    () =>
      Array.from(new Set(data.summaries.map((s) => s.student.grade).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true }),
      ),
    [data.summaries],
  );

  const list = useMemo(() => {
    const nq = normalize(q);
    let l = data.summaries.filter((s) => (filter === "arquivados" ? s.student.archived : !s.student.archived));
    if (nq) l = l.filter((s) => normalize(`${s.student.name} ${s.student.guardianName} ${s.student.grade}`).includes(nq));
    if (grade !== "todas") l = l.filter((s) => s.student.grade === grade);
    if (filter === "devendo") l = l.filter((s) => s.balance > 0);
    if (filter === "atrasado") l = l.filter((s) => s.status === "atrasado");
    if (filter === "em_dia") l = l.filter((s) => s.balance <= 0);
    if (filter === "bloqueados") l = l.filter((s) => s.student.blocked);
    const byName = (a: (typeof l)[0], b: (typeof l)[0]) => a.student.name.localeCompare(b.student.name, "pt-BR");
    return [...l].sort((a, b) => {
      if (sort === "saldo") return b.balance - a.balance || byName(a, b);
      if (sort === "atraso") return b.daysOpen - a.daysOpen || byName(a, b);
      if (sort === "recente") return (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "") || byName(a, b);
      return byName(a, b);
    });
  }, [data.summaries, q, grade, filter, sort]);

  const total = list.reduce((a, s) => a + Math.max(0, s.balance), 0);
  const active = data.summaries.filter((s) => !s.student.archived);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: active.length },
    { id: "devendo", label: "Devendo", count: active.filter((s) => s.balance > 0).length },
    { id: "atrasado", label: "Atrasados", count: active.filter((s) => s.status === "atrasado").length },
    { id: "em_dia", label: "Em dia", count: active.filter((s) => s.balance <= 0).length },
    { id: "bloqueados", label: "Bloqueados", count: active.filter((s) => s.student.blocked).length },
    { id: "arquivados", label: "Arquivados", count: data.summaries.filter((s) => s.student.archived).length },
  ];

  return (
    <div className="animate-in">
      <PageHeader
        title="Alunos"
        subtitle={`${active.length} no caderno`}
        actions={
          <button className="btn btn-primary" onClick={() => openStudent(null)}>
            Novo aluno
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input className="input pl-9" placeholder="Buscar aluno, responsável ou turma" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="todas">Todas as turmas</option>
          {grades.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="nome">Ordem alfabética</option>
          <option value="saldo">Quem deve mais</option>
          <option value="atraso">Mais tempo em aberto</option>
          <option value="recente">Comprou por último</option>
        </select>
      </div>

      <div className="tabs">
        {filters.map((f) => (
          <button key={f.id} className="tab" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} <span className="count">{f.count}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={data.summaries.length ? "Ninguém com esses filtros." : "Nenhum aluno ainda."}
          text={data.summaries.length ? "Tente limpar a busca ou trocar a aba." : "Cadastre o primeiro aluno para começar a anotar."}
          action={
            !data.summaries.length && (
              <button className="btn btn-primary" onClick={() => openStudent(null)}>
                Cadastrar aluno
              </button>
            )
          }
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-ink-3">
              <th className="py-2.5 pr-3 font-normal">Aluno</th>
              <th className="hidden py-2.5 pr-3 font-normal md:table-cell">Situação</th>
              <th className="hidden py-2.5 pr-3 font-normal lg:table-cell">Último lanche</th>
              <th className="py-2.5 pr-3 text-right font-normal">Saldo</th>
              <th className="no-print w-0 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const usage = s.limit > 0 ? Math.min(100, (Math.max(0, s.balance) / s.limit) * 100) : 0;
              return (
                <tr key={s.student.id} className="group border-b border-line hover:bg-surface">
                  <td className="py-3 pr-3">
                    <Link href={`/alunos/${s.student.id}`} className={cx("hover:underline", (s.student.blocked || s.student.archived) && "text-ink-3")}>
                      {s.student.name}
                    </Link>
                    {s.student.blocked && <span className="ml-2 text-[12px] text-debt">bloqueado</span>}
                    <div className="text-[12.5px] text-ink-3">
                      {[s.student.grade, s.student.guardianName].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="hidden py-3 pr-3 md:table-cell">
                    <StatusText status={s.status} days={s.balance > 0 ? s.daysOpen : undefined} />
                  </td>
                  <td className="hidden py-3 pr-3 text-[13px] text-ink-3 lg:table-cell">{relativeDays(s.lastPurchaseAt)}</td>
                  <td className="py-3 pr-3 text-right">
                    <BalanceText cents={s.balance} />
                    {s.limit > 0 && s.balance > 0 && (
                      <div className="mt-1.5 ml-auto h-[3px] w-16 bg-sunken" title={`Limite ${money(s.limit)}`}>
                        <div className={cx("h-full", usage >= 100 ? "bg-debt" : usage > 70 ? "bg-warn" : "bg-ink-3")} style={{ width: `${usage}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="no-print py-3 whitespace-nowrap">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button className="btn btn-ghost btn-sm" onClick={() => openSale(s.student.id)}>
                        Fiado
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openPayment(s.student.id)}>
                        Receber
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={s.balance <= 0} onClick={() => openCharge(s.student.id)}>
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
                em aberto <span className="tabular text-ink">{money(total)}</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
