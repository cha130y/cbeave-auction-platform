import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../generated/prisma/enums';
import { LoginDto } from './dto/login.dto';

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
