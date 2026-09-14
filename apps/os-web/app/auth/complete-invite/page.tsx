import { CompleteInviteForm } from '@/components/auth/complete-invite-form';

export default function CompleteInvitePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)]">
          <span className="font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
            I
          </span>
        </div>
        <p className="isalwa-kicker mt-6">Acceso seguro</p>
        <h1 className="isalwa-page-title mt-4">Crear acceso a ISALWA</h1>
      </div>
      <CompleteInviteForm />
    </main>
  );
}
