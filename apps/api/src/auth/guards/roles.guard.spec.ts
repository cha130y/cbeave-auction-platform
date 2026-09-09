import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AccessTokenPayload } from '../types/access-token-payload.type';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { RolesGuard } from './roles.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  type GetAllAndOverride = (
    key: string,
    targets: unknown[],
  ) => UserRole[] | undefined;

  const getAllAndOverrideMock =
    jest.fn() as jest.MockedFunction<GetAllAndOverride>;

  const routeHandler = (): void => undefined;

  class TestController {}

  const createContext = (authUser?: AccessTokenPayload): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ authUser }) as AuthenticatedRequest,
      }),
      getHandler: () => routeHandler,
      getClass: () => TestController,
    }) as unknown as ExecutionContext;

  const authUserWithRole = (role: UserRole): AccessTokenPayload => ({
    sub: USER_ID,
    sid: SESSION_ID,
    role,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: getAllAndOverrideMock },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('reads the required roles from the handler and its controller', () => {
    getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);

    guard.canActivate(createContext(authUserWithRole(UserRole.ADMIN)));

    expect(getAllAndOverrideMock).toHaveBeenCalledWith(ROLES_KEY, [
      routeHandler,
      TestController,
    ]);
  });

  it('lets an unannotated route through', () => {
    getAllAndOverrideMock.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('lets a route annotated with an empty role list through', () => {
    getAllAndOverrideMock.mockReturnValue([]);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a role that the route asked for', () => {
    getAllAndOverrideMock.mockReturnValue([UserRole.USER]);

    expect(
      guard.canActivate(createContext(authUserWithRole(UserRole.USER))),
    ).toBe(true);
  });

  it('allows any of several accepted roles', () => {
    getAllAndOverrideMock.mockReturnValue([UserRole.USER, UserRole.ADMIN]);

    expect(
      guard.canActivate(createContext(authUserWithRole(UserRole.ADMIN))),
    ).toBe(true);
  });

  it('keeps a USER out of an administrator route', () => {
    getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(createContext(authUserWithRole(UserRole.USER))),
    ).toThrow(new ForbiddenException('Insufficient permission'));
  });

  it('keeps an ADMIN out of a marketplace route reserved for users', () => {
    getAllAndOverrideMock.mockReturnValue([UserRole.USER]);

    expect(() =>
      guard.canActivate(createContext(authUserWithRole(UserRole.ADMIN))),
    ).toThrow(new ForbiddenException('Insufficient permission'));
  });

  it('refuses a protected route when no authenticated user was attached', () => {
    getAllAndOverrideMock.mockReturnValue([UserRole.USER]);

    expect(() => guard.canActivate(createContext())).toThrow(
      new ForbiddenException('Insufficient permission'),
    );
  });
});
