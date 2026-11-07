import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DEFAULT_TEMPLATE } from "./message";
import type { Database, Product, Settings, Student, Transaction } from "./types";

export const DATA_DIR = process.env.CADERNINHO_DATA_DIR || path.join(process.cwd(), "dados");
const DB_FILE = path.join(DATA_DIR, "caderninho.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_BACKUPS = 60;


export function defaultSettings(): Settings {
  return {
    shopName: "Cantina da Escola",
    ownerName: "",
    pixKey: "",
    pixName: "",
    pixCity: "",
    defaultCreditLimit: 5000,
    overdueDays: 15,
    messageTemplate: DEFAULT_TEMPLATE,
    includeItemsInMessage: true,
  };
}

export function newId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function defaultProducts(): Product[] {
  const list: [string, number, string, string][] = [
    ["Coxinha", 600, "", "Salgados"],
    ["Pão de queijo", 400, "", "Salgados"],
    ["Esfiha", 600, "", "Salgados"],
    ["Misto quente", 700, "", "Salgados"],
    ["Pastel", 700, "", "Salgados"],
    ["Suco natural", 500, "", "Bebidas"],
    ["Refrigerante lata", 600, "", "Bebidas"],
    ["Água", 300, "", "Bebidas"],
    ["Achocolatado", 450, "", "Bebidas"],
    ["Bolo (fatia)", 500, "", "Doces"],
    ["Chocolate", 400, "", "Doces"],
    ["Pipoca", 350, "", "Doces"],
  ];
  return list.map(([name, price, emoji, category]) => ({
    id: newId(),
    name,
    price,
    emoji,
    category,
    active: true,
  }));
}

export function emptyDatabase(): Database {
  return {
    version: 1,
    students: [],
    products: defaultProducts(),
    transactions: [],
    charges: [],
    settings: defaultSettings(),
  };
}

/** Garante que dados antigos/importados tenham todos os campos. */
export function normalizeDb(raw: Partial<Database>): Database {
  const base = emptyDatabase();
  return {
    version: 1,
    students: Array.isArray(raw.students)
      ? raw.students.map((s: Partial<Student>) => ({
          grade: "",
          guardianName: "",
          phone: "",
          creditLimit: null,
          notes: "",
          blocked: false,
          archived: false,
          lastChargedAt: null,
          createdAt: new Date().toISOString(),
          ...s,
        }) as Student)
      : [],
    products: Array.isArray(raw.products) ? raw.products : base.products,
    transactions: Array.isArray(raw.transactions)
      ? raw.transactions.map((t: Partial<Transaction>) => ({ items: [], note: "", ...t }) as Transaction)
      : [],
    charges: Array.isArray(raw.charges) ? raw.charges : [],
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

async function readFileDb(): Promise<Database | null> {
  try {
    const text = await fs.readFile(DB_FILE, "utf8");
    return normalizeDb(JSON.parse(text));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Só deve ser chamada de dentro da fila. */
async function loadOrCreate(): Promise<Database> {
  const db = await readFileDb();
  if (db) return db;
  const fresh = emptyDatabase();
  await persist(fresh);
  return fresh;
}

export async function readDb(): Promise<Database> {
  const db = await readFileDb();
  if (db) return db;
  // Primeira execução: cria o arquivo pela fila, para não criar duas vezes ao mesmo tempo.
  return enqueue(loadOrCreate);
}

async function dailyBackup() {
  try {
    await fs.access(DB_FILE);
  } catch {
    return;
  }
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const target = path.join(BACKUP_DIR, `caderninho-${stamp}.json`);
  try {
    await fs.access(target);
    return; // já tem backup de hoje
  } catch {
    /* segue */
  }
  await fs.copyFile(DB_FILE, target);
  const files = (await fs.readdir(BACKUP_DIR)).filter((f) => f.startsWith("caderninho-") && f.endsWith(".json")).sort();
  for (const old of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
    await fs.unlink(path.join(BACKUP_DIR, old)).catch(() => {});
  }
}

async function persist(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await dailyBackup();
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE); // troca atômica: nunca deixa o arquivo pela metade
}

// Fila global: garante que duas gravações nunca aconteçam ao mesmo tempo.
const g = globalThis as unknown as { __caderninhoQueue?: Promise<unknown> };

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const prev = g.__caderninhoQueue ?? Promise.resolve();
  const run = prev.then(job);
  g.__caderninhoQueue = run.catch(() => undefined);
  return run;
}

export function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    const db = await loadOrCreate();
    const result = await fn(db);
    await persist(db);
    return result;
  });
}

export async function replaceDb(db: Database) {
  return mutate((current) => {
    Object.assign(current, normalizeDb(db));
  });
}

export async function listBackups(): Promise<string[]> {
  try {
    return (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith(".json")).sort().reverse();
  } catch {
    return [];
  }
}

export function dbFilePath() {
  return DB_FILE;
}
