import type { Database, OpenPurchase, Student, StudentSummary, Transaction } from "./types";
import { daysBetween, startOfDay } from "./format";

export function sortByDate<T extends { createdAt: string }>(list: T[], dir: "asc" | "desc" = "asc"): T[] {
  return [...list].sort((a, b) =>
    dir === "asc" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
  );
}

export function effectiveLimit(student: Student, defaultLimit: number): number {
  return student.creditLimit ?? defaultLimit;
}

/**
 * Calcula saldo e "idade" da dívida de um aluno.
 * Os pagamentos quitam primeiro as compras mais antigas (FIFO), assim sabemos
 * exatamente quais lanches ainda estão em aberto e desde quando.
 */
export function summarizeStudent(db: Database, student: Student, txs: Transaction[], now = new Date()): StudentSummary {
  const sorted = sortByDate(txs);
  const queue: OpenPurchase[] = [];
  let credit = 0;
  let totalBought = 0;
  let totalPaid = 0;
  let lastPurchaseAt: string | null = null;
  let lastPaymentAt: string | null = null;

  for (const tx of sorted) {
    if (tx.type === "compra") {
      totalBought += tx.amount;
      lastPurchaseAt = tx.createdAt;
      const use = Math.min(credit, tx.amount);
      credit -= use;
      const remaining = tx.amount - use;
      if (remaining > 0) queue.push({ tx, remaining });
    } else {
      totalPaid += tx.amount;
      lastPaymentAt = tx.createdAt;
      let pay = tx.amount;
      while (pay > 0 && queue.length > 0) {
        const head = queue[0];
        const used = Math.min(head.remaining, pay);
        head.remaining -= used;
        pay -= used;
        if (head.remaining === 0) queue.shift();
      }
      credit += pay;
    }
  }

  const balance = totalBought - totalPaid;
  const oldestOpenDate = queue.length > 0 ? queue[0].tx.createdAt : null;
  const daysOpen = oldestOpenDate ? Math.max(0, daysBetween(new Date(oldestOpenDate), now)) : 0;
  const limit = effectiveLimit(student, db.settings.defaultCreditLimit);
  const overLimit = limit > 0 && balance >= limit;
  let status: StudentSummary["status"] = "em_dia";
  if (balance < 0) status = "credito";
  else if (balance > 0) status = daysOpen >= db.settings.overdueDays ? "atrasado" : "devendo";

  return {
    student,
    balance,
    totalBought,
    totalPaid,
    oldestOpenDate,
    daysOpen,
    lastPurchaseAt,
    lastPaymentAt,
    limit,
    overLimit,
    status,
    openPurchases: queue,
  };
}

export function summarizeAll(db: Database, now = new Date()): StudentSummary[] {
  const byStudent = new Map<string, Transaction[]>();
  for (const tx of db.transactions) {
    const arr = byStudent.get(tx.studentId);
    if (arr) arr.push(tx);
    else byStudent.set(tx.studentId, [tx]);
  }
  return db.students.map((s) => summarizeStudent(db, s, byStudent.get(s.id) ?? [], now));
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface DashboardStats {
  receivable: number;
  debtors: number;
  overdue: number;
  credits: number;
  receivedMonth: number;
  soldMonth: number;
  receivedToday: number;
  soldToday: number;
  daily: { date: string; sold: number; received: number }[];
  topProducts: { name: string; emoji: string; qty: number; total: number }[];
}

export function dashboardStats(db: Database, summaries: StudentSummary[], now = new Date()): DashboardStats {
  const active = summaries.filter((s) => !s.student.archived || s.balance !== 0);
  const monthStart = startOfMonth(now).toISOString();
  const today = startOfDay(now).toISOString();
  let receivedMonth = 0;
  let soldMonth = 0;
  let receivedToday = 0;
  let soldToday = 0;

  const days = 14;
  const daily: DashboardStats["daily"] = [];
  const dayIndex = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * 86_400_000));
    const key = d.toDateString();
    dayIndex.set(key, daily.length);
    daily.push({ date: d.toISOString(), sold: 0, received: 0 });
  }

  const productEmoji = new Map(db.products.map((p) => [p.name, p.emoji]));
  const prodMap = new Map<string, { name: string; emoji: string; qty: number; total: number }>();

  for (const tx of db.transactions) {
    const isPurchase = tx.type === "compra";
    if (tx.createdAt >= monthStart) {
      if (isPurchase) {
        soldMonth += tx.amount;
        for (const it of tx.items) {
          const cur = prodMap.get(it.name) ?? {
            name: it.name,
            emoji: productEmoji.get(it.name) ?? "🍽️",
            qty: 0,
            total: 0,
          };
          cur.qty += it.qty;
          cur.total += it.qty * it.unitPrice;
          prodMap.set(it.name, cur);
        }
      } else if (tx.method !== "desconto") receivedMonth += tx.amount;
    }
    if (tx.createdAt >= today) {
      if (isPurchase) soldToday += tx.amount;
      else if (tx.method !== "desconto") receivedToday += tx.amount;
    }
    const idx = dayIndex.get(new Date(tx.createdAt).toDateString());
    if (idx !== undefined) {
      if (isPurchase) daily[idx].sold += tx.amount;
      else if (tx.method !== "desconto") daily[idx].received += tx.amount;
    }
  }

  return {
    receivable: active.reduce((acc, s) => acc + Math.max(0, s.balance), 0),
    debtors: active.filter((s) => s.balance > 0).length,
    overdue: active.filter((s) => s.status === "atrasado").length,
    credits: active.reduce((acc, s) => acc + Math.max(0, -s.balance), 0),
    receivedMonth,
    soldMonth,
    receivedToday,
    soldToday,
    daily,
    topProducts: [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
  };
}

export function describeItems(tx: Transaction): string {
  if (tx.items.length === 0) return tx.note || (tx.type === "compra" ? "Lanche" : "Pagamento");
  return tx.items.map((i) => (i.qty > 1 ? `${i.qty}x ${i.name}` : i.name)).join(", ");
}
