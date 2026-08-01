'use client';

import { useInfiniteAdminActions } from '@/features/admin/actions/queries/admin-action.queries';
import {
  adminActionTypes,
  type AdminAction,
  type AdminActionType,
} from '@/features/admin/actions/schemas/admin-action.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { formatDateTime } from '@/lib/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ActionTypeFilter = 'ALL' | AdminActionType;

const actionTypeLabels: Record<AdminActionType, string> = {
  SUSPEND_USER: 'User suspended',
  REACTIVATE_USER: 'User reactivated',
  CREATE_CATEGORY: 'Category created',
  UPDATE_CATEGORY: 'Category updated',
  ACTIVATE_CATEGORY: 'Category activated',
  DEACTIVATE_CATEGORY: 'Category deactivated',
  CANCEL_AUCTION: 'Auction cancelled',
};

const actionTypeClassNames: Record<AdminActionType, string> = {
  SUSPEND_USER: 'border-danger/30 bg-danger/10 text-danger',
  REACTIVATE_USER: 'border-success/30 bg-success/10 text-success',
  CREATE_CATEGORY: 'border-primary/30 bg-primary/10 text-primary',
  UPDATE_CATEGORY: 'border-primary/30 bg-primary/10 text-primary',
  ACTIVATE_CATEGORY: 'border-success/30 bg-success/10 text-success',
  DEACTIVATE_CATEGORY: 'border-danger/30 bg-danger/10 text-danger',
  CANCEL_AUCTION: 'border-danger/30 bg-danger/10 text-danger',
};

function getActionTarget(action: AdminAction) {
  if (action.targetUser) {
    return {
      type: 'User',
      name: action.targetUser.displayName ?? action.targetUser.email,
      detail: action.targetUser.email,
    };
  }

  if (action.auction) {
    return {
      type: 'Auction',
      name: action.auction.title,
      detail: action.auction.status,
    };
  }

  if (action.category) {
    return {
      type: 'Category',
      name: action.category.name,
      detail: null,
    };
  }

  return {
    type: 'Target',
    name: 'No target recorded',
    detail: null,
  };
}

export function AdminActionsScreen() {
  const router = useRouter();
  const { status, user } = useAuth();

  const [actionTypeFilter, setActionTypeFilter] =
    useState<ActionTypeFilter>('ALL');

  const isAdmin = status === 'authenticated' && user?.role === 'ADMIN';

  const actionsQuery = useInfiniteAdminActions(
    {
      limit: 20,
      actionType: actionTypeFilter === 'ALL' ? undefined : actionTypeFilter,
    },
    isAdmin,
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
      return;
    }

    if (status === 'authenticated' && user?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [router, status, user?.role]);

  if (!isAdmin) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-96 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  const actions = actionsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Administration
          </p>

          <h1 className='mt-3 text-3xl font-black tracking-tight text-foreground sm:text-5xl'>
            Audit history
          </h1>

          <p className='mt-3 text-base leading-7 text-muted'>
            Review administrator actions recorded across the marketplace.
          </p>
        </div>

        <label className='block w-full sm:w-64'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Action type
          </span>

          <select
            value={actionTypeFilter}
            className='h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition focus:border-primary/70'
            onChange={(event) => {
              setActionTypeFilter(event.target.value as ActionTypeFilter);
            }}
          >
            <option value='ALL'>All actions</option>

            {adminActionTypes.map((actionType) => (
              <option key={actionType} value={actionType}>
                {actionTypeLabels[actionType]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionsQuery.isPending && (
        <div className='mt-10 h-80 animate-pulse rounded-3xl border border-border bg-surface' />
      )}

      {actionsQuery.isError && (
        <div
          role='alert'
          className='mt-10 rounded-2xl border border-danger/30 bg-danger/5 px-5 py-4 text-danger'
        >
          Audit actions could not be loaded. Please try again.
        </div>
      )}

      {actionsQuery.isSuccess && actions.length === 0 && (
        <div className='mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center'>
          <h2 className='text-xl font-extrabold text-foreground'>
            No matching actions
          </h2>

          <p className='mt-2 text-muted'>
            No administrator actions match the selected filter.
          </p>
        </div>
      )}

      {actions.length > 0 && (
        <div className='mt-10 grid gap-4'>
          {actions.map((action) => {
            const target = getActionTarget(action);
            const adminName =
              action.adminUser.displayName ?? action.adminUser.email;

            return (
              <article
                key={action.id}
                className='rounded-2xl border border-border bg-surface p-5 sm:p-6'
              >
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                        actionTypeClassNames[action.actionType]
                      }`}
                    >
                      {actionTypeLabels[action.actionType]}
                    </span>

                    <h2 className='mt-4 wrap-break-word text-xl font-black text-foreground'>
                      {target.name}
                    </h2>

                    <p className='mt-1 text-sm text-muted'>
                      {target.type}
                      {target.detail && (
                        <>
                          <span aria-hidden='true'> · </span>
                          {target.detail}
                        </>
                      )}
                    </p>
                  </div>

                  <time
                    dateTime={action.createdAt}
                    className='shrink-0 text-sm text-muted'
                  >
                    {formatDateTime(action.createdAt)}
                  </time>
                </div>

                {action.note && (
                  <div className='mt-5 rounded-xl border border-border bg-background/40 px-4 py-3'>
                    <p className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Audit note
                    </p>

                    <p className='mt-2 wrap-break-word text-sm leading-6 text-foreground'>
                      {action.note}
                    </p>
                  </div>
                )}

                <div className='mt-5 border-t border-border pt-5'>
                  <p className='text-xs font-bold tracking-wider text-muted uppercase'>
                    Administrator
                  </p>

                  <p className='mt-2 wrap-break-word text-sm font-bold text-foreground'>
                    {adminName}
                  </p>

                  <p className='mt-1 break-all text-sm text-muted'>
                    {action.adminUser.email}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {actionsQuery.hasNextPage && (
        <div className='mt-10 flex justify-center'>
          <button
            type='button'
            disabled={actionsQuery.isFetchingNextPage}
            className='min-h-11 rounded-full border border-border px-6 text-sm font-black text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
            onClick={() => {
              void actionsQuery.fetchNextPage();
            }}
          >
            {actionsQuery.isFetchingNextPage
              ? 'Loading actions...'
              : 'Load more actions'}
          </button>
        </div>
      )}
    </section>
  );
}
