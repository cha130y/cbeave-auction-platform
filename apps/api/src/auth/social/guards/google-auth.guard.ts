import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import {
  OAuthStateConfiguration,
  OAuthStateService,
} from '../services/oauth-state.service';

const GOOGLE_STATE_CONFIGURATION: OAuthStateConfiguration = {
  cookieName: 'google_oauth_state',
  callbackPath: '/auth/google/callback',
  invalidStateMessage: 'Invalid Google OAuth state',
};

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly oauthStateService: OAuthStateService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isCallbackRequest(request)) {
      const response = context.switchToHttp().getResponse<Response>();

      this.oauthStateService.verifyState(
        request,
        response,
        GOOGLE_STATE_CONFIGURATION,
      );
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(
    context: ExecutionContext,
  ): { state: string; prompt: string } | undefined {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isCallbackRequest(request)) {
      return undefined;
    }

    const response = context.switchToHttp().getResponse<Response>();

    return {
      state: this.oauthStateService.createState(
        response,
        GOOGLE_STATE_CONFIGURATION,
      ),
      prompt: 'select_account',
    };
  }

  private isCallbackRequest(request: Request): boolean {
    return request.originalUrl.startsWith(
      GOOGLE_STATE_CONFIGURATION.callbackPath,
    );
  }
}
