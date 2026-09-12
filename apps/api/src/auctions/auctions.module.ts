import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AccessControlModule } from '../auth/access-control.module';
import { CloudinaryModule } from '../infrastructure/cloudinary/cloudinary.module';
import { AuctionCatalogService } from './services/auction-catalog.service';
import { AuctionDraftService } from './services/auction-draft.service';
import { AuctionImageService } from './services/auction-image.service';
import { AuctionImageStorageService } from './services/auction-image-storage.service';
import { AuctionLifecycleService } from './services/auction-lifecycle.service';
import { AuctionPublishingService } from './services/auction-publishing.service';
import { OwnedAuctionService } from './services/owned-auction.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BiddingModule } from '../bidding/bidding.module';

@Module({
  controllers: [AuctionsController],
  providers: [
    AuctionCatalogService,
    AuctionDraftService,
    AuctionImageService,
    AuctionImageStorageService,
    AuctionLifecycleService,
    AuctionPublishingService,
    OwnedAuctionService,
  ],
  imports: [
    AccessControlModule,
    CloudinaryModule,
    NotificationsModule,
    BiddingModule,
  ],
})
export class AuctionsModule {}
