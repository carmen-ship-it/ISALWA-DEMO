'use client';

import { useActionState, useId, useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button, ContextDrawer, FeedbackNote } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { submitProductFeedbackAction, type SubmitFeedbackResult } from '@/lib/feedback/actions';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/lib/feedback/types';

type ProductFeedbackMenuProps = {
  /** Reference to product/entity being viewed, for context */
  productRef?: string;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const categoryButtonClass =
  'w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-3 text-left outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)] transition-colors';

const selectedCategoryClass =
  'w-full rounded-[var(--isalwa-radius-control)] border-2 border-[var(--isalwa-glaze)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,white)] px-3 py-3 text-left outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function ProductFeedbackMenu({ productRef }: ProductFeedbackMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="isalwa-t-fast inline-flex h-8 items-center gap-1.5 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-2.5 text-sm text-[var(--isalwa-slate)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
      >
        <span aria-hidden>💬</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-52 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white py-1 shadow-[var(--isalwa-shadow-resting)]"
        >
          {FEEDBACK_CATEGORIES.map((cat) => (
            <li key={cat.id} role="none">
              <FeedbackDrawerTrigger
                category={cat.id}
                label={cat.label}
                productRef={productRef}
                onClose={() => setOpen(false)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FeedbackDrawerTrigger({
  category,
  label,
  productRef,
  onClose,
}: {
  category: FeedbackCategory;
  label: string;
  productRef?: string;
  onClose: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2 text-left text-sm text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-porcelain)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        onClick={() => {
          onClose();
          setDrawerOpen(true);
        }}
      >
        {label}
      </button>
      <FeedbackDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        category={category}
        productRef={productRef}
      />
    </>
  );
}

function FeedbackDrawer({
  open,
  onOpenChange,
  category,
  productRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: FeedbackCategory;
  productRef?: string;
}) {
  const pathname = usePathname();
  const contentId = useId();
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState(false);

  const categoryData = FEEDBACK_CATEGORIES.find((c) => c.id === category);
  const title = categoryData?.label ?? 'Enviar feedback';

  const [state, formAction] = useActionState(
    async (
      _prev: SubmitFeedbackResult | null,
      formData: FormData,
    ): Promise<SubmitFeedbackResult | null> => {
      const result = await submitProductFeedbackAction(formData);
      if (result.ok) {
        setSuccess(true);
        setFormKey((k) => k + 1);
        // Close after brief delay so user sees success
        setTimeout(() => {
          onOpenChange(false);
          setSuccess(false);
        }, 1500);
      }
      return result;
    },
    null,
  );

  const handleClose = () => {
    onOpenChange(false);
    setFormKey((k) => k + 1);
    setSuccess(false);
  };

  return (
    <ContextDrawer open={open} title={title} onClose={handleClose}>
      {success ? (
        <FeedbackNote tone="success" title="¡Gracias!" detail="Su feedback fue recibido." />
      ) : (
        <form key={formKey} action={formAction} className="space-y-5">
          <input type="hidden" name="category" value={category} />
          {productRef ? <input type="hidden" name="productRef" value={productRef} /> : null}
          <input type="hidden" name="pageUrl" value={pathname} />

          <p className="text-sm text-[var(--isalwa-slate)]">
            {categoryData?.description}
          </p>

          <div>
            <label htmlFor={contentId} className="isalwa-section-label">
              ¿Qué observó?
            </label>
            <textarea
              id={contentId}
              name="content"
              required
              rows={4}
              className={fieldClass}
              placeholder="Describa lo que observó para que podamos investigar..."
            />
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-[var(--isalwa-tint-red-ink)]" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <CommandSubmitButton label="Enviar" pendingLabel="Enviando…" />
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </ContextDrawer>
  );
}
