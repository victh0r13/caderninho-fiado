import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="figure text-6xl text-ink-3">404</p>
      <h1 className="mt-4 text-lg font-semibold">Esta página do caderno está em branco.</h1>
      <Link href="/" className="btn btn-primary mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
