"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteStudent, deleteTransaction, setStudentFlags } from "@/app/actions";
import { useApp } from "@/components/AppShell";
import { BalanceText, EmptyState, StatusText, cx, useConfirm, useToast } from "@/components/ui";
import { describeItems } from "@/lib/calc";
import { dateFull, dateShort, dayLabel, formatPhone, money, moneyPlain, relativeDays, time } from "@/lib/format";
import { METHOD_LABEL, type ChargeLog, type Transaction } from "@/lib/types";

export function StudentDetail({
  studentId,
  transactions,
  charges,
}: {
  studentId: string;
  transactions: Transaction[];
  charges: ChargeLog[];
}) {
  const { data, openSale, openPayment, openCharge, openStudent } = useApp();
  const summary = data.summaries.find((s) => s.student.id === studentId);
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [, start] = useTransition();

  const groups = useMemo(() => {
    let running = 0;
    const withBalance = transactions.map((tx) => {
      running += tx.type === "compra" ? tx.amount : -tx.amount;
      return { tx, after: running };
    });
    const out: { label: string; key: string; rows: typeof withBalance }[] = [];
    for (const row of withBalance.reverse()) {
      const key = new Date(row.tx.createdAt).toDateString();
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, label: dayLabel(row.tx.createdAt), rows: [row] });
    }
    return out;
  }, [transactions]);

  if (!summary) return null;
  const s = summary.student;
  const openIds = new Map(summary.openPurchases.map((o) => [o.tx.id, o.remaining]));
  const usage = summary.limit > 0 ? Math.min(100, (Math.max(0, summary.balance) / summary.limit) * 100) : 0;

  const removeTx = async (tx: Transaction) => {
    const ok = await confirm({
      title: tx.type === "compra" ? "Apagar este fiado?" : "Apagar este pagamento?",
      message: (
        <>
          {describeItems(tx)}, {money(tx.amount)}, em {dateFull(tx.createdAt)}. O saldo é recalculado na hora.
        </>
      ),
      confirmLabel: "Apagar",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await deleteTransaction(tx.id);
      toast({ kind: "info", text: "Lançamento apagado." });
    });
  };

  const toggle = (flag: "blocked" | "archived") =>
    start(async () => {
      setMenu(false);
      await setStudentFlags(s.id, { [flag]: !s[flag] });
      toast({
        kind: "success",
        text:
          flag === "blocked"
            ? s.blocked
              ? "Fiado liberado."
              : "Fiado bloqueado para este aluno."
            : s.archived
              ? "Aluno de volta à lista."
              : "Aluno arquivado.",
      });
    });

  const remove = async () => {
    setMenu(false);
    const ok = await confirm({
      title: `Excluir ${s.name}?`,
      message: "Todo o histórico deste aluno some para sempre. Se ele só saiu da escola, é melhor arquivar.",
      confirmLabel: "Excluir",
      danger: true,
      requireText: "EXCLUIR",
    });
    if (!ok) return;
    await deleteStudent(s.id);
    toast({ kind: "info", text: "Aluno excluído." });
    router.push("/alunos");
  };

  return (
    <div className="animate-in">
      <Link href="/alunos" className="no-print inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft size={14} strokeWidth={1.75} /> Alunos
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className={cx("h-page text-[34px]", (s.blocked || s.archived) && "text-ink-2")}>{s.name}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            {[
              s.grade || "sem turma",
              s.guardianName && `responsável ${s.guardianName}`,
              s.phone && formatPhone(s.phone),
            ]
              .filter(Boolean)
              .join(" · ")}
            {s.blocked && <span className="text-debt"> · fiado bloqueado</span>}
            {s.archived && <span> · arquivado</span>}
          </p>
          {s.notes && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-warn-soft px-3.5 py-1.5 text-[13px] text-warn"><span className="h-1.5 w-1.5 rounded-full bg-warn" />{s.notes}</p>}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => openSale(s.id)}>
            Anotar fiado
          </button>
          <button className="btn btn-secondary" onClick={() => openPayment(s.id)}>
            Receber
          </button>
          {summary.balance > 0 && (
            <button className="btn btn-secondary" onClick={() => openCharge(s.id)}>
              Cobrar
            </button>
          )}
          <div className="relative">
            <button className="btn btn-secondary btn-icon" onClick={() => setMenu((m) => !m)} aria-label="Mais opções">
              <MoreHorizontal size={17} strokeWidth={1.75} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 animate-in rounded-2xl border border-line bg-card p-1.5 shadow-2xl">
                  <MenuItem onClick={() => (setMenu(false), openStudent(s.id))}>Editar dados</MenuItem>
                  <MenuItem onClick={() => (setMenu(false), setTimeout(() => window.print(), 50))}>Imprimir extrato</MenuItem>
                  <MenuItem onClick={() => toggle("blocked")}>{s.blocked ? "Liberar fiado" : "Bloquear fiado"}</MenuItem>
                  <MenuItem onClick={() => toggle("archived")}>{s.archived ? "Tirar do arquivo" : "Arquivar (saiu da escola)"}</MenuItem>
                  <div className="my-1 border-t border-line" />
                  <MenuItem onClick={remove} danger>
                    Excluir aluno
                  </MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Fact label={summary.balance < 0 ? "Crédito" : "Deve"}>
          <span className="figure text-[32px] leading-none">
            <BalanceText cents={summary.balance} />
          </span>
        </Fact>
        <Fact label="Em aberto desde">
          <span className="text-[17px]">{summary.oldestOpenDate ? dateFull(summary.oldestOpenDate) : "—"}</span>
          {summary.oldestOpenDate && (
            <div className="mt-0.5">
              <StatusText status={summary.status} days={summary.daysOpen} />
            </div>
          )}
        </Fact>
        <Fact label="Limite">
          {summary.limit > 0 ? (
            <>
              <span className="tabular text-[17px]">{money(summary.limit)}</span>
              <div className="mt-2 h-[3px] w-full max-w-36 bg-sunken">
                <div className={cx("h-full", usage >= 100 ? "bg-debt" : usage > 70 ? "bg-warn" : "bg-ink-3")} style={{ width: `${usage}%` }} />
              </div>
            </>
          ) : (
            <span className="text-[17px]">sem limite</span>
          )}
        </Fact>
        <Fact label="Última cobrança">
          <span className="text-[17px]">{relativeDays(s.lastChargedAt)}</span>
          <div className="mt-0.5 text-[12.5px] text-ink-3">
            {charges.length} {charges.length === 1 ? "cobrança" : "cobranças"} ao todo
          </div>
        </Fact>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="panel p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="h-sec text-[16px]">Extrato</h2>
            <span className="text-[12.5px] text-ink-3">
              comprou {money(summary.totalBought)} · pagou {money(summary.totalPaid)}
            </span>
          </div>
          {groups.length === 0 ? (
            <div className="border-t border-line">
              <EmptyState title="Nada anotado ainda." text="Os fiados e pagamentos deste aluno aparecem aqui." />
            </div>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-y border-line text-left text-[12px] text-ink-3">
                  <th className="py-2 pr-3 font-normal">Lançamento</th>
                  <th className="py-2 pr-3 text-right font-normal">Valor</th>
                  <th className="py-2 pr-3 text-right font-normal">Saldo</th>
                  <th className="no-print w-8" />
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.key}>
                  <tr>
                    <td colSpan={4} className="pt-4 pb-1 text-[12px] font-medium text-ink-3">
                      {g.label}
                    </td>
                  </tr>
                  {g.rows.map(({ tx, after }) => {
                    const remaining = openIds.get(tx.id);
                    return (
                      <tr key={tx.id} className="group border-b border-line">
                        <td className="py-2.5 pr-3">
                          <div>{tx.type === "compra" ? describeItems(tx) : `Pagamento em ${METHOD_LABEL[tx.method ?? "outro"].toLowerCase()}`}</div>
                          <div className="text-[12px] text-ink-3">
                            {time(tx.createdAt)}
                            {tx.note && (tx.type === "pagamento" || tx.items.length > 0) && ` · ${tx.note}`}
                            {tx.type === "compra" && remaining === undefined && " · pago"}
                            {remaining !== undefined && remaining < tx.amount && <span className="text-warn"> · faltam {money(remaining)}</span>}
                          </div>
                        </td>
                        <td className={cx("tabular py-2.5 pr-3 text-right whitespace-nowrap", tx.type === "pagamento" && "text-paid")}>
                          {tx.type === "compra" ? "+ " : "− "}
                          {moneyPlain(tx.amount)}
                        </td>
                        <td className="tabular py-2.5 pr-3 text-right whitespace-nowrap text-ink-3">{moneyPlain(after)}</td>
                        <td className="no-print py-2.5 text-right">
                          <button
                            className="btn btn-ghost h-7 w-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-debt"
                            title="Apagar lançamento"
                            onClick={() => removeTx(tx)}
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          )}
        </section>

        <aside className="space-y-6">
          <section className="panel p-5">
            <h2 className="mb-3 h-sec text-[16px]">Em aberto</h2>
            {summary.openPurchases.length === 0 ? (
              <p className="border-t border-line pt-3 text-[13.5px] text-ink-3">Nada. Está tudo pago.</p>
            ) : (
              <ol className="border-t border-line pt-1">
                {summary.openPurchases.map((o) => (
                  <li key={o.tx.id} className="flex items-baseline py-1.5 text-[13.5px]">
                    <span className="tabular w-12 shrink-0 text-[12px] text-ink-3">{dateShort(o.tx.createdAt)}</span>
                    <span className="truncate">{describeItems(o.tx)}</span>
                    <span className="leader" />
                    <span className="tabular">{moneyPlain(o.remaining)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="mb-3 h-sec text-[16px]">Cobranças</h2>
            {charges.length === 0 ? (
              <p className="border-t border-line pt-3 text-[13.5px] text-ink-3">Nenhuma cobrança registrada.</p>
            ) : (
              <ol className="border-t border-line pt-1">
                {charges.slice(0, 10).map((c) => (
                  <li key={c.id} className="flex items-baseline py-1.5 text-[13.5px]">
                    <span className="tabular w-[84px] shrink-0 text-[12px] text-ink-3">{dateFull(c.createdAt)}</span>
                    <span>{c.channel === "whatsapp" ? "WhatsApp" : c.channel === "pessoalmente" ? "Pessoalmente" : "Outro"}</span>
                    <span className="leader" />
                    <span className="tabular text-ink-3">{moneyPlain(c.amount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="mb-2.5 text-[12.5px] text-ink-3">{label}</div>
      {children}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx("block w-full rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors hover:bg-sunken", danger && "text-debt")}
    >
      {children}
    </button>
  );
}
