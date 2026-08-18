'use client';

import { useCancelAdminAuction } from '@/features/admin/auctions/queries/admin-auction.queries';
import {
  cancelAdminAuctionFormSchema,
  type AdminAuction,
  type CancelAdminAuctionFormValues,
} from '@/features/admin/auctions/schemas/admin-auction.schemas';
import {
  AdminAuditForm,
  readMutationError,
} from '@/features/admin/components/admin-audit-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

type AdminAuctionCancellationFormProps = {
  auction: AdminAuction;
  onCancel: () => void;
  onSuccess: () => void;
};

export function AdminAuctionCancellationForm({
  auction,
  onCancel,
  onSuccess,
}: AdminAuctionCancellationFormProps) {
  const cancelMutation = useCancelAdminAuction();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CancelAdminAuctionFormValues>({
    defaultValues: {
      reason: '',
    },
    resolver: zodResolver(cancelAdminAuctionFormSchema),
  });

  const submit = handleSubmit(async (values) => {
    try {
      await cancelMutation.mutateAsync({
        auctionId: auction.id,
        reason: values.reason,
      });

      onSuccess();
    } catch {
      // The mutation error is rendered below.
    }
  });

  return (
    <AdminAuditForm
      accent='danger'
      eyebrow='Cancel auction'
      title={auction.title}
      subtitle={
        <>
          Listed by {auction.seller.displayName} · {auction.seller.email}
        </>
      }
      fieldLabel='Audit reason'
      placeholder='Explain why this auction is being cancelled.'
      field={register('reason')}
      fieldError={errors.reason?.message}
      mutationError={readMutationError(
        cancelMutation,
        'The auction could not be cancelled.',
      )}
      cancelLabel='Keep auction'
      confirmLabel={
        cancelMutation.isPending ? 'Cancelling...' : 'Confirm cancellation'
      }
      confirmClassName='min-h-11 rounded-full bg-danger px-5 text-sm font-black text-white transition hover:bg-danger/80 disabled:cursor-not-allowed disabled:opacity-50'
      isPending={cancelMutation.isPending}
      onCancel={onCancel}
      onSubmit={submit}
    />
  );
}
