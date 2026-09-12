import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '../config/env.validation';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import type { SocialAuthenticatedRequest } from './social/types/social-authenticated-request.type';
import type { LoginResult } from './types/login-result.type';
import { GoogleAuthGuard } from './social/guards/google-auth.guard';
import { FacebookAuthGuard } from './social/guards/facebook-auth.guard';
import { RefreshTokenCookieService } from './services/refresh-token-cookie.service';
import { resolveSocialErrorCode } from './social/utils/resolve-social-error-code.util';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvVariable, true>,
    private readonly refreshTokenCookieService: RefreshTokenCookieService,
  ) {}

  private async completeSocialLogin(
    request: SocialAuthenticatedRequest,
    response: Response,
    provider: 'google' | 'facebook',
  ): Promise<void> {
    let result: LoginResult;

    try {
      result = await this.authService.loginWithSocialProfile(request.user);
    } catch (error) {
      const oauthError = resolveSocialErrorCode(error);

      // A suspended account or a clashing email is an expected outcome that the
      // redirect already explains. Anything else is a fault, and the redirect
      // would otherwise be the only trace it ever left.
      if (oauthError === 'social_failed') {
        this.logger.error(
          `Unexpected ${provider} sign-in failure`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      this.redirectToAuthScreen(response, oauthError);
      return;
    }

    this.refreshTokenCookieService.set(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    const webCallbackUrl = this.createWebAppUrl('/auth/callback');

    webCallbackUrl.searchParams.set('provider', provider);

    response.redirect(webCallbackUrl.toString());
  }

  private redirectToAuthScreen(response: Response, oauthError: string): void {
    const webAuthUrl = this.createWebAppUrl('/auth');

    webAuthUrl.searchParams.set('oauthError', oauthError);

    response.redirect(webAuthUrl.toString());
  }

  private createWebAppUrl(path: string): URL {
    return new URL(
      path,
      this.configService.get('WEB_APP_URL', { infer: true }),
    );
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<MessageResponseDto> {
    await this.authService.register(registerDto);

    return { message: 'Registered successfully' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    // passthrough keeps Nest serialising the returned body while the Express
    // response is still available for the refresh-token cookie.
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto);

    this.refreshTokenCookieService.set(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponseDto> {
    const currentRefreshToken = this.refreshTokenCookieService.read(request);

    const result = await this.authService.refresh(currentRefreshToken);

    this.refreshTokenCookieService.set(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const currentRefreshToken = this.refreshTokenCookieService.read(request);

    await this.authService.logout(currentRefreshToken);

    this.refreshTokenCookieService.clear(response);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {
    //GoogleAuthGuard redirects the browser to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() request: SocialAuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    await this.completeSocialLogin(request, response, 'google');
  }

  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  facebookLogin(): void {
    // FacebookAuthGuard redirects the browser to Facebook.
  }

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(
    @Req() request: SocialAuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    if (request.query.error === 'access_denied') {
      this.redirectToAuthScreen(response, 'facebook_cancelled');
      return;
    }

    await this.completeSocialLogin(request, response, 'facebook');
  }
}
