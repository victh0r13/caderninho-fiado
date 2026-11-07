import Link from "next/link";
import { readDb } from "@/lib/db";
import { dashboardStats, describeItems, summarizeAll, sortByDate } from "@/lib/calc";
import { dayLabel, money, moneyPlain, relativeDays, time } from "@/lib/format";
import { METHOD_LABEL } from "@/lib/types";
import { StatusText } from "@/components/ui";
import { ChargeButton, PaymentButton, SaleButton, StudentButton } from "@/components/Buttons";
import { SampleDataButton } from "@/components/SampleDataButton";

export const metadata = { title: "Hoje" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function Dashboard() {
  const db = await readDb();
  const summaries = summarizeAll(db);
  const stats = dashboardStats(db, summaries);
  const names = new Map(db.students.map((s) => [s.id, s.name]));
  const recent = sortByDate(db.transactions, "desc").slice(0, 8);
  const toCharge = summaries
    .filter((s) => s.balance > 0 && !s.student.archived)
    .sort((a, b) => b.daysOpen - a.daysOpen || b.balance - a.balance)
    .slice(0, 7);
  const todayRaw = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const owner = db.settings.ownerName.trim().split(" ")[0];
  const hello = `${greeting()}${owner ? `, ${owner}` : ""}.`;

  if (db.students.length === 0) {
    return (
      <div className="max-w-2xl animate-in">
        <p className="text-[13px] text-ink-3">{today}</p>
        <h1 className="mt-1 font-serif text-[40px] leading-tight">{hello}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          O caderninho está em branco. São três passos para começar — e dá para fazer o segundo na hora do primeiro fiado.
        </p>
        <ol className="mt-10 border-t border-line">
          {[
            {
              title: "Ajuste os dados da cantina",
              text: "Nome da cantina, seu nome e a chave Pix — ela gera o QR Code das cobranças.",
              action: (
                <Link href="/configuracoes" className="btn btn-secondary btn-sm">
                  Abrir ajustes
                </Link>
              ),
            },
            {
              title: "Cadastre os alunos",
              text: "Nome, turma e o WhatsApp de quem paga.",
              action: <StudentButton className="btn-secondary btn-sm">Novo aluno</StudentButton>,
            },
            {
              title: "Anote o primeiro fiado",
              text: "Aperte F em qualquer tela, escolha o aluno e toque nos lanches.",
              action: <SaleButton className="btn-primary btn-sm">Anotar fiado</SaleButton>,
            },
          ].map((step, i) => (
            <li key={step.title} className="flex items-start gap-6 border-b border-line py-6">
              <span className="figure w-6 text-[28px] leading-none text-ink-3">{i + 1}</span>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1 text-[13.5px] text-ink-3">{step.text}</p>
              </div>
              <div className="pt-0.5">{step.action}</div>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex items-center gap-4 text-[13.5px] text-ink-2">
          <span>Quer ver como fica antes?</span>
          <SampleDataButton />
        </div>
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.daily.map((d) => Math.max(d.sold, d.received)));

  return (
    <div className="animate-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-ink-3">{today}</p>
          <h1 className="mt-1 font-serif text-[40px] leading-tight">{hello}</h1>
        </div>
        <div className="flex gap-2 md:hidden">
          <PaymentButton className="btn-secondary">Receber</PaymentButton>
          <SaleButton className="btn-primary">Anotar fiado</SaleButton>
        </div>
      </div>

      {/* Números do dia */}
      <div className="mt-8 grid grid-cols-2 border-y border-line lg:grid-cols-4">
        <Figure label="A receber" value={stats.receivable} tone="debt" note={`${stats.debtors} ${stats.debtors === 1 ? "aluno deve" : "alunos devem"}`} />
        <Figure
          label={`Há mais de ${db.settings.overdueDays} dias`}
          count={stats.overdue}
          note={
            stats.overdue ? (
              <Link href="/cobrancas" className="underline underline-offset-2 hover:text-ink">
                ver cobranças
              </Link>
            ) : (
              "ninguém atrasado"
            )
          }
        />
        <Figure label="Recebido no mês" value={stats.receivedMonth} tone="paid" note={`hoje ${money(stats.receivedToday)}`} />
        <Figure label="Fiado no mês" value={stats.soldMonth} note={`hoje ${money(stats.soldToday)}`} />
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-serif text-[22px]">Cobrar primeiro</h2>
            <Link href="/cobrancas" className="text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink">
              todas as cobranças
            </Link>
          </div>
          {toCharge.length === 0 ? (
            <p className="border-t border-line py-6 text-[14px] text-ink-3">Ninguém devendo. Tudo em dia.</p>
          ) : (
            <table className="w-full border-t border-line text-[14px]">
              <tbody>
                {toCharge.map((s) => (
                  <tr key={s.student.id} className="group border-b border-line">
                    <td className="py-3 pr-3">
                      <Link href={`/alunos/${s.student.id}`} className="hover:underline">
                        {s.student.name}
                      </Link>
                      <span className="ml-2 text-[12.5px] text-ink-3">{s.student.grade}</span>
                    </td>
                    <td className="hidden py-3 pr-3 sm:table-cell">
                      <StatusText status={s.status} days={s.daysOpen} />
                    </td>
                    <td className="hidden py-3 pr-3 text-[12.5px] text-ink-3 md:table-cell">cobrado {relativeDays(s.student.lastChargedAt)}</td>
                    <td className="tabular py-3 pr-3 text-right text-debt">{money(s.balance)}</td>
                    <td className="w-16 py-3 text-right">
                      <ChargeButton studentId={s.student.id} className="btn-secondary btn-sm">
                        Cobrar
                      </ChargeButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="mb-1 font-serif text-[22px]">Mais pedidos no mês</h2>
          {stats.topProducts.length === 0 ? (
            <p className="border-t border-line py-6 text-[14px] text-ink-3">Nenhum lanche anotado este mês.</p>
          ) : (
            <ol className="border-t border-line pt-2">
              {stats.topProducts.map((p) => (
                <li key={p.name} className="flex items-baseline py-1.5 text-[14px]">
                  <span>{p.name}</span>
                  <span className="leader" />
                  <span className="tabular text-ink-2">{p.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="mt-14">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-[22px]">Últimos 14 dias</h2>
          <div className="flex items-center gap-4 text-[12.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-ink-3" /> fiado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-paid" /> recebido
            </span>
          </div>
        </div>
        <div className="flex h-40 items-end gap-2 border-b border-line-strong">
          {stats.daily.map((d) => {
            const date = new Date(d.date);
            return (
              <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center gap-[2px]">
                <div className="w-full max-w-[10px] bg-ink-3/70 group-hover:bg-ink-2" style={{ height: `${(d.sold / maxDay) * 100}%` }} />
                <div className="w-full max-w-[10px] bg-paid/80 group-hover:bg-paid" style={{ height: `${(d.received / maxDay) * 100}%` }} />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-[12px] whitespace-nowrap text-paper group-hover:block">
                  <div className="font-medium">{date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</div>
                  <div className="tabular">fiado {money(d.sold)}</div>
                  <div className="tabular">recebido {money(d.received)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-2">
          {stats.daily.map((d) => {
            const date = new Date(d.date);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <div key={d.date} className={`tabular flex-1 text-center text-[11px] ${weekend ? "text-line-strong" : "text-ink-3"}`}>
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-serif text-[22px]">Últimos lançamentos</h2>
          <Link href="/historico" className="text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink">
            histórico completo
          </Link>
        </div>
        <table className="w-full border-t border-line text-[14px]">
          <tbody>
            {recent.map((tx) => (
              <tr key={tx.id} className="border-b border-line">
                <td className="tabular w-28 py-2.5 pr-3 text-[12.5px] whitespace-nowrap text-ink-3">
                  {dayLabel(tx.createdAt).split(",")[0]} {time(tx.createdAt)}
                </td>
                <td className="py-2.5 pr-3">
                  <Link href={`/alunos/${tx.studentId}`} className="hover:underline">
                    {names.get(tx.studentId) ?? "Aluno removido"}
                  </Link>
                </td>
                <td className="hidden max-w-0 truncate py-2.5 pr-3 text-ink-3 sm:table-cell sm:w-[45%]">
                  {tx.type === "compra" ? describeItems(tx) : `pagou · ${METHOD_LABEL[tx.method ?? "outro"].toLowerCase()}`}
                </td>
                <td className={`tabular py-2.5 text-right whitespace-nowrap ${tx.type === "pagamento" ? "text-paid" : ""}`}>
                  {tx.type === "pagamento" ? "− " : "+ "}
                  {moneyPlain(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Figure({
  label,
  value,
  count,
  note,
  tone,
}: {
  label: string;
  value?: number;
  count?: number;
  note: React.ReactNode;
  tone?: "debt" | "paid";
}) {
  const color = tone === "debt" ? "text-debt" : tone === "paid" ? "text-paid" : "text-ink";
  return (
    <div className="border-line py-5 pr-4 even:border-l even:pl-5 lg:border-l lg:pl-5 lg:first:border-l-0 lg:first:pl-0 [&:nth-child(3)]:border-t lg:[&:nth-child(3)]:border-t-0 [&:nth-child(4)]:border-t lg:[&:nth-child(4)]:border-t-0">
      <div className="text-[12.5px] text-ink-3">{label}</div>
      <div className={`figure mt-1 text-[34px] leading-none ${color}`}>
        {value !== undefined ? (
          <>
            <span className="text-[17px] text-ink-3">R$ </span>
            {moneyPlain(value)}
          </>
        ) : (
          count
        )}
      </div>
      <div className="mt-2 text-[12.5px] text-ink-3">{note}</div>
    </div>
  );
}
