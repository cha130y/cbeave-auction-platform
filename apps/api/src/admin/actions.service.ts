import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ListAdminActionsResponseDto } from './dto/list-admin-actions-response.dto';
import { mapAdminActionSummaryResponse } from './mappers/map-admin-action-summary-response.mapper';
import { adminActionSummarySelect } from './queries/admin-action-summary.select';
import { ListAdminActionsInput } from './types/list-admin-actions.input';
import { assertCursorExists } from '../common/pagination/assert-cursor-exists.util';
import { paginate } from '../common/pagination/paginate.util';

@Injectable()
export class AdminActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActions(
    input: ListAdminActionsInput,
  ): Promise<ListAdminActionsResponseDto> {
    if (input.cursor) {
      await assertCursorExists(
        this.prisma.adminAction,
        {
          id: input.cursor,
          ...(input.actionType
            ? {
                actionType: input.actionType,
              }
            : {}),
        },
        'Invalid admin action cursor',
      );
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

    const { page, nextCursor } = paginate(
      actions,
      input.limit,
      (action) => action.id,
    );

    return {
      items: page.map(mapAdminActionSummaryResponse),
      nextCursor,
    };
  }
}
