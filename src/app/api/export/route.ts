import { readDb } from "@/lib/db";
import { describeItems, sortByDate, summarizeAll } from "@/lib/calc";
import { METHOD_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

function csv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // ";" e BOM: abre certinho no Excel/Numbers em português
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\n");
}

const brl = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("tipo") ?? "movimentos";
  const db = await readDb();
  const stamp = new Date().toISOString().slice(0, 10);

  let body: string;
  let name: string;
  if (kind === "saldos") {
    const rows = summarizeAll(db)
      .filter((s) => !s.student.archived || s.balance !== 0)
      .sort((a, b) => a.student.name.localeCompare(b.student.name, "pt-BR"))
      .map((s) => [
        s.student.name,
        s.student.grade,
        s.student.guardianName,
        s.student.phone,
        brl(s.balance),
        s.oldestOpenDate ? new Date(s.oldestOpenDate).toLocaleDateString("pt-BR") : "",
        s.daysOpen,
      ]);
    body = csv([["Aluno", "Turma", "Responsável", "Telefone", "Saldo (R$)", "Em aberto desde", "Dias"], ...rows]);
    name = `saldos-${stamp}.csv`;
  } else {
    const from = url.searchParams.get("de");
    const to = url.searchParams.get("ate");
    const students = new Map(db.students.map((s) => [s.id, s]));
    const rows = sortByDate(db.transactions)
      .filter((t) => (!from || t.createdAt >= from) && (!to || t.createdAt <= to))
      .map((t) => {
        const s = students.get(t.studentId);
        const d = new Date(t.createdAt);
        return [
          d.toLocaleDateString("pt-BR"),
          d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          s?.name ?? "(removido)",
          s?.grade ?? "",
          t.type === "compra" ? "Fiado" : "Pagamento",
          t.type === "compra" ? describeItems(t) : METHOD_LABEL[t.method ?? "outro"],
          t.note,
          brl(t.type === "compra" ? t.amount : -t.amount),
        ];
      });
    body = csv([["Data", "Hora", "Aluno", "Turma", "Tipo", "Descrição", "Observação", "Valor (R$)"], ...rows]);
    name = `movimentos-${stamp}.csv`;
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
