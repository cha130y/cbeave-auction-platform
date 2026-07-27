import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, UserStatus } from '../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminUsersService } from './users.service';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import {
  AdminUserSummaryResponseDto,
  ListAdminUsersResponseDto,
} from './dto/list-admin-users-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';

@Controller('admin/users')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  listUsers(
    @Query() query: ListAdminUsersQueryDto,
  ): Promise<ListAdminUsersResponseDto> {
    return this.adminUsersService.listUsers({
      cursor: query.cursor,
      limit: query.limit,
      status: query.status,
    });
  }

  @Patch(':userId/suspend')
  suspendUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' }))
    userId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() body: ChangeUserStatusDto,
  ): Promise<AdminUserSummaryResponseDto> {
    return this.adminUsersService.changeUserStatus({
      adminUserId: currentUser.sub,
      targetUserId: userId,
      targetStatus: UserStatus.SUSPENDED,
      note: body.note,
    });
  }

  @Patch(':userId/reactivate')
  reactivateUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' }))
    userId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() body: ChangeUserStatusDto,
  ): Promise<AdminUserSummaryResponseDto> {
    return this.adminUsersService.changeUserStatus({
      adminUserId: currentUser.sub,
      targetUserId: userId,
      targetStatus: UserStatus.ACTIVE,
      note: body.note,
    });
  }
}
