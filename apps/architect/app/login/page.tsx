import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <main className="isalwa-enter relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)]">
          <span className="architect-serif text-2xl text-[var(--isalwa-kiln)]">A</span>
        </div>
        <p className="isalwa-kicker mt-6">{t("loginPage.kicker")}</p>
        <h1 className="architect-serif mt-4 text-4xl leading-tight text-[var(--isalwa-kiln)] sm:text-5xl">
          {t("loginPage.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[var(--isalwa-slate)]">
          {t("loginPage.description")}
        </p>
      </div>

      <Suspense fallback={<p className="text-center text-sm text-[var(--isalwa-slate)]/60">{t("loginPage.loading")}</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
