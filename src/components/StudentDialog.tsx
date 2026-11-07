"use client";

import { useState, useTransition } from "react";
import { saveStudent } from "@/app/actions";
import { money } from "@/lib/format";
import { useApp } from "./AppShell";
import { Modal, MoneyInput, useToast } from "./ui";

export function StudentDialog(props: {
  open: boolean;
  studentId: string | null;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  if (!props.open) return null;
  return <Inner {...props} />;
}

function Inner({
  studentId,
  onClose,
  onCreated,
}: {
  studentId: string | null;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { data } = useApp();
  const toast = useToast();
  const existing = data.summaries.find((s) => s.student.id === studentId)?.student;
  const [name, setName] = useState(existing?.name ?? "");
  const [grade, setGrade] = useState(existing?.grade ?? "");
  const [guardianName, setGuardian] = useState(existing?.guardianName ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [customLimit, setCustomLimit] = useState(existing?.creditLimit !== null && existing?.creditLimit !== undefined);
  const [limit, setLimit] = useState(existing?.creditLimit ?? data.settings.defaultCreditLimit);
  const [blocked, setBlocked] = useState(existing?.blocked ?? false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const grades = Array.from(new Set(data.summaries.map((s) => s.student.grade).filter(Boolean))).sort();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    start(async () => {
      try {
        const res = await saveStudent(studentId, {
          name,
          grade,
          guardianName,
          phone,
          notes,
          creditLimit: customLimit ? limit : null,
          blocked,
        });
        toast({ kind: "success", text: studentId ? "Dados atualizados" : `${name} cadastrado(a)!` });
        onClose();
        if (!studentId) onCreated?.(res.id);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={studentId ? "Editar aluno" : "Novo aluno"}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending || !name.trim()} onClick={() => submit()}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome do aluno *</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ana Clara Souza" />
        </div>
        <div>
          <label className="label">Turma / série</label>
          <input className="input" list="turmas" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Ex.: 5º A" />
          <datalist id="turmas">
            {grades.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Responsável</label>
          <input className="input" value={guardianName} onChange={(e) => setGuardian(e.target.value)} placeholder="Ex.: Mariana (mãe)" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">WhatsApp do responsável</label>
          <input
            className="input"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 98765-4321"
          />
          <p className="hint">Usado para mandar a cobrança pronta pelo WhatsApp com 1 clique.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observações</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: alergia a amendoim, só pode refrigerante às sextas…"
          />
          <p className="hint">Aparece em destaque toda vez que for anotar um fiado para este aluno.</p>
        </div>
        <div className="space-y-3 border-t border-line pt-4 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-[var(--ink)]" checked={customLimit} onChange={(e) => setCustomLimit(e.target.checked)} />
            Limite de fiado personalizado
            {!customLimit && (
              <span className="text-ink-3">
                (usando o padrão: {data.settings.defaultCreditLimit ? money(data.settings.defaultCreditLimit) : "sem limite"})
              </span>
            )}
          </label>
          {customLimit && (
            <div className="mt-3 max-w-xs">
              <MoneyInput value={limit} onChange={setLimit} placeholder="0,00 = sem limite" />
              <p className="hint">Deixe 0 para não ter limite.</p>
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-[var(--debt)]" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />
            Bloquear novos fiados para este aluno
          </label>
        </div>
        {error && <div className="text-sm font-medium text-debt sm:col-span-2">{error}</div>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
