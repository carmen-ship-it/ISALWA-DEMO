import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-isalwa-sans",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-isalwa-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-isalwa-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ISALWA Architect",
  description:
    "Diseñe su empresa antes de construir software. Un descubrimiento guiado que produce el plano de su futuro sistema operativo.",
};

/** Auth + per-user workspace — never serve a cached shell across deploys. */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${sans.variable} ${display.variable} ${mono.variable}`}>
        <style>{`
          :root {
            --isalwa-font-sans: var(--font-isalwa-sans), "Segoe UI", sans-serif;
            --isalwa-font-display: var(--font-isalwa-display), Georgia, serif;
            --isalwa-font-mono: var(--font-isalwa-mono), ui-monospace, monospace;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
