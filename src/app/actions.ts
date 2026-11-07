"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/lib/session";
import { mutate, newId, normalizeDb, replaceDb, emptyDatabase, defaultSettings } from "@/lib/db";
import { toDateInput } from "@/lib/format";
import type { ChargeLog, Database, PaymentMethod, Product, Settings, Student, Transaction, TxItem } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

/** Data escolhida no formulário (yyyy-mm-dd). Se for hoje, usa o horário atual. */
function resolveDate(date?: string): string {
  if (!date || date === toDateInput()) return new Date().toISOString();
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function cents(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? v : 0;
}

// ---------- Alunos ----------

export type StudentInput = Pick<Student, "name" | "grade" | "guardianName" | "phone" | "notes"> & {
  creditLimit: number | null;
  blocked?: boolean;
};

export async function saveStudent(id: string | null, input: StudentInput): Promise<{ id: string }> {
  await assertUnlocked();
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do aluno.");
  const result = await mutate((db) => {
    const data = {
      name,
      grade: input.grade.trim(),
      guardianName: input.guardianName.trim(),
      phone: input.phone.trim(),
      notes: input.notes.trim(),
      creditLimit: input.creditLimit === null ? null : Math.max(0, cents(input.creditLimit)),
      blocked: !!input.blocked,
    };
    if (id) {
      const s = db.students.find((x) => x.id === id);
      if (!s) throw new Error("Aluno não encontrado.");
      Object.assign(s, data);
      return { id };
    }
    const student: Student = {
      id: newId(),
      ...data,
      archived: false,
      createdAt: new Date().toISOString(),
      lastChargedAt: null,
    };
    db.students.push(student);
    return { id: student.id };
  });
  refresh();
  return result;
}

export async function setStudentFlags(id: string, flags: Partial<Pick<Student, "blocked" | "archived">>) {
  await assertUnlocked();
  await mutate((db) => {
    const s = db.students.find((x) => x.id === id);
    if (!s) throw new Error("Aluno não encontrado.");
    if (flags.blocked !== undefined) s.blocked = flags.blocked;
    if (flags.archived !== undefined) s.archived = flags.archived;
  });
  refresh();
}

export async function deleteStudent(id: string) {
  await assertUnlocked();
  await mutate((db) => {
    db.students = db.students.filter((s) => s.id !== id);
    db.transactions = db.transactions.filter((t) => t.studentId !== id);
    db.charges = db.charges.filter((c) => c.studentId !== id);
  });
  refresh();
}

// ---------- Movimentações ----------

export async function addPurchase(input: {
  studentId: string;
  items: TxItem[];
  extraAmount: number;
  note: string;
  date?: string;
}): Promise<{ id: string }> {
  await assertUnlocked();
  const items = input.items
    .filter((i) => i.qty > 0)
    .map((i) => ({ productId: i.productId, name: i.name, unitPrice: cents(i.unitPrice), qty: Math.round(i.qty) }));
  const extra = Math.max(0, cents(input.extraAmount));
  if (extra > 0) items.push({ productId: null, name: input.note.trim() || "Valor avulso", unitPrice: extra, qty: 1 });
  const amount = items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0);
  if (amount <= 0) throw new Error("Adicione pelo menos um item ou valor.");

  const res = await mutate((db) => {
    if (!db.students.some((s) => s.id === input.studentId)) throw new Error("Aluno não encontrado.");
    const tx: Transaction = {
      id: newId(),
      studentId: input.studentId,
      type: "compra",
      amount,
      items,
      note: extra > 0 ? "" : input.note.trim(),
      createdAt: resolveDate(input.date),
    };
    db.transactions.push(tx);
    return { id: tx.id };
  });
  refresh();
  return res;
}

export async function addPayment(input: {
  studentId: string;
  amount: number;
  method: PaymentMethod;
  note: string;
  date?: string;
}): Promise<{ id: string }> {
  await assertUnlocked();
  const amount = cents(input.amount);
  if (amount <= 0) throw new Error("Informe o valor recebido.");
  const res = await mutate((db) => {
    if (!db.students.some((s) => s.id === input.studentId)) throw new Error("Aluno não encontrado.");
    const tx: Transaction = {
      id: newId(),
      studentId: input.studentId,
      type: "pagamento",
      amount,
      items: [],
      method: input.method,
      note: input.note.trim(),
      createdAt: resolveDate(input.date),
    };
    db.transactions.push(tx);
    return { id: tx.id };
  });
  refresh();
  return res;
}

export async function deleteTransaction(id: string) {
  await assertUnlocked();
  await mutate((db) => {
    db.transactions = db.transactions.filter((t) => t.id !== id);
  });
  refresh();
}

// ---------- Cobranças ----------

export async function logCharge(studentId: string, amount: number, channel: ChargeLog["channel"]) {
  await assertUnlocked();
  await mutate((db) => {
    const s = db.students.find((x) => x.id === studentId);
    if (!s) throw new Error("Aluno não encontrado.");
    const now = new Date().toISOString();
    s.lastChargedAt = now;
    db.charges.push({ id: newId(), studentId, amount: cents(amount), channel, createdAt: now });
  });
  refresh();
}

// ---------- Cardápio ----------

export async function saveProduct(input: Omit<Product, "id"> & { id?: string | null }) {
  await assertUnlocked();
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do produto.");
  await mutate((db) => {
    const data = {
      name,
      price: Math.max(0, cents(input.price)),
      emoji: input.emoji || "🍽️",
      category: input.category.trim() || "Outros",
      active: input.active,
    };
    if (input.id) {
      const p = db.products.find((x) => x.id === input.id);
      if (!p) throw new Error("Produto não encontrado.");
      Object.assign(p, data);
    } else {
      db.products.push({ id: newId(), ...data });
    }
  });
  refresh();
}

export async function deleteProduct(id: string) {
  await assertUnlocked();
  await mutate((db) => {
    db.products = db.products.filter((p) => p.id !== id);
  });
  refresh();
}

// ---------- Configurações e dados ----------

export async function saveSettings(input: Settings) {
  await assertUnlocked();
  await mutate((db) => {
    db.settings = {
      ...defaultSettings(),
      ...input,
      defaultCreditLimit: Math.max(0, cents(input.defaultCreditLimit)),
      overdueDays: Math.max(1, Math.round(Number(input.overdueDays) || 15)),
    };
  });
  refresh();
}

export async function restoreBackup(json: string): Promise<{ students: number; transactions: number }> {
  await assertUnlocked();
  let parsed: Partial<Database>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Arquivo inválido: não é um backup do Caderninho.");
  }
  if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.transactions)) {
    throw new Error("Arquivo inválido: não é um backup do Caderninho.");
  }
  const db = normalizeDb(parsed);
  await replaceDb(db);
  refresh();
  return { students: db.students.length, transactions: db.transactions.length };
}

export async function wipeAll() {
  await assertUnlocked();
  await replaceDb(emptyDatabase());
  refresh();
}

export async function loadSampleData() {
  await assertUnlocked();
  await mutate((db) => {
    if (db.students.length > 0) throw new Error("Já existem alunos cadastrados.");
    const names: [string, string, string, string][] = [
      ["Ana Clara Souza", "5º A", "Mariana Souza", "11987654321"],
      ["Pedro Henrique Lima", "6º B", "Carlos Lima", "11976543210"],
      ["Laura Martins", "4º A", "Juliana Martins", "11965432109"],
      ["Miguel Oliveira", "7º A", "Fernanda Oliveira", "11954321098"],
      ["Sofia Rodrigues", "5º B", "Patrícia Rodrigues", "11943210987"],
      ["Arthur Costa", "8º A", "Roberto Costa", "11932109876"],
      ["Helena Almeida", "3º A", "Camila Almeida", "11921098765"],
      ["Davi Pereira", "6º A", "Luciana Pereira", "11910987654"],
    ];
    const products = db.products.filter((p) => p.active);
    const now = Date.now();
    names.forEach(([name, grade, guardianName, phone], idx) => {
      const id = newId();
      db.students.push({
        id,
        name,
        grade,
        guardianName,
        phone,
        notes: idx === 2 ? "Alergia a amendoim" : "",
        creditLimit: null,
        blocked: false,
        archived: false,
        createdAt: new Date(now - 40 * 86_400_000).toISOString(),
        lastChargedAt: idx % 3 === 0 ? new Date(now - 5 * 86_400_000).toISOString() : null,
      });
      const purchases = 3 + ((idx * 7) % 9);
      for (let i = 0; i < purchases; i++) {
        const daysAgo = Math.floor(((idx + 1) * (i + 3) * 7) % 30);
        const p1 = products[(idx + i) % products.length];
        const p2 = products[(idx * 3 + i * 5) % products.length];
        const items = [{ productId: p1.id, name: p1.name, unitPrice: p1.price, qty: 1 }];
        if (i % 2 === 0 && p2.id !== p1.id) items.push({ productId: p2.id, name: p2.name, unitPrice: p2.price, qty: 1 });
        db.transactions.push({
          id: newId(),
          studentId: id,
          type: "compra",
          amount: items.reduce((a, it) => a + it.unitPrice * it.qty, 0),
          items,
          note: "",
          createdAt: new Date(now - daysAgo * 86_400_000 - i * 3_600_000).toISOString(),
        });
      }
      if (idx % 2 === 1) {
        db.transactions.push({
          id: newId(),
          studentId: id,
          type: "pagamento",
          amount: 1500 + idx * 500,
          items: [],
          method: idx % 4 === 1 ? "pix" : "dinheiro",
          note: "",
          createdAt: new Date(now - 3 * 86_400_000).toISOString(),
        });
      }
    });
  });
  refresh();
}
