import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Caderninho", template: "%s · Caderninho" },
  description: "Controle de fiado da cantina da escola",
  appleWebApp: { capable: true, title: "Caderninho", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e5df" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get("tema")?.value;
  const theme = tema === "light" || tema === "dark" ? tema : undefined;
  return (
    <html lang="pt-BR" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
