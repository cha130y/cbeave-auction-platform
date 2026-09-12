import { ConflictException, ForbiddenException } from '@nestjs/common';

/**
 * Codes the web sign-in screen knows how to phrase. The provider callbacks are
 * top-level navigations, so anything not turned into one of these is shown to
 * the person as this API's raw JSON error body.
 */
export function resolveSocialErrorCode(error: unknown): string {
  if (error instanceof ForbiddenException) {
    return 'account_suspended';
  }

  if (error instanceof ConflictException) {
    return 'email_in_use';
  }

  return 'social_failed';
}
