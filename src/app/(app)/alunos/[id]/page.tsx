import { notFound } from "next/navigation";
import { readDb } from "@/lib/db";
import { sortByDate } from "@/lib/calc";
import { StudentDetail } from "./StudentDetail";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const student = db.students.find((s) => s.id === id);
  if (!student) notFound();
  const txs = sortByDate(db.transactions.filter((t) => t.studentId === id));
  const charges = sortByDate(db.charges.filter((c) => c.studentId === id), "desc");
  return <StudentDetail studentId={id} transactions={txs} charges={charges} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  return { title: db.students.find((s) => s.id === id)?.name ?? "Aluno" };
}
