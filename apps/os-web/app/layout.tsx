import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';import '../styles/visual-mobile.css';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-isalwa-sans',
  display: 'swap',
});

const display = Newsreader({
  subsets: ['latin'],
  // Titles use italic Newsreader; without this style the face silently falls
  // back to Times New Roman / Georgia and the product reads as system chrome.
  style: ['normal', 'italic'],
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
  description: 'Sistema operativo de su empresa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // next/font CSS variables must live on <html> (same element as :root remaps).
  // Putting them only on <body> made `:root { --isalwa-font-*: var(--font-*) }`
  // resolve as invalid → Tailwind’s system/Arial stack won silently.
  return (
    <html lang="es-BO" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
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
