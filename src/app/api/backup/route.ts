import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDb();
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return new Response(JSON.stringify(db, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="caderninho-backup-${stamp}.json"`,
    },
  });
}
