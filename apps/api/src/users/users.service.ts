import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLocalUserInput } from './types/create-local-user.input';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { UpdateUserProfileInput } from './types/update-user-profile.input';

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
}
