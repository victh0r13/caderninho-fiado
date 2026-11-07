"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cx } from "./ui";

export type ThemeChoice = "light" | "dark" | "system";

function readChoice(): ThemeChoice {
  const v = document.documentElement.dataset.theme;
  return v === "light" || v === "dark" ? v : "system";
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.theme;
    document.cookie = "tema=; path=/; max-age=0; samesite=lax";
  } else {
    root.dataset.theme = choice;
    document.cookie = `tema=${choice}; path=/; max-age=31536000; samesite=lax`;
  }
}

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Automático (segue o Mac)", icon: Monitor },
];

/** Seletor compacto de tema: claro, escuro ou automático. */
export function ThemeToggle({ withLabels }: { withLabels?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => setChoice(readChoice()), []);

  return (
    <div className="flex rounded-full border border-line p-0.5" role="radiogroup" aria-label="Tema">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={choice === id}
          title={label}
          onClick={() => {
            applyTheme(id);
            setChoice(id);
          }}
          className={cx(
            "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12px] transition",
            choice === id ? "gloss text-ink" : "border border-transparent text-ink-3 hover:text-ink",
          )}
        >
          <Icon size={14} strokeWidth={1.75} />
          {withLabels && <span>{id === "system" ? "Automático" : label}</span>}
        </button>
      ))}
    </div>
  );
}
