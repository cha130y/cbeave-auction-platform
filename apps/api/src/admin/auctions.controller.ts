import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
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
import { ListAdminAuctionsQueryDto } from './dto/list-admin-auctions-query.dto';
import { ListAdminAuctionsResponseDto } from './dto/list-admin-auctions-response.dto';

@Controller('admin/auctions')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuctionsController {
  constructor(private readonly adminAuctionsService: AdminAuctionsService) {}

  @Get()
  listAuctions(
    @Query() query: ListAdminAuctionsQueryDto,
  ): Promise<ListAdminAuctionsResponseDto> {
    return this.adminAuctionsService.listAuctions({
      cursor: query.cursor,
      limit: query.limit,
      status: query.status,
    });
  }

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
