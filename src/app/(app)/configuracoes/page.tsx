import { dbFilePath, listBackups, DATA_DIR } from "@/lib/db";
import { readSecurity } from "@/lib/auth";
import { SettingsView } from "./SettingsView";

export const metadata = { title: "Ajustes" };

export default async function ConfiguracoesPage() {
  const [backups, sec] = await Promise.all([listBackups(), readSecurity()]);
  return (
    <SettingsView
      dataFile={dbFilePath()}
      dataDir={DATA_DIR}
      lastBackup={backups[0] ?? null}
      backupCount={backups.length}
      lockMinutes={sec?.lockMinutes ?? 10}
    />
  );
}
