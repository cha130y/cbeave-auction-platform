import 'multer';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  ParseFilePipeBuilder,
  UploadedFile,
  UseInterceptors,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CreateAuctionDraftDto } from './dto/create-auction-draft.dto';
import { AuctionDraftResponseDto } from './dto/auction-draft-response.dto';
import { UpdateAuctionDraftDto } from './dto/update-auction-draft.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AUCTION_IMAGE_FILE_TYPE_PATTERN,
  MAX_AUCTION_IMAGE_SIZE_BYTES,
} from './constants/auction-image.constant';
import { AddAuctionImageDto } from './dto/add-auction-image.dto';
import { AuctionImageResponseDto } from './dto/auction-image-response.dto';
import { PublishAuctionResponseDto } from './dto/publish-auction-response.dto';
import { ListPublicAuctionsQueryDto } from './dto/list-public-auctions-query.dto';
import { ListPublicAuctionsResponseDto } from './dto/list-public-auctions-response.dto';
import { PublicAuctionDetailResponseDto } from './dto/public-auction-detail-response.dto';
import { ListHotAuctionsQueryDto } from './dto/list-hot-auctions-query.dto';
import { ListHotAuctionsResponseDto } from './dto/list-hot-auctions-response.dto';
import { ListOwnedAuctionsQueryDto } from './dto/list-owned-auctions-query.dto';
import { ListOwnedAuctionsResponseDto } from './dto/list-owned-auctions-response.dto';
import { CancelOwnedAuctionDto } from './dto/cancel-owned-auction.dto';
import { CancelOwnedAuctionResponseDto } from './dto/cancel-owned-auction-response.dto';

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  listPublic(
    @Query() query: ListPublicAuctionsQueryDto,
  ): Promise<ListPublicAuctionsResponseDto> {
    return this.auctionsService.listPublic(query);
  }

  // Keep this static route before the dynamic ':auctionId' route.
  @Get('hot')
  listHot(
    @Query() query: ListHotAuctionsQueryDto,
  ): Promise<ListHotAuctionsResponseDto> {
    return this.auctionsService.listHot({
      limit: query.limit,
    });
  }

  @Get('mine')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  listOwned(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Query() query: ListOwnedAuctionsQueryDto,
  ): Promise<ListOwnedAuctionsResponseDto> {
    return this.auctionsService.listOwned({
      sellerId: currentUser.sub,
      cursor: query.cursor,
      limit: query.limit,
      status: query.status,
    });
  }

  @Get(':auctionId')
  findPublicById(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
  ): Promise<PublicAuctionDetailResponseDto> {
    return this.auctionsService.findPublicById(auctionId);
  }

  @Get(':auctionId/draft')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  findOwnedDraft(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<AuctionDraftResponseDto> {
    return this.auctionsService.findOwnedDraftById(auctionId, currentUser.sub);
  }

  @Patch(':auctionId/draft')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  updateOwnedDraft(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() updateAuctionDraftDto: UpdateAuctionDraftDto,
  ): Promise<AuctionDraftResponseDto> {
    return this.auctionsService.updateOwnedDraft({
      ...updateAuctionDraftDto,
      auctionId,
      sellerId: currentUser.sub,
    });
  }

  @Delete(':auctionId/draft')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  deleteOwnedDraft(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<void> {
    return this.auctionsService.deleteOwnedDraft({
      auctionId,
      sellerId: currentUser.sub,
    });
  }

  @Patch(':auctionId/cancel')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  cancelOwnedScheduled(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() body: CancelOwnedAuctionDto,
  ): Promise<CancelOwnedAuctionResponseDto> {
    return this.auctionsService.cancelOwnedScheduled({
      auctionId,
      sellerId: currentUser.sub,
      reason: body.reason,
    });
  }

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

  @Post(':auctionId/images')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_AUCTION_IMAGE_SIZE_BYTES,
      },
    }),
  )
  addImage(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() addAuctionImageDto: AddAuctionImageDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: AUCTION_IMAGE_FILE_TYPE_PATTERN,
        })
        .addMaxSizeValidator({
          maxSize: MAX_AUCTION_IMAGE_SIZE_BYTES,
        })
        .build({
          fileIsRequired: true,
        }),
    )
    image: Express.Multer.File,
  ): Promise<AuctionImageResponseDto> {
    return this.auctionsService.addImage({
      auctionId,
      sellerId: currentUser.sub,
      fileBuffer: image.buffer,
      altText: addAuctionImageDto.altText,
    });
  }

  @Post(':auctionId/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  publish(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<PublishAuctionResponseDto> {
    return this.auctionsService.publish({
      auctionId,
      sellerId: currentUser.sub,
    });
  }

  @Delete(':auctionId/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.USER)
  deleteImage(
    @Param('auctionId', new ParseUUIDPipe({ version: '4' }))
    auctionId: string,
    @Param('imageId', new ParseUUIDPipe({ version: '4' }))
    imageId: string,
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<void> {
    return this.auctionsService.deleteImage({
      auctionId,
      imageId,
      sellerId: currentUser.sub,
    });
  }
}
