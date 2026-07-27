import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ListAdminUsersInput } from './types/list-admin-users.input';
import {
  AdminUserSummaryResponseDto,
  ListAdminUsersResponseDto,
} from './dto/list-admin-users-response.dto';
import {
  AdminActionType,
  UserRole,
  UserStatus,
} from '../generated/prisma/enums';
import { adminUserSummarySelect } from './queries/admin-user-summary.select';
import { mapAdminUserSummaryResponse } from './mappers/map-admin-user-summary-response.mapper';
import { ChangeUserStatusInput } from './types/change-user-status.input';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(
    input: ListAdminUsersInput,
  ): Promise<ListAdminUsersResponseDto> {
    if (input.cursor) {
      const cursorExists = await this.prisma.user.findFirst({
        where: {
          id: input.cursor,
          role: UserRole.USER,
        },
        select: {
          id: true,
        },
      });

      if (!cursorExists) {
        throw new BadRequestException('Invalid user cursor');
      }
    }
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.USER,
        ...(input.status ? { status: input.status } : {}),
      },
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1,
      select: adminUserSummarySelect,
    });

    const hasMore = users.length > input.limit;
    const page = hasMore ? users.slice(0, input.limit) : users;
    const lastUser = page[page.length - 1];

    return {
      items: page.map(mapAdminUserSummaryResponse),
      nextCursor: hasMore && lastUser ? lastUser.id : null,
    };
  }

  async changeUserStatus(
    input: ChangeUserStatusInput,
  ): Promise<AdminUserSummaryResponseDto> {
    if (input.adminUserId === input.targetUserId) {
      throw new ForbiddenException(
        'Administrators cannot change their own account status',
      );
    }

    if (
      input.targetStatus !== UserStatus.SUSPENDED &&
      input.targetStatus !== UserStatus.ACTIVE
    ) {
      throw new BadRequestException('Unsupported user status change');
    }
    return this.prisma.$transaction(async (transaction) => {
      const targetUser = await transaction.user.findUnique({
        where: {
          id: input.targetUserId,
        },
        select: adminUserSummarySelect,
      });

      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      if (targetUser.role !== UserRole.USER) {
        throw new ForbiddenException(
          'Administrator accounts cannot be managed here',
        );
      }

      if (targetUser.status === UserStatus.DEACTIVATED) {
        throw new ConflictException(
          'Deactivated accounts cannot be changed through suspension controls',
        );
      }

      if (targetUser.status === input.targetStatus) {
        return mapAdminUserSummaryResponse(targetUser);
      }

      const now = new Date();

      const updatedUser = await transaction.user.update({
        where: {
          id: targetUser.id,
        },
        data: {
          status: input.targetStatus,
        },
        select: adminUserSummarySelect,
      });

      if (input.targetStatus === UserStatus.SUSPENDED) {
        await transaction.userSession.updateMany({
          where: {
            userId: targetUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });
      }

      const isSuspension = input.targetStatus === UserStatus.SUSPENDED;

      await transaction.adminAction.create({
        data: {
          adminUserId: input.adminUserId,
          targetUserId: targetUser.id,
          actionType: isSuspension
            ? AdminActionType.SUSPEND_USER
            : AdminActionType.REACTIVATE_USER,
          note:
            `${isSuspension ? 'Suspended' : 'Reactivated'} user ` +
            `"${targetUser.email}": ${input.note}`,
        },
      });

      return mapAdminUserSummaryResponse(updatedUser);
    });
  }
}
