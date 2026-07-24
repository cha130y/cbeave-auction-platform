import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { EnvVariable } from '../../../config/env.validation';

const GOOGLE_STATE_COOKIE_NAME = 'google_oauth_state';
const GOOGLE_STATE_COOKIE_PATH = '/auth/google/callback';
const GOOGLE_STATE_MAX_AGE_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isCallbackRequest(request)) {
      const response = context.switchToHttp().getResponse<Response>();
      const returnedState =
        typeof request.query.state === 'string'
          ? request.query.state
          : undefined;
      const storedState = this.getStoredState(request);

      this.clearStateCookie(response);

      if (
        !returnedState ||
        !storedState ||
        !this.statesMatch(returnedState, storedState)
      ) {
        throw new UnauthorizedException('Invalid Google OAuth state');
      }
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(
    context: ExecutionContext,
  ): { state: string } | undefined {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isCallbackRequest(request)) {
      return undefined;
    }

    const response = context.switchToHttp().getResponse<Response>();
    const state = randomBytes(32).toString('base64url');

    response.cookie(GOOGLE_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: GOOGLE_STATE_COOKIE_PATH,
      maxAge: GOOGLE_STATE_MAX_AGE_MS,
    });

    return { state };
  }

  private isCallbackRequest(request: Request): boolean {
    return request.originalUrl.startsWith(GOOGLE_STATE_COOKIE_PATH);
  }

  private getStoredState(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const state = cookies?.[GOOGLE_STATE_COOKIE_NAME];

    return typeof state === 'string' ? state : undefined;
  }

  private clearStateCookie(response: Response): void {
    response.clearCookie(GOOGLE_STATE_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: GOOGLE_STATE_COOKIE_PATH,
    });
  }

  private statesMatch(returnedState: string, storedState: string): boolean {
    const returnedBuffer = Buffer.from(returnedState);
    const storedBuffer = Buffer.from(storedState);

    return (
      returnedBuffer.length === storedBuffer.length &&
      timingSafeEqual(returnedBuffer, storedBuffer)
    );
  }

  private isProduction(): boolean {
    return this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }
}
