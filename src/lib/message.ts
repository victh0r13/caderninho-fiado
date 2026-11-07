export const DEFAULT_TEMPLATE = `Olá, {responsavel}, tudo bem?
Aqui é da {lanchonete}. Passando para lembrar que {aluno} está com {valor} em aberto na cantina.

{itens}
Se preferir pagar por Pix, a chave é {pix}.

Qualquer dúvida, é só me chamar. Obrigada!`;

import type { Settings, StudentSummary } from "./types";
import { dateShort, money, onlyDigits } from "./format";
import { describeItems } from "./calc";

export function buildChargeMessage(settings: Settings, s: StudentSummary): string {
  const firstName = s.student.name.trim().split(/\s+/)[0] || s.student.name;
  const guardian = s.student.guardianName.trim().split(/\s+/)[0] || "";

  let itens = "";
  if (settings.includeItemsInMessage && s.openPurchases.length > 0) {
    const lines = s.openPurchases.slice(-15).map((o) => {
      const partial = o.remaining !== o.tx.amount ? ` (restam ${money(o.remaining)})` : "";
      return `- ${dateShort(o.tx.createdAt)} — ${describeItems(o.tx)}: ${money(o.tx.amount)}${partial}`;
    });
    const hidden = s.openPurchases.length - 15;
    itens = `Lanches em aberto:\n${hidden > 0 ? `(+${hidden} anteriores)\n` : ""}${lines.join("\n")}\n`;
  }

  const vars: Record<string, string> = {
    responsavel: guardian,
    aluno: firstName,
    aluno_completo: s.student.name,
    turma: s.student.grade,
    valor: `*${money(Math.max(0, s.balance))}*`,
    itens,
    lanchonete: settings.shopName || "cantina",
    pix: settings.pixKey || "(peça a chave Pix)",
    dias: String(s.daysOpen),
    atendente: settings.ownerName,
  };

  return settings.messageTemplate
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m))
    .replace(/,\s*,/g, ",")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function whatsappLink(phone: string, text: string): string {
  let digits = onlyDigits(phone);
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
