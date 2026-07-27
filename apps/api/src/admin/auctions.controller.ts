import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UserRole } from '../generated/prisma/enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminAuctionsService } from './auctions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CancelAuctionDto } from './dto/cancel-auction.dto';
import { CancelAuctionResponseDto } from './dto/cancel-auction-response.dto';

@Controller('admin/auctions')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuctionsController {
  constructor(private readonly adminAuctionsService: AdminAuctionsService) {}

  @Patch(':auctionId/cancel')
  cancelAuction(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() body: CancelAuctionDto,
  ): Promise<CancelAuctionResponseDto> {
    return this.adminAuctionsService.cancelAuction({
      adminUserId: currentUser.sub,
      auctionId,
      reason: body.reason,
    });
  }
}
