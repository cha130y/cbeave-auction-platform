'use client';

import { useAuth } from '@/features/auth/use-auth';
import { updateProfileAvatar } from '@/features/profile/api/profile.api';
import { ApiError } from '@/lib/api/api-error';
import Image from 'next/image';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const ACCEPTED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function createInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Your avatar could not be updated. Please try again.';
}

export function ProfileAvatarForm() {
  const { refreshUser, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!user?.profile) {
    return null;
  }

  const displayName = user.profile.displayName;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;

    setRequestError(null);
    setSuccessMessage(null);
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      setRequestError('Choose a JPEG, PNG, or WebP image.');
      event.currentTarget.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setRequestError('The avatar must be no larger than 2 MB.');
      event.currentTarget.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestError(null);
    setSuccessMessage(null);

    if (!selectedFile) {
      setRequestError('Choose an image before uploading.');
      return;
    }

    setIsUploading(true);

    try {
      await updateProfileAvatar(selectedFile);
      await refreshUser();

      setSelectedFile(null);
      setSuccessMessage('Your avatar has been updated.');

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      setRequestError(readErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex min-w-0 items-center gap-4'>
        {user.profile.avatarUrl ? (
          <Image
            src={user.profile.avatarUrl}
            alt={`${displayName} avatar`}
            width={80}
            height={80}
            referrerPolicy='no-referrer'
            unoptimized
            className='size-20 shrink-0 rounded-full object-cover'
          />
        ) : (
          <span
            aria-hidden='true'
            className='grid size-20 shrink-0 place-items-center rounded-full bg-linear-to-br from-accent to-primary text-xl font-black text-white'
          >
            {createInitials(displayName)}
          </span>
        )}

        <div className='min-w-0'>
          <p className='truncate text-base font-bold text-foreground'>
            {user.profile.fullName}
          </p>
          <p className='mt-1 truncate text-sm text-muted'>{user.email}</p>
          <p className='mt-2 text-xs text-muted'>
            JPEG, PNG, or WebP. Maximum 2 MB.
          </p>
        </div>
      </div>

      <form className='space-y-3 sm:max-w-72' onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          id='profile-avatar'
          type='file'
          accept='image/jpeg,image/png,image/webp'
          className='sr-only'
          onChange={handleFileChange}
        />

        <div className='flex flex-wrap items-center gap-3'>
          <label
            htmlFor='profile-avatar'
            className='inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-border-strong px-4 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary'
          >
            Choose image
          </label>

          <button
            type='submit'
            disabled={!selectedFile || isUploading}
            className='min-h-10 rounded-full bg-primary px-4 text-sm font-black text-background transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isUploading ? 'Uploading...' : 'Upload avatar'}
          </button>
        </div>

        {selectedFile && (
          <p className='truncate text-xs text-muted'>
            Selected: {selectedFile.name}
          </p>
        )}

        {requestError && (
          <p role='alert' className='text-xs text-danger'>
            {requestError}
          </p>
        )}

        {successMessage && (
          <p role='status' className='text-xs text-success'>
            {successMessage}
          </p>
        )}
      </form>
    </div>
  );
}
