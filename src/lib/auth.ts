import { promises as fs } from "fs";
import path from "path";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { DATA_DIR } from "./db";

// O PIN fica num arquivo separado dos dados: assim os backups não carregam o PIN
// e, se ele for esquecido, basta apagar este arquivo para criar um novo.
export const SECURITY_FILE = path.join(DATA_DIR, "seguranca.json");
export const SESSION_COOKIE = "caderninho_sessao";
const SESSION_MAX_HOURS = 14;

export interface Security {
  pinHash: string;
  salt: string;
  secret: string;
  lockMinutes: number; // 0 = nunca bloquear sozinho
}

export async function readSecurity(): Promise<Security | null> {
  try {
    const raw = JSON.parse(await fs.readFile(SECURITY_FILE, "utf8"));
    if (!raw?.pinHash || !raw?.salt || !raw?.secret) return null;
    return { lockMinutes: 10, ...raw };
  } catch {
    return null;
  }
}

export async function writeSecurity(sec: Security) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${SECURITY_FILE}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(sec, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, SECURITY_FILE);
}

export function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

export function newSecurity(pin: string, lockMinutes = 10): Security {
  const salt = randomBytes(16).toString("hex");
  return { pinHash: hashPin(pin, salt), salt, secret: randomBytes(32).toString("hex"), lockMinutes };
}

export function checkPin(sec: Security, pin: string) {
  const a = Buffer.from(hashPin(pin, sec.salt), "hex");
  const b = Buffer.from(sec.pinHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createToken(sec: Security) {
  const issued = String(Date.now());
  return `${issued}.${sign(sec.secret, issued)}`;
}

export function verifyToken(sec: Security, token: string | undefined) {
  if (!token) return false;
  const [issued, sig] = token.split(".");
  if (!issued || !sig) return false;
  const age = Date.now() - Number(issued);
  if (!Number.isFinite(age) || age < 0 || age > SESSION_MAX_HOURS * 3_600_000) return false;
  const expected = Buffer.from(sign(sec.secret, issued), "hex");
  const got = Buffer.from(sig, "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}
