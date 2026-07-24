import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { GoogleAuthGuard } from './social/guards/google-auth.guard';
import { FacebookAuthGuard } from './social/guards/facebook-auth.guard';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    expiresAt: Date,
  ): void {
    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';

    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: expiresAt,
    });
  }

  private getRefreshToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;

    return typeof cookies?.refresh_token === 'string'
      ? cookies.refresh_token
      : undefined;
  }

  private clearRefreshTokenCookie(response: Response): void {
    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';

    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  private async completeSocialLogin(
    request: SocialAuthenticatedRequest,
    response: Response,
    provider: 'google' | 'facebook',
  ): Promise<void> {
    const result = await this.authService.loginWithSocialProfile(request.user);

    this.setRefreshTokenCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    const webCallbackUrl = new URL(
      '/auth/callback',
      this.configService.get('WEB_APP_URL', { infer: true }),
    );

    webCallbackUrl.searchParams.set('provider', provider);

    response.redirect(webCallbackUrl.toString());
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
    //HTTP response access
    //passthrough : modify headers or cookies ; ex ==> response.cookie(...);
    //Response is the Express response object. It is needed to add the refresh-token cookie
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto);

    this.setRefreshTokenCookie(
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
    const currentRefreshToken = this.getRefreshToken(request);

    const result = await this.authService.refresh(currentRefreshToken);

    this.setRefreshTokenCookie(
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
    const currentRefreshToken = this.getRefreshToken(request);

    await this.authService.logout(currentRefreshToken);

    this.clearRefreshTokenCookie(response);
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
    await this.completeSocialLogin(request, response, 'facebook');
  }
}
