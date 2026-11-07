import { readDb } from "@/lib/db";
import { readSecurity } from "@/lib/auth";
import { summarizeAll } from "@/lib/calc";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [db, sec] = await Promise.all([readDb(), readSecurity()]);
  const data = { summaries: summarizeAll(db), products: db.products, settings: db.settings };
  return (
    <AppShell data={data} lockMinutes={sec?.lockMinutes ?? 10}>
      {children}
    </AppShell>
  );
}
