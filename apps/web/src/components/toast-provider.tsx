'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type Toast = {
  id: number;
  message: string;
  tone: 'neutral' | 'success' | 'danger';
};

type ToastApi = {
  push: (message: string, tone?: Toast['tone']) => void;
};

const ToastCtx = createContext<ToastApi>({ push: () => undefined });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast['tone'] = 'neutral') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[9500] flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((t) => {
          const color =
            t.tone === 'success'
              ? 'var(--isalwa-success)'
              : t.tone === 'danger'
                ? 'var(--isalwa-danger)'
                : 'var(--isalwa-kiln)';
          return (
            <div
              key={t.id}
              className="isalwa-whisper pointer-events-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2.5 text-[var(--isalwa-text-sm)] shadow-[var(--isalwa-shadow-lift)]"
              style={{ color }}
              role="status"
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
