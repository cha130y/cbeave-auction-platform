import { Module } from '@nestjs/common';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { AccessControlModule } from '../auth/access-control.module';
import { AuctionBiddingGateway } from './gateways/auction-bidding.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccessControlModule, NotificationsModule],
  controllers: [BiddingController],
  providers: [BiddingService, AuctionBiddingGateway],
})
export class BiddingModule {}
