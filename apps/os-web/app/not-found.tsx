import Link from 'next/link';
import { Button } from '@isalwa/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="isalwa-kicker">No encontrado</p>
      <h1 className="isalwa-page-title mt-4">Esta página no existe</h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--isalwa-slate)]">
        El enlace no corresponde a un registro disponible. Vuelva a Inicio o busque desde Clientes.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/inicio" className="inline-flex">
          <Button type="button" variant="primary">
            Ir a Inicio
          </Button>
        </Link>
        <Link href="/clientes" className="inline-flex">
          <Button type="button" variant="secondary">
            Ir a Clientes
          </Button>
        </Link>
      </div>
    </main>
  );
}
