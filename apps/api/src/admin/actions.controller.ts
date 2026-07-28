import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/enums';
import { AdminActionsService } from './actions.service';
import { ListAdminActionsQueryDto } from './dto/list-admin-actions-query.dto';
import { ListAdminActionsResponseDto } from './dto/list-admin-actions-response.dto';

@Controller('admin/actions')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminActionsController {
  constructor(private readonly adminActionsService: AdminActionsService) {}

  @Get()
  listActions(
    @Query() query: ListAdminActionsQueryDto,
  ): Promise<ListAdminActionsResponseDto> {
    return this.adminActionsService.listActions({
      cursor: query.cursor,
      limit: query.limit,
      actionType: query.actionType,
    });
  }
}
