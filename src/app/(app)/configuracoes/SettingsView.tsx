"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreBackup, saveSettings, wipeAll } from "@/app/actions";
import { changePin, setLockMinutes } from "@/app/auth-actions";
import { useApp } from "@/components/AppShell";
import { MoneyInput, PageHeader, useConfirm, useToast } from "@/components/ui";
import { buildChargeMessage, DEFAULT_TEMPLATE } from "@/lib/message";
import { normalizePixKey } from "@/lib/pix";
import type { Settings, StudentSummary } from "@/lib/types";

const VARS: [string, string][] = [
  ["{responsavel}", "primeiro nome do responsável"],
  ["{aluno}", "primeiro nome do aluno"],
  ["{aluno_completo}", "nome completo do aluno"],
  ["{turma}", "turma"],
  ["{valor}", "valor devido, em negrito"],
  ["{itens}", "lista do que está em aberto"],
  ["{dias}", "dias em aberto"],
  ["{pix}", "sua chave Pix"],
  ["{lanchonete}", "nome da cantina"],
  ["{atendente}", "seu nome"],
];

const SAMPLE: StudentSummary = {
  student: {
    id: "x",
    name: "Ana Clara Souza",
    grade: "5º A",
    guardianName: "Mariana",
    phone: "",
    creditLimit: null,
    notes: "",
    blocked: false,
    archived: false,
    createdAt: "",
    lastChargedAt: null,
  },
  balance: 1100,
  totalBought: 1100,
  totalPaid: 0,
  oldestOpenDate: new Date().toISOString(),
  daysOpen: 12,
  lastPurchaseAt: null,
  lastPaymentAt: null,
  limit: 0,
  overLimit: false,
  status: "devendo",
  openPurchases: [
    {
      remaining: 1100,
      tx: {
        id: "a",
        studentId: "x",
        type: "compra",
        amount: 1100,
        items: [
          { productId: null, name: "Coxinha", unitPrice: 600, qty: 1 },
          { productId: null, name: "Suco natural", unitPrice: 500, qty: 1 },
        ],
        note: "",
        createdAt: new Date().toISOString(),
      },
    },
  ],
};

export function SettingsView({
  dataFile,
  dataDir,
  lastBackup,
  backupCount,
  lockMinutes,
}: {
  dataFile: string;
  dataDir: string;
  lastBackup: string | null;
  backupCount: number;
  lockMinutes: number;
}) {
  const { data } = useApp();
  const router = useRouter();
  const [s, setS] = useState<Settings>(data.settings);
  const [pending, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const save = () =>
    start(async () => {
      await saveSettings(s);
      toast({ kind: "success", text: "Ajustes salvos." });
    });

  const insertVar = (v: string) => {
    const el = templateRef.current;
    if (!el) return set("messageTemplate", s.messageTemplate + v);
    const { selectionStart: a, selectionEnd: b } = el;
    set("messageTemplate", s.messageTemplate.slice(0, a) + v + s.messageTemplate.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + v.length, a + v.length);
    });
  };

  const sample = data.summaries.find((x) => x.balance > 0) ?? SAMPLE;

  const onRestore = async (file: File) => {
    const text = await file.text();
    const ok = await confirm({
      title: "Restaurar este backup?",
      message: (
        <>
          Os dados atuais serão substituídos pelos de <b>{file.name}</b>. A cópia automática de hoje continua guardada na pasta de backups.
        </>
      ),
      confirmLabel: "Restaurar",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await restoreBackup(text);
      toast({ kind: "success", text: `Backup restaurado: ${res.students} alunos, ${res.transactions} lançamentos.` });
    } catch (e) {
      toast({ kind: "error", text: (e as Error).message });
    }
  };

  const onWipe = async () => {
    const ok = await confirm({
      title: "Apagar todos os dados?",
      message: "Alunos, fiados, pagamentos e ajustes serão apagados. Se quiser guardar algo, baixe um backup antes.",
      confirmLabel: "Apagar tudo",
      danger: true,
      requireText: "APAGAR",
    });
    if (!ok) return;
    await wipeAll();
    toast({ kind: "info", text: "Caderninho zerado." });
  };

  const pixNormalized = s.pixKey ? normalizePixKey(s.pixKey) : "";

  return (
    <div className="animate-in pb-28">
      <PageHeader title="Ajustes" />

      <Row title="A cantina" desc="Aparecem no topo do sistema e nas mensagens de cobrança.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da cantina">
            <input className="input" value={s.shopName} onChange={(e) => set("shopName", e.target.value)} />
          </Field>
          <Field label="Seu nome">
            <input className="input" value={s.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="Para a saudação" />
          </Field>
        </div>
      </Row>

      <Row title="Pix" desc="Com a chave cadastrada, cada cobrança gera QR Code e Pix copia e cola com o valor exato.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Chave Pix" className="sm:col-span-3">
            <input className="input" value={s.pixKey} onChange={(e) => set("pixKey", e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" />
            <p className="hint">
              {s.pixKey && pixNormalized !== s.pixKey.trim() ? (
                <>
                  Vai ser usada como <span className="text-ink">{pixNormalized}</span>.
                </>
              ) : (
                "Celular: digite com DDD — o +55 entra sozinho."
              )}
            </p>
          </Field>
          <Field label="Nome do recebedor" className="sm:col-span-2">
            <input className="input" value={s.pixName} onChange={(e) => set("pixName", e.target.value)} placeholder="Como aparece no banco" />
          </Field>
          <Field label="Cidade">
            <input className="input" value={s.pixCity} onChange={(e) => set("pixCity", e.target.value)} />
          </Field>
        </div>
      </Row>

      <Row title="Regras do fiado">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Limite padrão por aluno">
            <MoneyInput value={s.defaultCreditLimit} onChange={(v) => set("defaultCreditLimit", v)} placeholder="sem limite" />
            <p className="hint">Avisa quando alguém vai passar disso. Dá para mudar aluno por aluno. Vazio = sem limite.</p>
          </Field>
          <Field label="Atrasado depois de">
            <div className="relative">
              <input type="number" min={1} className="input pr-12" value={s.overdueDays} onChange={(e) => set("overdueDays", Number(e.target.value))} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-ink-3">dias</span>
            </div>
            <p className="hint">Contando do lanche mais antigo que ainda não foi pago.</p>
          </Field>
        </div>
      </Row>

      <Row title="Mensagem de cobrança" desc="O texto que vai para o WhatsApp. Clique num campo para inserir onde está o cursor.">
        <div className="mb-2 flex flex-wrap gap-1">
          {VARS.map(([v, label]) => (
            <button key={v} className="rounded border border-line px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2 hover:border-line-strong hover:text-ink" title={label} onClick={() => insertVar(v)}>
              {v}
            </button>
          ))}
        </div>
        <textarea ref={templateRef} className="input font-mono text-[12.5px]" rows={9} value={s.messageTemplate} onChange={(e) => set("messageTemplate", e.target.value)} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <label className="flex cursor-pointer items-center gap-2 text-ink-2">
            <input type="checkbox" className="accent-[var(--ink)]" checked={s.includeItemsInMessage} onChange={(e) => set("includeItemsInMessage", e.target.checked)} />
            Listar os lanches em aberto em {"{itens}"}
          </label>
          <button className="text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => set("messageTemplate", DEFAULT_TEMPLATE)}>
            voltar ao texto original
          </button>
        </div>
        <p className="mt-5 mb-1.5 text-[12.5px] text-ink-3">Como chega para {sample === SAMPLE ? "o responsável" : sample.student.guardianName || "o responsável"}</p>
        <div className="rounded-md border border-line bg-sunken p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap">
          {buildChargeMessage(s, sample)}
        </div>
      </Row>

      <PinRow lockMinutes={lockMinutes} onSaved={() => router.refresh()} />

      <Row title="Backup e dados" desc="Tudo fica só neste Mac. Uma cópia automática é feita todo dia em que o sistema é usado.">
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-secondary" href="/api/backup">
            Baixar backup
          </a>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            Restaurar backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onRestore(f);
              e.target.value = "";
            }}
          />
          <a className="btn btn-secondary" href="/api/export?tipo=saldos">
            Planilha de saldos
          </a>
        </div>
        <dl className="mt-5 space-y-2 text-[13px]">
          <div>
            <dt className="text-ink-3">Arquivo de dados</dt>
            <dd className="font-mono text-[12px] break-all">{dataFile}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Cópias automáticas</dt>
            <dd>
              {backupCount} em <span className="font-mono text-[12px] break-all">{dataDir}/backups</span>
              {lastBackup && <span className="text-ink-3"> · a última de {lastBackup.replace("caderninho-", "").replace(".json", "").split("-").reverse().join("/")}</span>}
            </dd>
          </div>
        </dl>
        <p className="hint mt-4">De vez em quando, baixe um backup e guarde no iCloud Drive.</p>
      </Row>

      <Row title="Atalhos">
        <dl className="grid gap-x-10 gap-y-1.5 text-[13.5px] sm:grid-cols-2">
          {[
            ["Anotar fiado", "F"],
            ["Receber", "R"],
            ["Buscar aluno", "⌘K"],
            ["Salvar o fiado", "⌘ Enter"],
            ["Fechar janela", "Esc"],
            ["Tirar uma unidade", "clique direito"],
          ].map(([d, k]) => (
            <div key={d} className="flex items-baseline">
              <dt>{d}</dt>
              <span className="leader" />
              <dd className="text-ink-3">{k}</dd>
            </div>
          ))}
        </dl>
      </Row>

      <Row title="Zerar o caderninho" desc="Apaga alunos, fiados e pagamentos. Não dá para desfazer.">
        <button className="btn btn-secondary text-debt" onClick={onWipe}>
          Apagar todos os dados
        </button>
      </Row>

      {dirty && (
        <div className="no-print fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 md:pl-[232px]">
          <div className="flex animate-in items-center gap-3 rounded-md bg-ink py-1.5 pr-1.5 pl-4 text-[13.5px] text-paper shadow-lg">
            Alterações não salvas
            <button className="px-2 text-paper/70 hover:text-paper" onClick={() => setS(data.settings)}>
              Descartar
            </button>
            <button className="btn btn-sm h-8 bg-paper text-ink hover:opacity-90" disabled={pending} onClick={save}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PinRow({ lockMinutes, onSaved }: { lockMinutes: number; onSaved: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const submit = () => {
    setError("");
    if (next !== again) return setError("Os PINs novos não conferem.");
    start(async () => {
      const r = await changePin(current, next);
      if (!r.ok) return setError(r.error);
      setCurrent("");
      setNext("");
      setAgain("");
      toast({ kind: "success", text: "PIN trocado." });
    });
  };

  return (
    <Row title="PIN e bloqueio" desc="O PIN é pedido ao abrir o Caderninho e sempre que ele bloqueia sozinho.">
      <Field label="Bloquear sozinho depois de">
        <select
          className="input w-auto"
          defaultValue={String(lockMinutes)}
          onChange={(e) =>
            start(async () => {
              await setLockMinutes(Number(e.target.value));
              toast({ kind: "success", text: "Tempo de bloqueio salvo." });
              onSaved();
            })
          }
        >
          {[2, 5, 10, 15, 30, 60].map((m) => (
            <option key={m} value={m}>
              {m} minutos parado
            </option>
          ))}
          <option value="0">Nunca (só pelo botão Bloquear)</option>
        </select>
      </Field>

      <p className="mt-6 mb-2 text-[13px] font-medium">Trocar PIN</p>
      <div className="flex flex-wrap items-end gap-2">
        {[
          ["Atual", current, setCurrent],
          ["Novo", next, setNext],
          ["Repita o novo", again, setAgain],
        ].map(([label, value, setter]) => (
          <div key={label as string}>
            <label className="label">{label as string}</label>
            <input
              className="input figure w-28 text-center text-[18px] tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={value as string}
              onChange={(e) => (setter as (v: string) => void)(digits(e.target.value))}
            />
          </div>
        ))}
        <button className="btn btn-secondary h-10" disabled={pending || current.length < 4 || next.length < 4 || again.length < 4} onClick={submit}>
          Trocar PIN
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-debt">{error}</p>}
      <p className="hint mt-3">Esqueceu o PIN? Apague o arquivo dados/seguranca.json na pasta do Caderninho e crie outro. Nenhum fiado é perdido.</p>
    </Row>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 md:grid-cols-[220px_1fr] md:gap-10">
      <div>
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {desc && <p className="mt-1 text-[13px] leading-snug text-ink-3">{desc}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
