import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { AccessControlModule } from '../auth/access-control.module';

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService],
  imports: [AccessControlModule],
})
export class AuctionsModule {}
