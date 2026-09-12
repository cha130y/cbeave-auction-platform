import { ApiError } from '@/lib/api/api-error';

export const SUSPENDED_ACCOUNT_MESSAGE =
  'This account has been suspended, so it cannot be used to sign in. Contact an administrator if you think this is a mistake.';

// apps/api answers a suspended account with a short status phrase. It is
// accurate but tells the person nothing about what to do next, and a suspended
// account can arrive here from the password form or from a provider callback,
// so both routes say the same sentence.
const API_MESSAGE_OVERRIDES: Record<string, string> = {
  'Account is not active': SUSPENDED_ACCOUNT_MESSAGE,
};

// Keyed by the codes apps/api sends back on a failed provider callback. An
// unknown code still reaches a person, so it falls back to the generic line
// rather than leaving the screen silent about why sign-in stopped.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  facebook_cancelled:
    'Facebook login was cancelled. No account changes were made.',
  account_suspended: SUSPENDED_ACCOUNT_MESSAGE,
  email_in_use:
    'This email already belongs to a CBeave account. Sign in the way you did the first time.',
  social_failed: 'Sign-in could not be completed. Please try again.',
};

export function readAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return API_MESSAGE_OVERRIDES[error.message] ?? error.message;
  }

  return 'Something went wrong. Please try again.';
}

export function readOauthErrorMessage(oauthError: string | undefined) {
  if (!oauthError) {
    return null;
  }

  return OAUTH_ERROR_MESSAGES[oauthError] ?? OAUTH_ERROR_MESSAGES.social_failed;
}
