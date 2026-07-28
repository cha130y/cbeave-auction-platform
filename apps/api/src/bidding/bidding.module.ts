import { Module } from '@nestjs/common';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { AccessControlModule } from '../auth/access-control.module';
import { AuctionBiddingGateway } from './gateways/auction-bidding.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuctionParticipantsService } from './services/auction-participants.service';
import { ActiveArenaService } from './services/active-arena.service';

@Module({
  imports: [AccessControlModule, NotificationsModule],
  controllers: [BiddingController],
  providers: [
    BiddingService,
    AuctionBiddingGateway,
    AuctionParticipantsService,
    ActiveArenaService,
  ],
  exports: [AuctionBiddingGateway],
})
export class BiddingModule {}
