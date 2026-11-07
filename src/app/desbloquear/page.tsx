import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSecurity, SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { LockScreen } from "./LockScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desbloquear" };

function safeNext(de?: string) {
  return de && de.startsWith("/") && !de.startsWith("//") ? de : "/";
}

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de } = await searchParams;
  const [sec, db] = await Promise.all([readSecurity(), readDb()]);
  if (sec && verifyToken(sec, (await cookies()).get(SESSION_COOKIE)?.value)) redirect(safeNext(de));
  return <LockScreen mode={sec ? "unlock" : "create"} next={safeNext(de)} shopName={db.settings.shopName} ownerName={db.settings.ownerName} />;
}
