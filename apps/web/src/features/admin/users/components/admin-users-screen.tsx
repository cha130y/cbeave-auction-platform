'use client';

import {
  AdminUserStatusForm,
  type AdminUserStatusAction,
} from '@/features/admin/users/components/admin-user-status-form';
import { useInfiniteAdminUsers } from '@/features/admin/users/queries/admin-user.queries';
import type {
  AdminUser,
  AdminUserStatus,
} from '@/features/admin/users/schemas/admin-user.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { formatDateTime, formatOptionalDateTime } from '@/lib/formatters';

type StatusFilter = 'ALL' | AdminUserStatus;
type PendingStatusChange = {
  account: AdminUser;
  action: AdminUserStatusAction;
} | null;
const statusClassNames: Record<AdminUserStatus, string> = {
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  SUSPENDED: 'border-danger/30 bg-danger/10 text-danger',
  DEACTIVATED: 'border-border bg-surface-muted text-muted',
};

export function AdminUsersScreen() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedStatusChange, setSelectedStatusChange] =
    useState<PendingStatusChange>(null);
  const statusFormRef = useRef<HTMLDivElement>(null);

  const isAdmin = status === 'authenticated' && user?.role === 'ADMIN';

  const usersQuery = useInfiniteAdminUsers(
    {
      limit: 20,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    },
    //query when isAdmin = true
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

  //runs after React renders the selected audit form
  useEffect(() => {
    if (!selectedStatusChange) {
      return;
    }

    statusFormRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedStatusChange]);

  if (!isAdmin) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-96 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  const users = usersQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className='mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
            Administration
          </p>

          <h1 className='mt-3 text-3xl font-black tracking-tight text-foreground sm:text-5xl'>
            User management
          </h1>

          <p className='mt-3 text-base leading-7 text-muted'>
            Review user accounts and manage their access to CBeave.
          </p>
        </div>

        <label className='block w-full sm:w-52'>
          <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
            Account status
          </span>

          <select
            value={statusFilter}
            className='h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition focus:border-primary/70'
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setSelectedStatusChange(null);
            }}
          >
            <option value='ALL'>All statuses</option>
            <option value='ACTIVE'>Active</option>
            <option value='SUSPENDED'>Suspended</option>
            <option value='DEACTIVATED'>Deactivated</option>
          </select>
        </label>
      </div>

      {selectedStatusChange && (
        <div ref={statusFormRef} className='mt-10 scroll-mt-24'>
          <AdminUserStatusForm
            key={`${selectedStatusChange.account.id}-${selectedStatusChange.action}`}
            account={selectedStatusChange.account}
            action={selectedStatusChange.action}
            onCancel={() => {
              setSelectedStatusChange(null);
            }}
            onSuccess={() => {
              setSelectedStatusChange(null);
            }}
          />
        </div>
      )}

      {usersQuery.isPending && (
        <div className='mt-10 h-80 animate-pulse rounded-3xl border border-border bg-surface' />
      )}

      {usersQuery.isError && (
        <div
          role='alert'
          className='mt-10 rounded-2xl border border-danger/30 bg-danger/5 px-5 py-4 text-danger'
        >
          User accounts could not be loaded. Please try again.
        </div>
      )}

      {usersQuery.isSuccess && users.length === 0 && (
        <div className='mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center'>
          <h2 className='text-xl font-extrabold text-foreground'>
            No matching users
          </h2>

          <p className='mt-2 text-muted'>
            No user accounts match the selected status.
          </p>
        </div>
      )}

      {users.length > 0 && (
        <div className='mt-10 grid gap-4 lg:grid-cols-2'>
          {users.map((account) => {
            const displayName =
              account.profile?.displayName ?? account.email.split('@')[0];

            return (
              <article
                key={account.id}
                className='rounded-2xl border border-border bg-surface p-5 sm:p-6'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <span
                      aria-hidden='true'
                      className='grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted text-sm font-black text-foreground'
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </span>

                    <div className='min-w-0'>
                      <h2 className='truncate text-lg font-black text-foreground'>
                        {displayName}
                      </h2>

                      <p className='truncate text-sm text-muted'>
                        {account.email}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${
                      statusClassNames[account.status]
                    }`}
                  >
                    {account.status}
                  </span>
                </div>

                <dl className='mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2'>
                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Joined
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {formatDateTime(account.createdAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Last login
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {formatOptionalDateTime(
                        account.lastLoginAt,
                        'Never signed in',
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Email
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {account.emailVerifiedAt ? 'Verified' : 'Not verified'}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-xs font-bold tracking-wider text-muted uppercase'>
                      Role
                    </dt>

                    <dd className='mt-1 text-sm text-foreground'>
                      {account.role}
                    </dd>
                  </div>
                </dl>

                <div className='mt-5 flex justify-end border-t border-border pt-5'>
                  {account.status === 'ACTIVE' && (
                    <button
                      type='button'
                      className='min-h-10 rounded-full border border-danger/40 px-4 text-sm font-bold text-danger transition hover:bg-danger/10'
                      onClick={() => {
                        setSelectedStatusChange({
                          account,
                          action: 'SUSPEND',
                        });
                      }}
                    >
                      Suspend account
                    </button>
                  )}

                  {account.status === 'SUSPENDED' && (
                    <button
                      type='button'
                      className='min-h-10 rounded-full border border-success/40 px-4 text-sm font-bold text-success transition hover:bg-success/10'
                      onClick={() => {
                        setSelectedStatusChange({
                          account,
                          action: 'REACTIVATE',
                        });
                      }}
                    >
                      Reactivate account
                    </button>
                  )}

                  {account.status === 'DEACTIVATED' && (
                    <p className='text-sm text-muted'>
                      Deactivated accounts cannot be managed here.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {usersQuery.hasNextPage && (
        <div className='mt-10 flex justify-center'>
          <button
            type='button'
            disabled={usersQuery.isFetchingNextPage}
            className='min-h-11 rounded-full border border-border px-6 text-sm font-black text-foreground transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
            onClick={() => {
              void usersQuery.fetchNextPage();
            }}
          >
            {usersQuery.isFetchingNextPage
              ? 'Loading accounts...'
              : 'Load more accounts'}
          </button>
        </div>
      )}
    </section>
  );
}
