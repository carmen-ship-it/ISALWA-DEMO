import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-isalwa-sans',
  display: 'swap',
});

const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-isalwa-display',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-isalwa-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ISALWA OS',
  description: 'Sistema operativo comercial de ISALWA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-BO" data-scroll-behavior="smooth">
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
