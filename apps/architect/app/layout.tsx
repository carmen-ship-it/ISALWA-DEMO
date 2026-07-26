import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
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
      <body className={`${dmSans.variable} ${instrumentSerif.variable}`}>
        {children}
      </body>
    </html>
  );
}
