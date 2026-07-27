import {
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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  ListNotificationsResponseDto,
  NotificationResponseDto,
} from './dto/list-notifications-response.dto';

@Controller('notifications')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.USER)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listNotifications(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    return this.notificationsService.listNotifications({
      userId: currentUser.sub,
      cursor: query.cursor,
      limit: query.limit,
      unreadOnly: query.unreadOnly === 'true',
    });
  }

  @Patch(':notificationId/read')
  markNotificationAsRead(
    @Param('notificationId', new ParseUUIDPipe({ version: '4' }))
    notificationId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markNotificationAsRead({
      notificationId,
      userId: currentUser.sub,
    });
  }
}
