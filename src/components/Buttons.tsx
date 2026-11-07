"use client";

import type { ReactNode } from "react";
import { useApp } from "./AppShell";
import { cx } from "./ui";

type Common = { className?: string; children: ReactNode; title?: string };

export function SaleButton({ studentId, className, children, title }: Common & { studentId?: string }) {
  const { openSale } = useApp();
  return (
    <button title={title} className={cx("btn", className ?? "btn-primary")} onClick={() => openSale(studentId)}>
      {children}
    </button>
  );
}

export function PaymentButton({ studentId, amount, className, children, title }: Common & { studentId?: string; amount?: number }) {
  const { openPayment } = useApp();
  return (
    <button title={title} className={cx("btn", className ?? "btn-success")} onClick={() => openPayment(studentId, amount)}>
      {children}
    </button>
  );
}

export function ChargeButton({ studentId, className, children, title }: Common & { studentId: string }) {
  const { openCharge } = useApp();
  return (
    <button title={title} className={cx("btn", className ?? "btn-whatsapp")} onClick={() => openCharge(studentId)}>
      {children}
    </button>
  );
}

export function StudentButton({ studentId, className, children, title }: Common & { studentId?: string | null }) {
  const { openStudent } = useApp();
  return (
    <button title={title} className={cx("btn", className ?? "btn-secondary")} onClick={() => openStudent(studentId ?? null)}>
      {children}
    </button>
  );
}
