"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { normalize } from "@/lib/format";
import type { StudentSummary } from "@/lib/types";
import { BalanceText, cx } from "./ui";

export function StudentPicker({
  summaries,
  onPick,
  onCreate,
  sortDebtorsFirst,
}: {
  summaries: StudentSummary[];
  onPick: (s: StudentSummary) => void;
  onCreate?: (name: string) => void;
  sortDebtorsFirst?: boolean;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const nq = normalize(q);
    let list = summaries.filter((s) => !s.student.archived);
    if (nq) {
      list = list.filter((s) => normalize(`${s.student.name} ${s.student.grade} ${s.student.guardianName}`).includes(nq));
      list.sort((a, b) => {
        const an = normalize(a.student.name).startsWith(nq) ? 0 : 1;
        const bn = normalize(b.student.name).startsWith(nq) ? 0 : 1;
        return an - bn || a.student.name.localeCompare(b.student.name);
      });
    } else if (sortDebtorsFirst) {
      list.sort((a, b) => b.balance - a.balance || a.student.name.localeCompare(b.student.name));
    } else {
      list.sort(
        (a, b) => (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "") || a.student.name.localeCompare(b.student.name),
      );
    }
    return list.slice(0, 50);
  }, [q, summaries, sortDebtorsFirst]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  return (
    <div>
      <div className="relative">
        <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
        <input
          autoFocus
          className="input h-11 pl-9 text-[15px]"
          placeholder="Nome do aluno, turma ou responsável"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              // Enter só escolhe; cadastrar aluno novo exige clicar no botão.
              if (results[idx]) onPick(results[idx]);
            }
          }}
        />
      </div>
      {!q && results.length > 0 && (
        <p className="mt-4 mb-1 text-[12px] text-ink-3">{sortDebtorsFirst ? "Quem deve mais" : "Compraram por último"}</p>
      )}
      <div ref={listRef} className="mt-2 max-h-[50vh] overflow-y-auto">
        {results.map((s, i) => (
          <button
            key={s.student.id}
            data-idx={i}
            onMouseEnter={() => setIdx(i)}
            onClick={() => onPick(s)}
            className={cx(
              "flex w-full items-baseline gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
              i === idx ? "bg-sunken" : "",
            )}
          >
            <span className={cx("truncate text-[14.5px]", s.student.blocked && "text-ink-3 line-through")}>{s.student.name}</span>
            <span className="shrink-0 text-[12.5px] text-ink-3">{s.student.grade}</span>
            {s.overLimit && <span className="shrink-0 text-[12px] text-debt">no limite</span>}
            <span className="ml-auto shrink-0 text-[13.5px]">
              {s.balance !== 0 ? <BalanceText cents={s.balance} /> : <span className="text-ink-3">—</span>}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-ink-3">
            Nenhum aluno encontrado.
            {onCreate && q.trim() && (
              <div className="mt-3">
                <button className="btn btn-secondary" onClick={() => onCreate(q.trim())}>
                  Cadastrar “{q.trim()}”
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
