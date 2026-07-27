import { Module } from '@nestjs/common';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { AccessControlModule } from '../auth/access-control.module';

@Module({
  imports: [AccessControlModule],
  controllers: [BiddingController],
  providers: [BiddingService],
})
export class BiddingModule {}
