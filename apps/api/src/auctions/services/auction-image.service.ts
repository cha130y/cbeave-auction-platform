import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuctionStatus } from '../../generated/prisma/client';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';
import { AddAuctionImageInput } from '../types/add-auction-image.input';
import { DeleteAuctionImageInput } from '../types/delete-auction-image.input';
import { AuctionImageResponseDto } from '../dto/auction-image-response.dto';
import { MAX_AUCTION_IMAGES } from '../constants/auction-image.constant';
import { auctionImageSelect } from '../queries/auction-image.select';
import {
  ownedDraftImageCountSelect,
  ownedDraftWhere,
} from '../queries/owned-draft-image-count.select';
import { mapAuctionImageResponse } from '../mappers/map-auction-image-response.mapper';
import { AuctionImageStorageService } from './auction-image-storage.service';

/**
 * Images of a draft auction. The uploaded file and its row live in different
 * systems, so each path has to leave the two consistent: an upload that cannot
 * be recorded is removed again, and the first image is the primary one.
 */
@Injectable()
export class AuctionImageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auctionImageStorageService: AuctionImageStorageService,
  ) {}

  async addImage(
    input: AddAuctionImageInput,
  ): Promise<AuctionImageResponseDto> {
    const draft = await this.prisma.auction.findFirst({
      where: ownedDraftWhere(input.auctionId, input.sellerId),
      select: ownedDraftImageCountSelect,
    });

    if (!draft) {
      throw new NotFoundException('Auction draft not found');
    }

    if (draft._count.auctionImages >= MAX_AUCTION_IMAGES) {
      throw new BadRequestException(
        `An auction can have at most ${MAX_AUCTION_IMAGES} images`,
      );
    }

    let storedImage;

    try {
      storedImage = await this.cloudinaryService.uploadAuctionImage(
        input.fileBuffer,
        input.auctionId,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Image upload is temporarily unavailable',
      );
    }

    try {
      const image = await this.prisma.$transaction(async (transaction) => {
        // Re-read inside the transaction: the checks above ran before the
        // upload, and another request may have filled the last slot since.
        const currentDraft = await transaction.auction.findFirst({
          where: ownedDraftWhere(input.auctionId, input.sellerId),
          select: ownedDraftImageCountSelect,
        });

        if (!currentDraft) {
          throw new NotFoundException('Auction draft not found');
        }

        if (currentDraft._count.auctionImages >= MAX_AUCTION_IMAGES) {
          throw new BadRequestException(
            `An auction can have at most ${MAX_AUCTION_IMAGES} images`,
          );
        }

        const imagePositions = await transaction.auctionImage.aggregate({
          where: {
            auctionId: input.auctionId,
          },
          _max: {
            position: true,
          },
        });

        const position =
          imagePositions._max.position === null
            ? 0
            : imagePositions._max.position + 1;

        const createdImage = await transaction.auctionImage.create({
          data: {
            auctionId: input.auctionId,
            storageKey: storedImage.storageKey,
            url: storedImage.url,
            altText: input.altText ?? null,
            position,
            isPrimary: currentDraft._count.auctionImages === 0,
          },
          select: auctionImageSelect,
        });

        await transaction.auction.update({
          where: {
            id: input.auctionId,
          },
          data: {
            rowVersion: {
              increment: 1,
            },
          },
        });

        return createdImage;
      });

      return mapAuctionImageResponse(image);
    } catch (error) {
      await this.auctionImageStorageService.deleteQuietly(
        storedImage.storageKey,
        'orphaned by a failed upload',
      );

      throw error;
    }
  }

  async deleteImage(input: DeleteAuctionImageInput): Promise<void> {
    const deletedImage = await this.prisma.$transaction(async (transaction) => {
      const draft = await transaction.auction.findFirst({
        where: {
          id: input.auctionId,
          sellerId: input.sellerId,
          status: AuctionStatus.DRAFT,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!draft) {
        throw new NotFoundException('Auction draft not found');
      }

      const image = await transaction.auctionImage.findFirst({
        where: {
          id: input.imageId,
          auctionId: input.auctionId,
        },
        select: {
          id: true,
          storageKey: true, //use for deleting the Cloudinary file.
          isPrimary: true,
        },
      });

      if (!image) {
        throw new NotFoundException('Auction image not found');
      }

      await transaction.auctionImage.delete({
        where: {
          id: image.id,
        },
      });

      //handle in case delete cover image
      if (image.isPrimary) {
        const nextPrimary = await transaction.auctionImage.findFirst({
          where: {
            auctionId: input.auctionId,
          },
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
          },
        });

        if (nextPrimary) {
          await transaction.auctionImage.update({
            where: {
              id: nextPrimary.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }

      await transaction.auction.update({
        where: {
          id: input.auctionId,
        },
        data: {
          rowVersion: {
            increment: 1,
          },
        },
      });

      return {
        storageKey: image.storageKey,
      };
    });

    await this.auctionImageStorageService.deleteQuietly(
      deletedImage.storageKey,
    );
  }
}
