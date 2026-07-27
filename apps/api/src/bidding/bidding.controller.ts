import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { ListPublicBidsQueryDto } from './dto/list-public-bids-query.dto';
import { ListPublicBidsResponseDto } from './dto/list-public-bids-response.dto';

@Controller('auctions/:auctionId/bids')
export class BiddingController {
  constructor(private readonly biddingService: BiddingService) {}

  @Get()
  listPublicBidHistory(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @Query() query: ListPublicBidsQueryDto,
  ): Promise<ListPublicBidsResponseDto> {
    return this.biddingService.listPublicBidHistory({
      auctionId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
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
