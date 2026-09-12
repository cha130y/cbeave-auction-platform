'use client';

import { register as registerRequest } from '@/features/auth/api/auth.api';
import { readAuthErrorMessage } from '@/features/auth/auth-messages';
import {
  AuthSubmitButton,
  PasswordField,
  TextField,
} from '@/features/auth/components/auth-fields';
import { AuthenticationStatus } from '@/features/auth/components/auth-status';
import {
  registerCredentialsSchema,
  type RegisterFormValues,
} from '@/features/auth/schemas/auth.schemas';
import { cn } from '@/lib/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

const STRENGTH_LEVELS = [1, 2, 3, 4];

// One point per habit the API's own password rules reward, so the meter moves
// for the same reasons a rejected password would.
function countPasswordStrength(password: string): number {
  return [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = countPasswordStrength(password);
  const reachedColor =
    strength <= 1 ? 'bg-danger' : strength <= 3 ? 'bg-primary' : 'bg-success';

  return (
    <div
      className='-mt-1 grid grid-cols-4 gap-1.5'
      aria-label='Password strength'
    >
      {STRENGTH_LEVELS.map((level) => (
        <span
          key={level}
          className={cn(
            'h-1 rounded-full transition',
            strength >= level ? reachedColor : 'bg-white/8',
          )}
        />
      ))}
    </div>
  );
}

export function RegisterForm({
  onRegistered,
}: {
  onRegistered: (email: string, message: string) => void;
}) {
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(registerCredentialsSchema),
  });
  const password = useWatch({
    control,
    name: 'password',
  });

  const submit = handleSubmit(async (values) => {
    setRequestError(null);

    try {
      const lastName = values.lastName.trim();
      const message = await registerRequest({
        firstName: values.firstName.trim(),
        ...(lastName ? { lastName } : {}),
        displayName: values.displayName.trim(),
        email: values.email,
        password: values.password,
      });

      onRegistered(values.email, message);
    } catch (error) {
      setRequestError(readAuthErrorMessage(error));
    }
  });

  return (
    <form className='space-y-4' onSubmit={submit} noValidate>
      <AuthenticationStatus message={requestError} />

      <div className='grid gap-4 sm:grid-cols-2'>
        <TextField
          autoComplete='given-name'
          error={errors.firstName?.message}
          label='FIRST NAME'
          placeholder='John'
          registration={register('firstName')}
        />

        <TextField
          autoComplete='family-name'
          error={errors.lastName?.message}
          label='LAST NAME'
          placeholder='Smith'
          registration={register('lastName')}
        />
      </div>

      <TextField
        autoComplete='nickname'
        error={errors.displayName?.message}
        label='DISPLAY NAME'
        placeholder='AuctionJohn'
        registration={register('displayName')}
      />

      <TextField
        autoComplete='email'
        error={errors.email?.message}
        inputMode='email'
        label='EMAIL ADDRESS'
        placeholder='you@example.com'
        registration={register('email')}
        type='email'
      />

      <PasswordField
        autoComplete='new-password'
        error={errors.password?.message}
        label='PASSWORD'
        registration={register('password')}
      />

      <PasswordStrengthMeter password={password} />

      <PasswordField
        autoComplete='new-password'
        error={errors.confirmPassword?.message}
        label='CONFIRM PASSWORD'
        registration={register('confirmPassword')}
      />

      <AuthSubmitButton
        isSubmitting={isSubmitting}
        label='Create Account'
        pendingLabel='Creating account…'
      />
    </form>
  );
}
