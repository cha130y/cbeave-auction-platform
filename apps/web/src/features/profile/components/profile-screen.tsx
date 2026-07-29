'use client';
import { useAuth } from '@/features/auth/use-auth';
import { updateProfile } from '@/features/profile/api/profile.api';
import {
  profileFormSchema,
  ProfileFormValues,
} from '@/features/profile/schemas/profile.schemas';
import { ApiError } from '@/lib/api/api-error';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const fieldClassName =
  'h-12 w-full rounded-xl border border-border bg-background px-4 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10';

//The backend uses null to represent an optional profile value
function optionalValue(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return 'Your profile could not be updated. Please try again.';
}

export function ProfileScreen() {
  const router = useRouter();
  const { refreshUser, status, user } = useAuth();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      displayName: '',
      bio: '',
      phone: '',
      location: '',
    },
    resolver: zodResolver(profileFormSchema),
  });

  //This waits until authentication restoration finishes.
  useEffect(() => {
    if (status === 'unauthenticated') {
      //replace() is used instead of push() so pressing the browser’s Back button does not return the unauthenticated user to the protected profile page.
      router.replace('/auth');
    }
  }, [router, status]);

  useEffect(() => {
    if (!user?.profile) {
      return;
    }

    //reset empty value(initial values are empty due to wait authentication)
    reset({
      firstName: user.profile.firstName,
      lastName: user.profile.lastName ?? '',
      displayName: user.profile.displayName,
      bio: user.profile.bio ?? '',
      phone: user.profile.phone ?? '',
      location: user.profile.location ?? '',
    });
  }, [reset, user]);

  const submit = handleSubmit(async (values) => {
    //clear old message
    setRequestError(null);
    setSuccessMessage(null);

    try {
      await updateProfile({
        firstName: values.firstName.trim(),
        lastName: optionalValue(values.lastName),
        displayName: values.displayName.trim(),
        bio: optionalValue(values.bio),
        phone: optionalValue(values.phone),
        location: optionalValue(values.location),
      });

      //retrieves the updated profile and stores it in the shared authentication state.
      await refreshUser();
      setSuccessMessage('Your profile has been updated.');
    } catch (error) {
      setRequestError(readErrorMessage(error));
    }
  });

  //reder loading card while wait session, unauthenticated loading
  if (status !== 'authenticated' || !user) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8'>
        <div className='h-96 animate-pulse rounded-3xl border border-border bg-surface' />
      </div>
    );
  }

  return (
    <section className='mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8'>
      <div className='mb-8'>
        <p className='text-xs font-black tracking-[0.22em] text-primary uppercase'>
          Account settings
        </p>
        <h1 className='mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl'>
          Your profile
        </h1>
        <p className='mt-3 text-base leading-7 text-muted'>
          Keep your public bidder and seller identity up to date.
        </p>
      </div>

      <div className='overflow-hidden rounded-3xl border border-border bg-surface'>
        <div className='border-b border-border px-5 py-6 sm:px-8'>
          <p className='text-sm font-bold text-foreground'>
            {user.profile?.fullName ?? user.email}
          </p>
          <p className='mt-1 text-sm text-muted'>{user.email}</p>
        </div>

        <form
          className='space-y-6 px-5 py-6 sm:px-8 sm:py-8'
          onSubmit={submit}
          noValidate
        >
          {requestError && (
            <div
              role='alert'
              className='rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'
            >
              {requestError}
            </div>
          )}

          {successMessage && (
            <div
              role='status'
              className='rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success'
            >
              {successMessage}
            </div>
          )}

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
                First name
              </span>
              <input
                {...register('firstName')}
                className={fieldClassName}
                autoComplete='given-name'
              />
              {errors.firstName && (
                <p className='mt-1.5 text-xs text-danger' role='alert'>
                  {errors.firstName.message}
                </p>
              )}
            </label>

            <label className='block'>
              <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
                Last name
              </span>
              <input
                {...register('lastName')}
                className={fieldClassName}
                autoComplete='family-name'
              />
              {errors.lastName && (
                <p className='mt-1.5 text-xs text-danger' role='alert'>
                  {errors.lastName.message}
                </p>
              )}
            </label>
          </div>

          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Display name
            </span>
            <input
              {...register('displayName')}
              className={fieldClassName}
              autoComplete='nickname'
            />
            <p className='mt-1.5 text-xs text-muted'>
              This name is shown publicly on auctions and bids.
            </p>
            {errors.displayName && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.displayName.message}
              </p>
            )}
          </label>

          <label className='block'>
            <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
              Bio
            </span>
            <textarea
              {...register('bio')}
              rows={5}
              className='w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted/50 focus:border-primary/70 focus:ring-3 focus:ring-primary/10'
              placeholder='Tell buyers and sellers a little about yourself.'
            />
            {errors.bio && (
              <p className='mt-1.5 text-xs text-danger' role='alert'>
                {errors.bio.message}
              </p>
            )}
          </label>

          <div className='grid gap-5 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
                Phone
              </span>
              <input
                {...register('phone')}
                className={fieldClassName}
                type='tel'
                autoComplete='tel'
              />
              {errors.phone && (
                <p className='mt-1.5 text-xs text-danger' role='alert'>
                  {errors.phone.message}
                </p>
              )}
            </label>

            <label className='block'>
              <span className='mb-2 block text-xs font-bold tracking-wider text-muted uppercase'>
                Location
              </span>
              <input
                {...register('location')}
                className={fieldClassName}
                autoComplete='address-level2'
              />
              {errors.location && (
                <p className='mt-1.5 text-xs text-danger' role='alert'>
                  {errors.location.message}
                </p>
              )}
            </label>
          </div>

          <div className='flex justify-end border-t border-border pt-6'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='min-h-12 rounded-full bg-primary px-7 text-sm font-black text-background transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
