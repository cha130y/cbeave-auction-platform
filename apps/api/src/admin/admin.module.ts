import { Module } from '@nestjs/common';
import { AdminUsersController } from './users.controller';
import { AdminUsersService } from './users.service';
import { AccessControlModule } from '../auth/access-control.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminAuctionsService } from './auctions.service';
import { AdminAuctionsController } from './auctions.controller';

@Module({
  imports: [AccessControlModule, NotificationsModule],
  controllers: [AdminUsersController, AdminAuctionsController],
  providers: [AdminUsersService, AdminAuctionsService],
})
export class AdminModule {}
