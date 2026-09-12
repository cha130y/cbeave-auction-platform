import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { EnvVariable } from '../../config/env.validation';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/auth';

/**
 * The refresh cookie is set on sign-in, rotated on refresh, and cleared on
 * logout. A browser only drops a cookie when the clearing attributes match the
 * ones it was set with, so all three paths share one options builder.
 */
@Injectable()
export class RefreshTokenCookieService {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  set(response: Response, refreshToken: string, expiresAt: Date): void {
    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...this.createCookieOptions(),
      expires: expiresAt,
    });
  }

  read(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const refreshToken = cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    return typeof refreshToken === 'string' ? refreshToken : undefined;
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.createCookieOptions());
  }

  private createCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    };
  }
}
