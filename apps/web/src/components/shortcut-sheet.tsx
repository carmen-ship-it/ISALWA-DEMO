'use client';

import { useEffect, useState } from 'react';

const ROWS: { keys: string; label: string }[] = [
  { keys: '⌘ K', label: 'Abrir paleta de comandos' },
  { keys: '?', label: 'Mostrar estos atajos' },
  { keys: 'G P', label: 'Ir a Pulso' },
  { keys: 'G R', label: 'Ir a Radar' },
  { keys: 'G C', label: 'Ir a Personas' },
  { keys: 'G T', label: 'Ir a Territorio' },
  { keys: 'G S', label: 'Ir a Señal' },
  { keys: 'G X', label: 'Ir a Cierre' },
  { keys: 'G M', label: 'Ir a Memoria' },
  { keys: 'Esc', label: 'Cerrar diálogos / menú' },
];

export function ShortcutSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openSheet = () => setOpen(true);
    window.addEventListener('isalwa:open-shortcuts', openSheet);
    return () => window.removeEventListener('isalwa:open-shortcuts', openSheet);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9600] flex items-center justify-center bg-[color-mix(in_srgb,var(--isalwa-kiln)_45%,transparent)] px-4 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="isalwa-whisper w-full max-w-md rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-5 shadow-[var(--isalwa-shadow-lift)] md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="shortcut-sheet-title"
              className="text-[clamp(1.2rem,2vw,1.45rem)] text-[var(--isalwa-kiln)]"
              style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', fontWeight: 400 }}
            >
              Atajos de teclado
            </h2>
            <p className="mt-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
              Flujos de poder sin salir del teclado.
            </p>
          </div>
          <button
            type="button"
            className="rounded-[var(--isalwa-radius-control)] px-2 py-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-0">
          {ROWS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] py-2.5 last:border-0"
            >
              <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)]">{row.label}</span>
              <span className="flex shrink-0 gap-1">
                {row.keys.split(' ').map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-[var(--isalwa-mist)] border-b-2 bg-[var(--isalwa-porcelain)] px-1.5 py-0.5 font-[var(--isalwa-font-mono)] text-[10px] leading-none"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
