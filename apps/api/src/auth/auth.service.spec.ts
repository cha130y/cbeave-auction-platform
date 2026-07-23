import { Test, TestingModule } from '@nestjs/testing';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenService } from './services/access-token.service';
import { UserSessionService } from './services/user-session.service';

describe('AuthService', () => {
  let authService: AuthService;

  const hashMock = jest.fn() as jest.MockedFunction<BcryptService['hash']>;
  const createLocalUserMock = jest.fn() as jest.MockedFunction<
    UsersService['createLocalUser']
  >;

  const signAccessTokenMock = jest.fn() as jest.MockedFunction<
    AccessTokenService['sign']
  >;

  const createSessionMock = jest.fn() as jest.MockedFunction<
    UserSessionService['create']
  >;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: BcryptService,
          useValue: {
            hash: hashMock,
          },
        },
        {
          provide: UsersService,
          useValue: {
            createLocalUser: createLocalUserMock,
          },
        },
        {
          provide: AccessTokenService,
          useValue: {
            sign: signAccessTokenMock,
          },
        },
        {
          provide: UserSessionService,
          useValue: {
            create: createSessionMock,
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('hashes the password and creates a local user', async () => {
    const registerDto: RegisterDto = {
      firstName: 'John',
      lastName: 'Smith',
      displayName: 'AuctionJohn',
      email: 'john@example.com',
      password: 'Secure123!',
    };

    hashMock.mockResolvedValue('bcrypt-password-hash');
    createLocalUserMock.mockResolvedValue(undefined);

    await authService.register(registerDto);

    expect(hashMock).toHaveBeenCalledWith('Secure123!');

    expect(createLocalUserMock).toHaveBeenCalledWith({
      email: 'john@example.com',
      passwordHash: 'bcrypt-password-hash',
      firstName: 'John',
      lastName: 'Smith',
      displayName: 'AuctionJohn',
    });
  });
});
