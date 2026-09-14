import { StatusPill } from '@isalwa/ui';

type GuidanceNoteProps = {
  kind: 'regla' | 'consejo';
  title: string;
  items: readonly string[];
};

export function GuidanceNote({ kind, title, items }: GuidanceNoteProps) {
  return (
    <aside className="max-w-xl rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-4 py-3">
      <StatusPill tone={kind === 'regla' ? 'info' : 'neutral'}>{kind === 'regla' ? 'Regla' : 'Consejo'}</StatusPill>
      <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}
