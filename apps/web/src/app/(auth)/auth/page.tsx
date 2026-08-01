import type { Metadata } from 'next';

import { AuthScreen } from '@/features/auth/components/auth-screen';

export const metadata: Metadata = {
  title: 'Log in or register | CBeave',
  description: 'Access your CBeave auction account.',
};

type AuthenticationPageProps = {
  searchParams: Promise<{
    oauthError?: string | string[];
  }>;
};

export default async function AuthenticationPage({
  searchParams,
}: AuthenticationPageProps) {
  const { oauthError } = await searchParams;

  return (
    <AuthScreen
      oauthError={typeof oauthError === 'string' ? oauthError : undefined}
    />
  );
}
