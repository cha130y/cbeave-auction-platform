import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocalUserInput } from './types/create-local-user.input';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';

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
}
