import type { Request, Response } from 'express';
import {
  OAuthStateConfiguration,
  OAuthStateService,
} from '../services/oauth-state.service';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

const FACEBOOK_STATE_CONFIGURATION: OAuthStateConfiguration = {
  cookieName: 'facebook_oauth_state',
  callbackPath: '/auth/facebook/callback',
  invalidStateMessage: 'Invalid Facebook OAuth state',
};

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
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
        FACEBOOK_STATE_CONFIGURATION,
      );
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

    return {
      state: this.oauthStateService.createState(
        response,
        FACEBOOK_STATE_CONFIGURATION,
      ),
    };
  }

  private isCallbackRequest(request: Request): boolean {
    return request.originalUrl.startsWith(
      FACEBOOK_STATE_CONFIGURATION.callbackPath,
    );
  }
}
