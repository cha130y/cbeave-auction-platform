import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { WatchlistsService } from './watchlists.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { WatchlistEntryResponseDto } from './dto/watchlist-entry-response.dto';
import { ListWatchlistQueryDto } from './dto/list-watchlist-query.dto';
import { ListWatchlistResponseDto } from './dto/list-watchlist-response.dto';

@Controller('watchlists')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.USER)
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) {}

  @Get()
  listWatchlist(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Query() query: ListWatchlistQueryDto,
  ): Promise<ListWatchlistResponseDto> {
    return this.watchlistsService.listWatchlist({
      userId: currentUser.sub,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Put(':auctionId')
  watchAuction(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<WatchlistEntryResponseDto> {
    return this.watchlistsService.watchAuction({
      userId: currentUser.sub,
      auctionId,
    });
  }

  @Delete(':auctionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unwatchAuction(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<void> {
    return this.watchlistsService.unwatchAuction({
      userId: currentUser.sub,
      auctionId,
    });
  }
}
