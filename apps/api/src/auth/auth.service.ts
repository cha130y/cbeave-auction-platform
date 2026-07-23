import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '../generated/prisma/enums';
import { AccessTokenService } from './services/access-token.service';
import { UserSessionService } from './services/user-session.service';
import { AuthenticatedUser, LoginResult } from './types/login-result.type';
import { RefreshResult } from './types/refresh-result.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly bcryptService: BcryptService,
    private readonly accessTokenService: AccessTokenService,
    private readonly userSessionService: UserSessionService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    const passwordHash = await this.bcryptService.hash(dto.password);

    await this.usersService.createLocalUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
    });
  }

  private async authenticateLocalUser(
    dto: LoginDto,
  ): Promise<AuthenticatedUser> {
    const user = await this.usersService.findForAuthenticationByEmail(
      dto.email,
    );

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.bcryptService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.userProfile,
    };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.authenticateLocalUser(dto);

    const session = await this.userSessionService.create(user.id);

    const accessToken = await this.accessTokenService.sign({
      sub: user.id,
      role: user.role,
      sid: session.sessionId,
    });

    await this.usersService.updateLastLoginAt(user.id);

    return {
      accessToken,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
      user,
    };
  }

  async refresh(
    currentRefreshToken: string | undefined,
  ): Promise<RefreshResult> {
    if (!currentRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.userSessionService.rotate(currentRefreshToken);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.accessTokenService.sign({
      sub: session.userId,
      role: session.userRole,
      sid: session.sessionId,
    });

    return {
      accessToken,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
    };
  }
}
