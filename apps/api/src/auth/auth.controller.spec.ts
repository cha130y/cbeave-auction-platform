import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../generated/prisma/enums';
import { LoginDto } from './dto/login.dto';
import type { SocialAuthenticatedRequest } from './social/types/social-authenticated-request.type';
import { RefreshTokenCookieService } from './services/refresh-token-cookie.service';

describe('AuthController refresh token cookie', () => {
  let authController: AuthController;

  const loginMock = jest.fn() as jest.MockedFunction<AuthService['login']>;
  const refreshMock = jest.fn() as jest.MockedFunction<AuthService['refresh']>;
  const logoutMock = jest.fn() as jest.MockedFunction<AuthService['logout']>;

  const configGetMock = jest.fn() as jest.MockedFunction<() => string>;

  const cookieMock = jest.fn() as jest.MockedFunction<Response['cookie']>;
  const clearCookieMock = jest.fn() as jest.MockedFunction<
    Response['clearCookie']
  >;

  const responseMock = {
    cookie: cookieMock,
    clearCookie: clearCookieMock,
  } as unknown as Response;

  const requestMock = {
    cookies: { refresh_token: 'current-refresh-token' },
  } as unknown as Request;

  const loginDto: LoginDto = {
    email: 'john@example.com',
    password: 'Secure123!',
  };

  const refreshTokenExpiresAt = new Date('2026-01-08T00:00:00.000Z');

  const loginResult = {
    accessToken: 'access-token',
    refreshToken: 'new-refresh-token',
    refreshTokenExpiresAt,
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'john@example.com',
      role: UserRole.USER,
      profile: null,
    },
  };

  const setCookieOptions = (): CookieOptions =>
    cookieMock.mock.calls[0][2] as CookieOptions;

  const clearCookieOptions = (): CookieOptions =>
    clearCookieMock.mock.calls[0][1] as CookieOptions;

  const setCookieOptionsWithoutExpiry = (): CookieOptions => {
    const options = { ...setCookieOptions() };

    delete options.expires;

    return options;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RefreshTokenCookieService,
        {
          provide: AuthService,
          useValue: {
            login: loginMock,
            refresh: refreshMock,
            logout: logoutMock,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('sets a cross-site refresh token cookie in production', async () => {
    configGetMock.mockReturnValue('production');
    loginMock.mockResolvedValue(loginResult);

    await authController.login(loginDto, responseMock);

    expect(cookieMock).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/auth',
        expires: refreshTokenExpiresAt,
      },
    );
  });

  it('keeps the refresh token cookie same-site outside production', async () => {
    configGetMock.mockReturnValue('development');
    loginMock.mockResolvedValue(loginResult);

    await authController.login(loginDto, responseMock);

    expect(setCookieOptions()).toMatchObject({
      secure: false,
      sameSite: 'lax',
    });
  });

  it('clears the cookie with the attributes it was set with in production', async () => {
    configGetMock.mockReturnValue('production');
    loginMock.mockResolvedValue(loginResult);
    logoutMock.mockResolvedValue(undefined);

    await authController.login(loginDto, responseMock);
    await authController.logout(requestMock, responseMock);

    expect(clearCookieMock).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/auth',
    });

    expect(clearCookieOptions()).toEqual(setCookieOptionsWithoutExpiry());
  });

  it('clears the cookie with the attributes it was set with outside production', async () => {
    configGetMock.mockReturnValue('development');
    loginMock.mockResolvedValue(loginResult);
    logoutMock.mockResolvedValue(undefined);

    await authController.login(loginDto, responseMock);
    await authController.logout(requestMock, responseMock);

    expect(clearCookieOptions()).toEqual(setCookieOptionsWithoutExpiry());
  });

  it('rotates the cookie with the refreshed token', async () => {
    configGetMock.mockReturnValue('production');
    refreshMock.mockResolvedValue({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
      refreshTokenExpiresAt,
    });

    const result = await authController.refresh(requestMock, responseMock);

    expect(refreshMock).toHaveBeenCalledWith('current-refresh-token');
    expect(result).toEqual({ accessToken: 'rotated-access-token' });

    expect(cookieMock).toHaveBeenCalledWith(
      'refresh_token',
      'rotated-refresh-token',
      expect.objectContaining({ sameSite: 'none', secure: true }),
    );
  });
});

// A provider callback is a top-level navigation, so a thrown exception here is
// rendered to the person as this API's JSON error body. Every failure has to
// leave as a redirect carrying a code the sign-in screen can phrase.
describe('AuthController social callback failures', () => {
  let authController: AuthController;

  const loginWithSocialProfileMock = jest.fn() as jest.MockedFunction<
    AuthService['loginWithSocialProfile']
  >;

  const redirectMock = jest.fn() as jest.MockedFunction<Response['redirect']>;
  const cookieMock = jest.fn() as jest.MockedFunction<Response['cookie']>;

  const responseMock = {
    cookie: cookieMock,
    redirect: redirectMock,
  } as unknown as Response;

  const socialRequestMock = {
    query: {},
  } as unknown as SocialAuthenticatedRequest;

  const cancelledRequestMock = {
    query: { error: 'access_denied' },
  } as unknown as SocialAuthenticatedRequest;

  const redirectedTo = (): string => redirectMock.mock.calls[0][0] as string;

  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Spied rather than left alone so an expected failure does not print a
    // stack into the suite output, and so the logging itself is assertable.
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RefreshTokenCookieService,
        {
          provide: AuthService,
          useValue: {
            loginWithSocialProfile: loginWithSocialProfileMock,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): string =>
              key === 'WEB_APP_URL' ? 'https://web.example.com' : 'production',
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('sends a suspended account back to the sign-in screen', async () => {
    loginWithSocialProfileMock.mockRejectedValue(
      new ForbiddenException('Account is not active'),
    );

    await authController.googleCallback(socialRequestMock, responseMock);

    expect(redirectedTo()).toBe(
      'https://web.example.com/auth?oauthError=account_suspended',
    );
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('does not set a refresh cookie when the social login fails', async () => {
    loginWithSocialProfileMock.mockRejectedValue(
      new ForbiddenException('Account is not active'),
    );

    await authController.googleCallback(socialRequestMock, responseMock);

    expect(cookieMock).not.toHaveBeenCalled();
  });

  it('reports a conflicting email as a linked account', async () => {
    loginWithSocialProfileMock.mockRejectedValue(
      new ConflictException('Email is already associated with another account'),
    );

    await authController.facebookCallback(socialRequestMock, responseMock);

    expect(redirectedTo()).toBe(
      'https://web.example.com/auth?oauthError=email_in_use',
    );
  });

  it('falls back to a generic code for an unexpected failure', async () => {
    loginWithSocialProfileMock.mockRejectedValue(new Error('socket hang up'));

    await authController.googleCallback(socialRequestMock, responseMock);

    expect(redirectedTo()).toBe(
      'https://web.example.com/auth?oauthError=social_failed',
    );
  });

  it('logs an unexpected failure the redirect would otherwise hide', async () => {
    loginWithSocialProfileMock.mockRejectedValue(new Error('socket hang up'));

    await authController.googleCallback(socialRequestMock, responseMock);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unexpected google sign-in failure',
      expect.any(String),
    );
  });

  it('still reports a cancelled Facebook consent separately', async () => {
    await authController.facebookCallback(cancelledRequestMock, responseMock);

    expect(redirectedTo()).toBe(
      'https://web.example.com/auth?oauthError=facebook_cancelled',
    );
    expect(loginWithSocialProfileMock).not.toHaveBeenCalled();
  });
});
