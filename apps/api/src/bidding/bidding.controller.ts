import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { BiddingService } from './bidding.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { PlaceBidDto } from './dto/place-bid.dto';
import { PlaceBidResponseDto } from './dto/place-bid-response.dto';

@Controller('auctions/:auctionId/bids')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.USER)
export class BiddingController {
  constructor(private readonly biddingService: BiddingService) {}

  @Post()
  placeBid(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() placeBidDto: PlaceBidDto,
  ): Promise<PlaceBidResponseDto> {
    return this.biddingService.placeBid({
      ...placeBidDto,
      auctionId,
      bidderId: currentUser.sub,
    });
  }
}
