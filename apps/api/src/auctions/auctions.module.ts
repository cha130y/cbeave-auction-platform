import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { AccessControlModule } from '../auth/access-control.module';
import { CloudinaryModule } from '../infrastructure/cloudinary/cloudinary.module';

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService],
  imports: [AccessControlModule, CloudinaryModule],
})
export class AuctionsModule {}
