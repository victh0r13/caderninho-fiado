"use client";

import { useTransition } from "react";
import { loadSampleData } from "@/app/actions";
import { useToast } from "./ui";

export function SampleDataButton() {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      className="btn btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await loadSampleData();
            toast({ kind: "success", text: "Dados de exemplo carregados." });
          } catch (e) {
            toast({ kind: "error", text: (e as Error).message });
          }
        })
      }
    >
      {pending ? "Carregando…" : "Carregar exemplo"}
    </button>
  );
}
