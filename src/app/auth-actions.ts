"use server";

import { cookies } from "next/headers";
import {
  checkPin,
  createToken,
  isValidPin,
  newSecurity,
  readSecurity,
  SESSION_COOKIE,
  writeSecurity,
  type Security,
} from "@/lib/auth";
import { assertUnlocked } from "@/lib/session";

// Proteção contra tentativas em sequência (fica na memória do servidor).
const g = globalThis as unknown as { __cadAttempts?: { count: number; until: number } };
const attempts = () => (g.__cadAttempts ??= { count: 0, until: 0 });

async function startSession(sec: Security) {
  (await cookies()).set(SESSION_COOKIE, createToken(sec), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
}

export type AuthResult = { ok: true } | { ok: false; error: string; waitSeconds?: number };

export async function hasPin() {
  return !!(await readSecurity());
}

export async function createPin(pin: string): Promise<AuthResult> {
  if (await readSecurity()) return { ok: false, error: "Já existe um PIN. Use-o para entrar." };
  if (!isValidPin(pin)) return { ok: false, error: "O PIN precisa ter 4 números." };
  const sec = newSecurity(pin);
  await writeSecurity(sec);
  await startSession(sec);
  return { ok: true };
}

export async function unlock(pin: string): Promise<AuthResult> {
  const sec = await readSecurity();
  if (!sec) return { ok: false, error: "Nenhum PIN criado ainda." };
  const a = attempts();
  const now = Date.now();
  if (a.until > now) return { ok: false, error: "Muitas tentativas.", waitSeconds: Math.ceil((a.until - now) / 1000) };
  if (!checkPin(sec, pin)) {
    a.count += 1;
    if (a.count >= 5) {
      a.until = now + 30_000 * 2 ** Math.min(4, a.count - 5);
      return { ok: false, error: "Muitas tentativas.", waitSeconds: Math.ceil((a.until - now) / 1000) };
    }
    return { ok: false, error: "PIN incorreto." };
  }
  a.count = 0;
  a.until = 0;
  await startSession(sec);
  return { ok: true };
}

export async function lock() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function changePin(current: string, next: string): Promise<AuthResult> {
  await assertUnlocked();
  const sec = await readSecurity();
  if (!sec) return { ok: false, error: "Nenhum PIN criado." };
  if (!checkPin(sec, current)) return { ok: false, error: "O PIN atual está errado." };
  if (!isValidPin(next)) return { ok: false, error: "O novo PIN precisa ter 4 números." };
  const fresh = newSecurity(next, sec.lockMinutes);
  await writeSecurity(fresh);
  await startSession(fresh);
  return { ok: true };
}

export async function setLockMinutes(minutes: number) {
  await assertUnlocked();
  const sec = await readSecurity();
  if (!sec) return;
  await writeSecurity({ ...sec, lockMinutes: Math.max(0, Math.min(240, Math.round(minutes) || 0)) });
}
