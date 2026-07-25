import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CreateAuctionDraftDto } from './dto/create-auction-draft.dto';
import { AuctionDraftResponseDto } from './dto/auction-draft-response.dto';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  createDraft(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() createAuctionDraftDto: CreateAuctionDraftDto,
  ): Promise<AuctionDraftResponseDto> {
    return this.auctionsService.createDraft({
      ...createAuctionDraftDto,
      sellerId: currentUser.sub,
    });
  }
}
