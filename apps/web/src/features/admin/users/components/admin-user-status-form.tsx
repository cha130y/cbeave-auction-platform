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
import {
  AdminAuditForm,
  readMutationError,
} from '@/features/admin/components/admin-audit-form';
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
    <AdminAuditForm
      accent='primary'
      eyebrow={isSuspension ? 'Suspend account' : 'Reactivate account'}
      title={displayName}
      subtitle={account.email}
      fieldLabel='Audit note'
      placeholder={
        isSuspension
          ? 'Explain why this account is being suspended.'
          : 'Explain why this account is being reactivated.'
      }
      field={register('note')}
      fieldError={errors.note?.message}
      mutationError={readMutationError(
        activeMutation,
        'The account status could not be updated.',
      )}
      cancelLabel='Cancel'
      confirmLabel={
        activeMutation.isPending
          ? 'Updating...'
          : isSuspension
            ? 'Confirm suspension'
            : 'Confirm reactivation'
      }
      confirmClassName={`min-h-11 rounded-full px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isSuspension
          ? 'bg-danger text-white hover:bg-danger/80'
          : 'bg-success text-background hover:bg-success/80'
      }`}
      isPending={activeMutation.isPending}
      onCancel={onCancel}
      onSubmit={submit}
    />
  );
}
