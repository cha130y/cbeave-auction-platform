import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { EnvVariable } from '../../../config/env.validation';

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

//shared security behavior separate value by each provider
export type OAuthStateConfiguration = {
  cookieName: string;
  callbackPath: string;
  invalidStateMessage: string;
};

@Injectable()
export class OAuthStateService {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  createState(
    response: Response,
    configuration: OAuthStateConfiguration,
  ): string {
    const state = randomBytes(32).toString('base64url');

    response.cookie(configuration.cookieName, state, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: configuration.callbackPath,
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });
    return state;
  }

  verifyState(
    request: Request,
    response: Response,
    configuration: OAuthStateConfiguration,
  ): void {
    const returnedState =
      typeof request.query.state === 'string' ? request.query.state : undefined;

    const cookies = request.cookies as Record<string, unknown> | undefined;

    const storedValue = cookies?.[configuration.cookieName];
    const storedState =
      typeof storedValue === 'string' ? storedValue : undefined;

    this.clearStateCookie(response, configuration);

    if (
      !returnedState ||
      !storedState ||
      !this.statesMatch(returnedState, storedState)
    ) {
      throw new UnauthorizedException(configuration.invalidStateMessage);
    }
  }
  private statesMatch(returnedState: string, storedState: string): boolean {
    const returnedBuffer = Buffer.from(returnedState);
    const storedBuffer = Buffer.from(storedState);

    return (
      returnedBuffer.length === storedBuffer.length &&
      timingSafeEqual(returnedBuffer, storedBuffer)
    );
  }
  private clearStateCookie(
    response: Response,
    configuration: OAuthStateConfiguration,
  ): void {
    response.clearCookie(configuration.cookieName, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: configuration.callbackPath,
    });
  }

  private isProduction(): boolean {
    return this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }
}
