"use client";

import { useState, useTransition } from "react";
import { addPayment, deleteTransaction } from "@/app/actions";
import { money, toDateInput } from "@/lib/format";
import { METHOD_LABEL, type PaymentMethod } from "@/lib/types";
import { useApp } from "./AppShell";
import { StudentPicker } from "./StudentPicker";
import { BalanceText, Modal, MoneyInput, cx, useToast } from "./ui";

const METHODS: PaymentMethod[] = ["dinheiro", "pix", "cartao", "desconto", "outro"];

export function PaymentDialog(props: {
  open: boolean;
  initialStudentId?: string;
  initialAmount?: number;
  onClose: () => void;
}) {
  if (!props.open) return null;
  return <Inner {...props} />;
}

function Inner({
  initialStudentId,
  initialAmount,
  onClose,
}: {
  initialStudentId?: string;
  initialAmount?: number;
  onClose: () => void;
}) {
  const { data } = useApp();
  const toast = useToast();
  const [studentId, setStudentId] = useState(initialStudentId);
  const summary = data.summaries.find((s) => s.student.id === studentId);
  const [amount, setAmount] = useState(initialAmount ?? Math.max(0, summary?.balance ?? 0));
  const [method, setMethod] = useState<PaymentMethod>("dinheiro");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [showDate, setShowDate] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  if (!summary) {
    return (
      <Modal open onClose={onClose} title="Receber pagamento" subtitle="Quem está pagando?">
        <StudentPicker
          sortDebtorsFirst
          summaries={data.summaries}
          onPick={(s) => {
            setStudentId(s.student.id);
            setAmount(Math.max(0, s.balance));
          }}
        />
      </Modal>
    );
  }

  const after = summary.balance - amount;
  const submit = () => {
    if (amount <= 0 || pending) return;
    setError("");
    start(async () => {
      try {
        const res = await addPayment({ studentId: summary.student.id, amount, method, note, date });
        toast({
          kind: "success",
          text: `${money(amount)} recebido de ${summary.student.name.split(" ")[0]}${after <= 0 ? ". Quitado." : "."}`,
          action: {
            label: "Desfazer",
            onClick: async () => {
              await deleteTransaction(res.id);
              toast({ kind: "info", text: "Pagamento desfeito." });
            },
          },
        });
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const presets = [
    summary.balance > 0 && { label: "Tudo", v: summary.balance },
    summary.balance > 1000 && { label: "Metade", v: Math.round(summary.balance / 2) },
    { label: "R$ 10", v: 1000 },
    { label: "R$ 20", v: 2000 },
    { label: "R$ 50", v: 5000 },
  ].filter(Boolean) as { label: string; v: number }[];

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-baseline gap-2">
          Pagamento de {summary.student.name}
          {!initialStudentId && (
            <button className="text-[12.5px] font-normal text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => setStudentId(undefined)}>
              trocar
            </button>
          )}
        </span>
      }
      subtitle={
        <>
          Deve hoje <BalanceText cents={summary.balance} />
        </>
      }
      footer={
        <div className="flex items-center gap-3">
          <div className="mr-auto">
            <div className="text-[12px] text-ink-3">{after < 0 ? "Fica de crédito" : "Fica devendo"}</div>
            <div className="figure text-[18px] leading-tight">
              <BalanceText cents={after} />
            </div>
          </div>
          <button className="btn btn-secondary btn-lg" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-paid btn-lg" disabled={amount <= 0 || pending} onClick={submit}>
            {pending ? "Salvando…" : `Receber ${money(amount)}`}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="label">Valor recebido</label>
          <MoneyInput value={amount} onChange={setAmount} autoFocus onEnter={submit} inputClassName="figure h-14 text-[26px]" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                className={cx("btn btn-sm", amount === p.v ? "btn-primary" : "btn-secondary")}
                onClick={() => setAmount(p.v)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Forma de pagamento</label>
          <div className="flex overflow-hidden rounded-md border border-line-strong">
            {METHODS.map((id, i) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={cx(
                  "h-9 flex-1 text-[13px] transition-colors",
                  i > 0 && "border-l border-line-strong",
                  method === id ? "bg-ink font-medium text-paper" : "bg-surface text-ink-2 hover:bg-sunken",
                )}
              >
                {id === "desconto" ? "Desconto" : METHOD_LABEL[id]}
              </button>
            ))}
          </div>
          {method === "desconto" && (
            <p className="hint">Abate a dívida sem entrar dinheiro. Não conta como recebido nos relatórios.</p>
          )}
        </div>

        <div>
          <label className="label">Observação</label>
          <input className="input" placeholder="Opcional — ex.: pago pela avó" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="text-[12.5px]">
          {showDate ? (
            <label className="flex items-center gap-2 text-ink-2">
              Data do pagamento
              <input type="date" className="input h-8 w-auto" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} />
            </label>
          ) : (
            <button className="text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => setShowDate(true)}>
              Recebeu em outro dia?
            </button>
          )}
        </div>
        {error && <p className="text-[13px] text-debt">{error}</p>}
      </div>
    </Modal>
  );
}
