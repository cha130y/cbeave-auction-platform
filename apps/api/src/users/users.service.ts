import {
  ConflictException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLocalUserInput } from './types/create-local-user.input';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { UpdateUserProfileInput } from './types/update-user-profile.input';
import { UserStatus } from '../generated/prisma/enums';
import { ResolveSocialUserInput } from './types/resolve-social-user.input';

const currentUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  userProfile: {
    select: {
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      phone: true,
      location: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

const socialAuthenticationUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  userProfile: {
    select: {
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createLocalUser(input: CreateLocalUserInput): Promise<void> {
    const { email, passwordHash, firstName, lastName, displayName } = input;

    try {
      await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          userProfile: {
            create: {
              firstName,
              lastName,
              displayName,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  //Directly return one Prisma query → no async needed
  //Multiple operations, try/catch, or result transformation → use async

  findForAuthenticationByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        userProfile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  findCurrentUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: currentUserSelect,
    });
  }

  updateCurrentUserProfile(userId: string, input: UpdateUserProfileInput) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        userProfile: {
          update: input,
        },
      },
      select: currentUserSelect,
    });
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  resolveSocialUser(input: ResolveSocialUserInput) {
    const {
      provider,
      providerAccountId,
      emailVerified,
      firstName,
      lastName,
      displayName,
      avatarUrl,
    } = input;

    const email = input.email.trim().toLowerCase();

    return this.prisma.$transaction(async (transaction) => {
      const existingAccount = await transaction.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        select: {
          user: {
            select: socialAuthenticationUserSelect,
          },
        },
      });

      if (existingAccount) {
        if (existingAccount.user.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException('Account is not active');
        }
        return existingAccount.user;
      }

      //This handles a user who registered locally and then signs in with Google using the same verified email
      const existingUser = await transaction.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          status: true,
          emailVerifiedAt: true,
          authAccounts: {
            where: {
              provider,
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (existingUser) {
        if (!emailVerified) {
          throw new ConflictException(
            'Email is already associated with another account',
          );
        }

        if (existingUser.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException('Account is not active');
        }

        if (existingUser.authAccounts.length > 0) {
          throw new ConflictException(
            'A different account from this provider is already linked',
          );
        }

        return transaction.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
            authAccounts: {
              create: {
                provider,
                providerAccountId,
              },
            },
          },
          select: socialAuthenticationUserSelect,
        });
      }

      return transaction.user.create({
        data: {
          email,
          emailVerifiedAt: emailVerified ? new Date() : null,
          authAccounts: {
            create: {
              provider,
              providerAccountId,
            },
          },
          userProfile: {
            create: {
              firstName,
              lastName,
              displayName,
              avatarUrl,
            },
          },
        },
        select: socialAuthenticationUserSelect,
      });
    });
  }
}
