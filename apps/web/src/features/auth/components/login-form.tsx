'use client';

import { readAuthErrorMessage } from '@/features/auth/auth-messages';
import {
  AuthSubmitButton,
  PasswordField,
  TextField,
} from '@/features/auth/components/auth-fields';
import { AuthenticationStatus } from '@/features/auth/components/auth-status';
import {
  loginCredentialsSchema,
  type LoginFormValues,
} from '@/features/auth/schemas/auth.schemas';
import { useAuth } from '@/features/auth/use-auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function LoginForm() {
  const { login } = useAuth();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(loginCredentialsSchema),
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setRequestError(null);

    try {
      await login({ email, password });
    } catch (error) {
      setRequestError(readAuthErrorMessage(error));
    }
  });

  return (
    <form className='space-y-4' onSubmit={submit} noValidate>
      <AuthenticationStatus message={requestError} />

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
        autoComplete='current-password'
        error={errors.password?.message}
        label='PASSWORD'
        registration={register('password')}
      />

      <AuthSubmitButton
        isSubmitting={isSubmitting}
        label='Log In'
        pendingLabel='Signing in…'
      />
    </form>
  );
}
