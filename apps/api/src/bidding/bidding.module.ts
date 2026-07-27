import { Module } from '@nestjs/common';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { AccessControlModule } from '../auth/access-control.module';
import { AuctionBiddingGateway } from './gateways/auction-bidding.gateway';

@Module({
  imports: [AccessControlModule],
  controllers: [BiddingController],
  providers: [BiddingService, AuctionBiddingGateway],
})
export class BiddingModule {}
