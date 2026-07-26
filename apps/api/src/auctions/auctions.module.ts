import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { AccessControlModule } from '../auth/access-control.module';
import { CloudinaryModule } from '../infrastructure/cloudinary/cloudinary.module';
import { AuctionLifecycleService } from './services/auction-lifecycle.service';

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionLifecycleService],
  imports: [AccessControlModule, CloudinaryModule],
})
export class AuctionsModule {}
