"use client";

import { useRouter } from "next/navigation";
import { useApp } from "./AppShell";
import { Modal } from "./ui";
import { StudentPicker } from "./StudentPicker";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, openStudent } = useApp();
  const router = useRouter();
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Buscar aluno"
      subtitle="Use ↑ ↓ e Enter para abrir a ficha"
    >
      <StudentPicker
        summaries={data.summaries}
        onPick={(s) => {
          onClose();
          router.push(`/alunos/${s.student.id}`);
        }}
        onCreate={() => {
          onClose();
          openStudent(null);
        }}
      />
    </Modal>
  );
}
