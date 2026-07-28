import { Module } from '@nestjs/common';
import { AdminUsersController } from './users.controller';
import { AdminUsersService } from './users.service';
import { AccessControlModule } from '../auth/access-control.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminAuctionsService } from './auctions.service';
import { AdminAuctionsController } from './auctions.controller';
import { AdminActionsController } from './actions.controller';
import { AdminActionsService } from './actions.service';

@Module({
  imports: [AccessControlModule, NotificationsModule],
  controllers: [
    AdminUsersController,
    AdminAuctionsController,
    AdminActionsController,
  ],
  providers: [AdminUsersService, AdminAuctionsService, AdminActionsService],
})
export class AdminModule {}
