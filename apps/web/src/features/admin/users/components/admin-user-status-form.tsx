'use client';

import {
  useReactivateAdminUser,
  useSuspendAdminUser,
} from '@/features/admin/users/queries/admin-user.queries';
import {
  changeUserStatusSchema,
  type AdminUser,
  type ChangeUserStatusInput,
} from '@/features/admin/users/schemas/admin-user.schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

export type AdminUserStatusAction = 'REACTIVATE' | 'SUSPEND';

type AdminUserStatusFormProps = {
  account: AdminUser;
  action: AdminUserStatusAction;
  onCancel: () => void;
  onSuccess: () => void;
};

export function AdminUserStatusForm({
  account,
  action,
  onCancel,
  onSuccess,
}: AdminUserStatusFormProps) {
  const suspendMutation = useSuspendAdminUser();
  const reactivateMutation = useReactivateAdminUser();

  const isSuspension = action === 'SUSPEND';
  const activeMutation = isSuspension ? suspendMutation : reactivateMutation;

  const displayName = account.profile?.displayName ?? account.email;

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ChangeUserStatusInput>({
    defaultValues: {
      note: '',
    },
    resolver: zodResolver(changeUserStatusSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      await activeMutation.mutateAsync({
        userId: account.id,
        note: values.note,
      });

      onSuccess();
    } catch {
      // The mutation error is rendered below.
    }
  });

  return (
    <form
      className='rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6'
      onSubmit={submit}
      noValidate
    >
      <div>
        <p className='text-xs font-black tracking-wider text-primary uppercase'>
          {isSuspension ? 'Suspend account' : 'Reactivate account'}
        </p>

        <h3 className='mt-2 text-xl font-black text-foreground'>
          {displayName}
        </h3>

        <p className='mt-1 text-sm text-muted'>{account.email}</p>
      </div>

      <label className='mt-5 block'>
        <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
          Audit note
        </span>

        <textarea
          {...register('note')}
          autoFocus
          rows={4}
          className='w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10'
          placeholder={
            isSuspension
              ? 'Explain why this account is being suspended.'
              : 'Explain why this account is being reactivated.'
          }
        />

        {errors.note && (
          <p className='mt-1.5 text-xs text-danger' role='alert'>
            {errors.note.message}
          </p>
        )}
      </label>

      {activeMutation.isError && (
        <div
          role='alert'
          className='mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
        >
          {activeMutation.error instanceof Error
            ? activeMutation.error.message
            : 'The account status could not be updated.'}
        </div>
      )}

      <div className='mt-5 flex flex-wrap justify-end gap-3'>
        <button
          type='button'
          disabled={activeMutation.isPending}
          className='min-h-11 rounded-full border border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type='submit'
          disabled={activeMutation.isPending}
          className={`min-h-11 rounded-full px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isSuspension
              ? 'bg-danger text-white hover:bg-danger/80'
              : 'bg-success text-background hover:bg-success/80'
          }`}
        >
          {activeMutation.isPending
            ? 'Updating...'
            : isSuspension
              ? 'Confirm suspension'
              : 'Confirm reactivation'}
        </button>
      </div>
    </form>
  );
}
