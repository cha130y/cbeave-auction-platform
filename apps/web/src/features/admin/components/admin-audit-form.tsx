'use client';

import type { ReactNode, SubmitEventHandler } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

type AdminAuditFormAccent = 'danger' | 'primary';

// Full literal class strings so Tailwind can see them; do not build these by
// interpolating the accent name.
const accentClassNames: Record<
  AdminAuditFormAccent,
  { form: string; eyebrow: string; textarea: string }
> = {
  danger: {
    form: 'rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:p-6',
    eyebrow: 'text-xs font-black tracking-wider text-danger uppercase',
    textarea:
      'w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-danger/70 focus:ring-3 focus:ring-danger/10',
  },
  primary: {
    form: 'rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6',
    eyebrow: 'text-xs font-black tracking-wider text-primary uppercase',
    textarea:
      'w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10',
  },
};

export function readMutationError(
  mutation: { isError: boolean; error: unknown },
  fallbackMessage: string,
): string | null {
  if (!mutation.isError) {
    return null;
  }

  return mutation.error instanceof Error
    ? mutation.error.message
    : fallbackMessage;
}

type AdminAuditFormProps = {
  accent: AdminAuditFormAccent;
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  fieldLabel: string;
  placeholder: string;
  /** Spread of the react-hook-form `register(...)` call for the note field. */
  field: UseFormRegisterReturn;
  fieldError?: string;
  mutationError: string | null;
  cancelLabel: string;
  confirmLabel: string;
  /** Passed verbatim so each caller keeps its own confirm-button colours. */
  confirmClassName: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: SubmitEventHandler<HTMLFormElement>;
};

export function AdminAuditForm({
  accent,
  eyebrow,
  title,
  subtitle,
  fieldLabel,
  placeholder,
  field,
  fieldError,
  mutationError,
  cancelLabel,
  confirmLabel,
  confirmClassName,
  isPending,
  onCancel,
  onSubmit,
}: AdminAuditFormProps) {
  const classNames = accentClassNames[accent];

  return (
    <form className={classNames.form} onSubmit={onSubmit} noValidate>
      <div>
        <p className={classNames.eyebrow}>{eyebrow}</p>

        <h3 className='mt-2 text-xl font-black text-foreground'>{title}</h3>

        <p className='mt-1 text-sm text-muted'>{subtitle}</p>
      </div>

      <label className='mt-5 block'>
        <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
          {fieldLabel}
        </span>

        <textarea
          {...field}
          autoFocus
          rows={4}
          className={classNames.textarea}
          placeholder={placeholder}
        />

        {fieldError && (
          <p className='mt-1.5 text-xs text-danger' role='alert'>
            {fieldError}
          </p>
        )}
      </label>

      {mutationError && (
        <div
          role='alert'
          className='mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
        >
          {mutationError}
        </div>
      )}

      <div className='mt-5 flex flex-wrap justify-end gap-3'>
        <button
          type='button'
          disabled={isPending}
          className='min-h-11 rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
          onClick={onCancel}
        >
          {cancelLabel}
        </button>

        <button type='submit' disabled={isPending} className={confirmClassName}>
          {confirmLabel}
        </button>
      </div>
    </form>
  );
}
