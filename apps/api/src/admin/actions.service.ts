import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ListAdminActionsResponseDto } from './dto/list-admin-actions-response.dto';
import { mapAdminActionSummaryResponse } from './mappers/map-admin-action-summary-response.mapper';
import { adminActionSummarySelect } from './queries/admin-action-summary.select';
import { ListAdminActionsInput } from './types/list-admin-actions.input';

@Injectable()
export class AdminActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActions(
    input: ListAdminActionsInput,
  ): Promise<ListAdminActionsResponseDto> {
    if (input.cursor) {
      const cursorExists = await this.prisma.adminAction.findFirst({
        where: {
          id: input.cursor,
          ...(input.actionType
            ? {
                actionType: input.actionType,
              }
            : {}),
        },
        select: {
          id: true,
        },
      });

      if (!cursorExists) {
        throw new BadRequestException('Invalid admin action cursor');
      }
    }

    const actions = await this.prisma.adminAction.findMany({
      where: input.actionType
        ? {
            actionType: input.actionType,
          }
        : undefined,
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
      select: adminActionSummarySelect,
    });

    const hasMore = actions.length > input.limit;
    const page = hasMore ? actions.slice(0, input.limit) : actions;
    const lastAction = page[page.length - 1];

    return {
      items: page.map(mapAdminActionSummaryResponse),
      nextCursor: hasMore && lastAction ? lastAction.id : null,
    };
  }
}
