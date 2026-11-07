import { readDb } from "@/lib/db";
import { sortByDate } from "@/lib/calc";
import { HistoryView } from "./HistoryView";

export const metadata = { title: "Histórico" };

export default async function HistoricoPage() {
  const db = await readDb();
  const names: Record<string, { name: string; grade: string }> = {};
  for (const s of db.students) names[s.id] = { name: s.name, grade: s.grade };
  return <HistoryView transactions={sortByDate(db.transactions, "desc")} names={names} />;
}
