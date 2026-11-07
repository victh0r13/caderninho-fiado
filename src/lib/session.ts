import { cookies } from "next/headers";
import { readSecurity, SESSION_COOKIE, verifyToken } from "./auth";

/** Garante que quem chama está com o caderninho desbloqueado. */
export async function assertUnlocked() {
  const sec = await readSecurity();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sec || !verifyToken(sec, token)) throw new Error("Caderninho bloqueado. Digite o PIN novamente.");
}
