"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Delete } from "lucide-react";
import { createPin, unlock } from "@/app/auth-actions";

type Step = "unlock" | "create" | "confirm";

export function LockScreen({
  mode,
  next,
  shopName,
  ownerName,
}: {
  mode: "unlock" | "create";
  next: string;
  shopName: string;
  ownerName: string;
}) {
  const [step, setStep] = useState<Step>(mode);
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const fail = (msg: string) => {
    setError(msg);
    setPin("");
    setShake((n) => n + 1);
  };

  const submit = useCallback(
    (value: string) => {
      if (step === "create") {
        setFirst(value);
        setPin("");
        setError("");
        setStep("confirm");
        return;
      }
      if (step === "confirm") {
        if (value !== first) {
          setStep("create");
          setFirst("");
          fail("Os PINs não conferem. Vamos de novo.");
          return;
        }
        start(async () => {
          const r = await createPin(value);
          if (r.ok) window.location.replace(next);
          else fail(r.error);
        });
        return;
      }
      start(async () => {
        const r = await unlock(value);
        if (r.ok) window.location.replace(next);
        else {
          fail(r.waitSeconds ? "Muitas tentativas." : r.error);
          if (r.waitSeconds) setWait(r.waitSeconds);
        }
      });
    },
    [step, first, next],
  );

  const press = useCallback(
    (d: string) => {
      if (pending || wait > 0) return;
      setError("");
      setPin((p) => {
        if (p.length >= 4) return p;
        const v = p + d;
        if (v.length === 4) setTimeout(() => submit(v), 120);
        return v;
      });
    },
    [pending, wait, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const title =
    step === "unlock" ? "Digite seu PIN" : step === "create" ? "Crie um PIN de 4 números" : "Digite o PIN mais uma vez";
  const subtitle =
    step === "unlock"
      ? ownerName
        ? `Olá, ${ownerName.split(" ")[0]}.`
        : shopName
      : step === "create"
        ? "Ele vai proteger o caderninho sempre que você se afastar do computador."
        : "Só para confirmar.";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[300px] animate-in text-center">
        <p className="font-serif text-[28px] italic">Caderninho</p>
        <div className="mx-auto mt-3 mb-9 h-px w-10 bg-line-strong" />

        <h1 className="text-[15px] font-semibold">{title}</h1>
        <p className="mt-1 min-h-10 text-[13px] text-ink-3">{subtitle}</p>

        <div key={shake} className={`mt-6 flex justify-center gap-4 ${shake ? "animate-shake" : ""}`} aria-label={`${pin.length} de 4 dígitos`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border transition-colors ${i < pin.length ? "border-ink bg-ink" : "border-line-strong"}`}
            />
          ))}
        </div>
        <p className="mt-4 h-5 text-[13px] text-debt" role="alert">
          {wait > 0 ? `Muitas tentativas. Aguarde ${wait}s.` : error}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => press(d)} disabled={pending || wait > 0}>
              {d}
            </Key>
          ))}
          <span />
          <Key onClick={() => press("0")} disabled={pending || wait > 0}>
            0
          </Key>
          <button
            className="grid h-14 place-items-center rounded-md text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
            onClick={() => setPin((p) => p.slice(0, -1))}
            aria-label="Apagar"
          >
            <Delete size={20} strokeWidth={1.5} />
          </button>
        </div>

        {step === "unlock" && (
          <details className="mt-10 text-left text-[12px] text-ink-3">
            <summary className="cursor-pointer text-center hover:text-ink">Esqueci o PIN</summary>
            <p className="mt-2 leading-relaxed">
              Na pasta do Caderninho, abra a pasta <b>dados</b> e apague o arquivo <b>seguranca.json</b>. Depois recarregue esta
              página e crie um PIN novo. Nenhum fiado é perdido.
            </p>
          </details>
        )}
      </div>
    </main>
  );
}

function Key({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="figure h-14 rounded-md border border-line bg-surface text-[22px] transition-colors hover:border-line-strong active:bg-sunken disabled:opacity-40"
    >
      {children}
    </button>
  );
}
