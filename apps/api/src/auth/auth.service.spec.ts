// describe('AuthService', () => {
//   it('work', () => {
//     expect(true).toBe(true);
//   });
// });

import { Test, TestingModule } from '@nestjs/testing';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let authService: AuthService;

  const hashMock = jest.fn() as jest.MockedFunction<BcryptService['hash']>;
  const createLocalUserMock = jest.fn() as jest.MockedFunction<
    UsersService['createLocalUser']
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
