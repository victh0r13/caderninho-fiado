"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { logCharge } from "@/app/actions";
import { buildChargeMessage, whatsappLink } from "@/lib/message";
import { pixPayload } from "@/lib/pix";
import { formatPhone, money, relativeDays } from "@/lib/format";
import { useApp } from "./AppShell";
import { Modal, StatusText, useToast } from "./ui";

export function ChargeDialog(props: { open: boolean; studentId?: string; onClose: () => void }) {
  if (!props.open || !props.studentId) return null;
  return <Inner studentId={props.studentId} onClose={props.onClose} />;
}

function Inner({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useApp();
  const toast = useToast();
  const summary = data.summaries.find((s) => s.student.id === studentId);
  const { settings } = data;
  const [includePix, setIncludePix] = useState(!!settings.pixKey);
  const [text, setText] = useState(() => (summary ? buildChargeMessage(settings, summary) : ""));
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState<"msg" | "pix" | null>(null);
  const [, start] = useTransition();

  const pix = useMemo(
    () =>
      settings.pixKey && summary
        ? pixPayload({
            key: settings.pixKey,
            name: settings.pixName || settings.ownerName || settings.shopName,
            city: settings.pixCity,
            amountCents: Math.max(0, summary.balance),
          })
        : "",
    [settings, summary],
  );

  useEffect(() => {
    if (!pix) return;
    QRCode.toDataURL(pix, { margin: 0, width: 320, errorCorrectionLevel: "M", color: { dark: "#1b1a17", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [pix]);

  if (!summary) return null;

  const finalText = includePix && pix ? `${text}\n\nPix copia e cola (valor já preenchido):\n${pix}` : text;
  const hasPhone = summary.student.phone.replace(/\D/g, "").length >= 10;

  const copy = async (what: "msg" | "pix") => {
    await navigator.clipboard.writeText(what === "msg" ? finalText : pix);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  const register = (channel: "whatsapp" | "pessoalmente") =>
    start(async () => {
      await logCharge(summary.student.id, summary.balance, channel);
      toast({ kind: "success", text: `Cobrança de ${summary.student.name.split(" ")[0]} registrada.` });
    });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Cobrar ${summary.student.name}`}
      subtitle={
        <>
          <span className="tabular text-debt">{money(summary.balance)}</span> · <StatusText status={summary.status} days={summary.daysOpen} /> ·
          última cobrança {relativeDays(summary.student.lastChargedAt)}
        </>
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="btn btn-ghost mr-auto"
            onClick={() => {
              register("pessoalmente");
              onClose();
            }}
          >
            Cobrei pessoalmente
          </button>
          <button className="btn btn-secondary" onClick={() => copy("msg")}>
            {copied === "msg" ? "Copiado" : "Copiar mensagem"}
          </button>
          <a
            className="btn btn-paid"
            href={whatsappLink(summary.student.phone, finalText)}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              register("whatsapp");
              onClose();
            }}
          >
            Abrir no WhatsApp
          </a>
        </div>
      }
    >
      <div className="grid gap-8 md:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-3 text-[13px] text-ink-2">
            Para <b className="font-medium text-ink">{summary.student.guardianName || "responsável não informado"}</b>
            {hasPhone ? (
              <span className="text-ink-3"> · {formatPhone(summary.student.phone)}</span>
            ) : (
              <span className="text-warn"> · sem WhatsApp cadastrado, você escolhe o contato ao abrir</span>
            )}
          </div>
          <textarea className="input text-[14px]" rows={13} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="hint">
            Pode editar à vontade antes de enviar. O texto padrão fica em{" "}
            <Link href="/configuracoes" className="underline underline-offset-2" onClick={onClose}>
              Ajustes
            </Link>
            .
          </p>
        </div>

        <div>
          {pix ? (
            <>
              <p className="text-[12px] text-ink-3">Pix de {money(summary.balance)}</p>
              <div className="mt-2 rounded-md border border-line bg-white p-3">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR Code Pix" className="w-full" />
                ) : (
                  <div className="aspect-square w-full bg-sunken" />
                )}
              </div>
              <p className="hint">Mostre na tela para pagar na hora.</p>
              <button className="btn btn-secondary btn-sm mt-3 w-full" onClick={() => copy("pix")}>
                {copied === "pix" ? "Copiado" : "Copiar Pix copia e cola"}
              </button>
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-[13px] text-ink-2">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[var(--ink)]"
                  checked={includePix}
                  onChange={(e) => setIncludePix(e.target.checked)}
                />
                Colocar o Pix copia e cola no fim da mensagem
              </label>
            </>
          ) : (
            <p className="border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed text-ink-3">
              Cadastre sua chave Pix em{" "}
              <Link href="/configuracoes" className="text-ink underline underline-offset-2" onClick={onClose}>
                Ajustes
              </Link>{" "}
              para gerar o QR Code com o valor certo.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
