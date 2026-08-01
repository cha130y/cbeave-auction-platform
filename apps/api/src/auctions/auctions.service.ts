import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAuctionDraftInput } from './types/create-auction-draft.input';
import { AuctionDraftResponseDto } from './dto/auction-draft-response.dto';
import {
  AuctionEventType,
  Prisma,
  AuctionStatus,
} from '../generated/prisma/client';
import { auctionDraftSelect } from './queries/auction-draft.select';
import { mapAuctionDraftResponse } from './mappers/map-auction-draft-response.mapper';
import { UpdateAuctionDraftInput } from './types/update-auction-draft.input';
import { CloudinaryService } from '../infrastructure/cloudinary/cloudinary.service';
import { AddAuctionImageInput } from './types/add-auction-image.input';
import { AuctionImageResponseDto } from './dto/auction-image-response.dto';
import { MAX_AUCTION_IMAGES } from './constants/auction-image.constant';
import { auctionImageSelect } from './queries/auction-image.select';
import { mapAuctionImageResponse } from './mappers/map-auction-image-response.mapper';
import { DeleteAuctionImageInput } from './types/delete-auction-image.input';
import { PublishAuctionInput } from './types/publish-auction.input';
import { PublishAuctionResponseDto } from './dto/publish-auction-response.dto';
import { publishAuctionSelect } from './queries/publish-auction.select';
import { mapPublishAuctionResponse } from './mappers/map-publish-auction-response.mapper';
import { ListPublicAuctionsInput } from './types/list-public-auctions.input';
import { ListPublicAuctionsResponseDto } from './dto/list-public-auctions-response.dto';
import { publicAuctionSummarySelect } from './queries/public-auction-summary.select';
import { mapPublicAuctionSummaryResponse } from './mappers/map-public-auction-summary-response.mapper';
import { PublicAuctionDetailResponseDto } from './dto/public-auction-detail-response.dto';
import { publicAuctionDetailSelect } from './queries/public-auction-detail.select';
import { mapPublicAuctionDetailResponse } from './mappers/map-public-auction-detail-response.mapper';
import { ListHotAuctionsInput } from './types/list-hot-auctions.input';
import { ListHotAuctionsResponseDto } from './dto/list-hot-auctions-response.dto';
import { ListOwnedAuctionsInput } from './types/list-owned-auctions.input';
import { ListOwnedAuctionsResponseDto } from './dto/list-owned-auctions-response.dto';
import { ownedAuctionSummarySelect } from './queries/owned-auction-summary.select';
import { mapOwnedAuctionSummaryResponse } from './mappers/map-owned-auction-summary-response.mapper';
import { DeleteAuctionDraftInput } from './types/delete-auction-draft.input';

const PUBLIC_AUCTION_STATUSES: AuctionStatus[] = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
  AuctionStatus.SOLD,
  AuctionStatus.UNSOLD,
];

const PUBLIC_AUCTION_REQUIREMENTS = {
  scheduledStartAt: {
    not: null,
  },
  currentEndAt: {
    not: null,
  },
  publishedAt: {
    not: null,
  },
  auctionImages: {
    some: {
      isPrimary: true,
    },
  },
} satisfies Prisma.AuctionWhereInput;

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async listOwned(
    input: ListOwnedAuctionsInput,
  ): Promise<ListOwnedAuctionsResponseDto> {
    const auctions = await this.prisma.auction.findMany({
      where: {
        sellerId: input.sellerId,
        deletedAt: null,
        ...(input.status
          ? {
              status: input.status,
            }
          : {}),
      },
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1,
      select: ownedAuctionSummarySelect,
    });

    const hasMore = auctions.length > input.limit;
    const page = hasMore ? auctions.slice(0, input.limit) : auctions;
    const lastAuction = page[page.length - 1];

    return {
      items: page.map(mapOwnedAuctionSummaryResponse),
      nextCursor: hasMore && lastAuction ? lastAuction.id : null,
    };
  }

  async listHot(
    input: ListHotAuctionsInput,
  ): Promise<ListHotAuctionsResponseDto> {
    const auctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.ACTIVE,
        deletedAt: null,
        ...PUBLIC_AUCTION_REQUIREMENTS,
        currentEndAt: {
          gt: new Date(),
        },
      },
      orderBy: [
        {
          bidCount: 'desc',
        },
        {
          currentEndAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      take: input.limit,
      select: publicAuctionSummarySelect,
    });

    return {
      items: auctions.map(mapPublicAuctionSummaryResponse),
    };
  }

  async findPublicById(
    auctionId: string,
  ): Promise<PublicAuctionDetailResponseDto> {
    const auction = await this.prisma.auction.findFirst({
      where: {
        id: auctionId,
        status: {
          in: PUBLIC_AUCTION_STATUSES,
        },
        deletedAt: null,
        ...PUBLIC_AUCTION_REQUIREMENTS,
      },
      select: publicAuctionDetailSelect,
    });
    if (!auction) {
      throw new NotFoundException('Auction not found');
    }
    return mapPublicAuctionDetailResponse(auction);
  }

  async listPublic(
    input: ListPublicAuctionsInput,
  ): Promise<ListPublicAuctionsResponseDto> {
    const auctions = await this.prisma.auction.findMany({
      where: {
        status: {
          in: PUBLIC_AUCTION_STATUSES,
        },
        deletedAt: null,
        ...PUBLIC_AUCTION_REQUIREMENTS,
        ...(input.categoryId
          ? {
              categoryId: input.categoryId,
            }
          : {}),
      },
      orderBy: [
        {
          publishedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1, //check Is there another page? limit default=20
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1, //skip current cursor id auction then start next cursor id for next page
          }
        : {}),
      select: publicAuctionSummarySelect,
    });

    const hasNextPage = auctions.length > input.limit;

    if (hasNextPage) {
      auctions.pop(); //remove last element(auction)
    }

    const lastAuction = auctions[auctions.length - 1];

    return {
      items: auctions.map(mapPublicAuctionSummaryResponse),
      nextCursor: hasNextPage && lastAuction ? lastAuction.id : null,
    };
  }

  async createDraft(
    input: CreateAuctionDraftInput,
  ): Promise<AuctionDraftResponseDto> {
    const startingPrice = new Prisma.Decimal(input.startingPrice);
    const minBidIncrement = new Prisma.Decimal(input.minBidIncrement);

    const reservePrice =
      input.reservePrice !== undefined && input.reservePrice !== null
        ? new Prisma.Decimal(input.reservePrice)
        : null;

    if (
      //lte means “less than or equal to.”
      startingPrice.lte(0) ||
      minBidIncrement.lte(0) ||
      reservePrice?.lte(0)
    ) {
      throw new BadRequestException('Auction prices must be greater than zero');
    }

    if (reservePrice && reservePrice.lt(startingPrice)) {
      //lt means “strictly less than.”
      throw new BadRequestException(
        'Reserve price cannot be lower than starting price',
      );
    }

    const scheduledStartAt = input.scheduledStartAt ?? null;
    const scheduledEndAt = input.scheduledEndAt ?? null;

    const hasScheduledStart = scheduledStartAt !== null;
    const hasScheduledEnd = scheduledEndAt !== null;

    if (hasScheduledStart !== hasScheduledEnd) {
      throw new BadRequestException(
        'Scheduled start and end times must be supplied together',
      );
    }

    if (
      scheduledStartAt &&
      scheduledEndAt &&
      scheduledEndAt <= scheduledStartAt
    ) {
      throw new BadRequestException(
        'Scheduled end time must be later than start time',
      );
    }

    const auction = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({
        where: {
          id: input.categoryId,
        },
        select: {
          isActive: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (!category.isActive) {
        throw new BadRequestException('Auction category must be active');
      }

      const createdAuction = await transaction.auction.create({
        data: {
          sellerId: input.sellerId,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          startingPrice,
          reservePrice,
          minBidIncrement,
          currentPrice: startingPrice,
          scheduledStartAt,
          originalEndAt: scheduledEndAt,
          currentEndAt: scheduledEndAt,
        },
        select: auctionDraftSelect,
      });

      await transaction.auctionEvent.create({
        data: {
          auctionId: createdAuction.id,
          actorUserId: input.sellerId,
          eventType: AuctionEventType.CREATED,
        },
      });
      return createdAuction;
    });
    return mapAuctionDraftResponse(auction);
  }

  async findOwnedDraftById(
    auctionId: string,
    sellerId: string,
  ): Promise<AuctionDraftResponseDto> {
    const auction = await this.prisma.auction.findFirst({
      where: {
        id: auctionId,
        sellerId,
        status: AuctionStatus.DRAFT,
        deletedAt: null,
      },
      select: auctionDraftSelect,
    });

    if (!auction) {
      throw new NotFoundException('Auction draft not found');
    }

    return mapAuctionDraftResponse(auction);
  }

  async updateOwnedDraft(
    input: UpdateAuctionDraftInput,
  ): Promise<AuctionDraftResponseDto> {
    const hasChanges = [
      input.categoryId,
      input.title,
      input.description,
      input.startingPrice,
      input.reservePrice,
      input.minBidIncrement,
      input.scheduledStartAt,
      input.scheduledEndAt,
    ].some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException(
        'At least one auction draft field is required',
      );
    }

    const includesScheduledStart = input.scheduledStartAt !== undefined;
    const includesScheduledEnd = input.scheduledEndAt !== undefined;

    if (includesScheduledStart !== includesScheduledEnd) {
      throw new BadRequestException(
        'Scheduled start and end times must be supplied together',
      );
    }

    const auction = await this.prisma.$transaction(async (transaction) => {
      const currentAuction = await transaction.auction.findFirst({
        where: {
          id: input.auctionId,
          sellerId: input.sellerId,
          status: AuctionStatus.DRAFT,
          deletedAt: null,
        },
        select: {
          startingPrice: true,
          reservePrice: true,
          minBidIncrement: true,
          scheduledStartAt: true,
          originalEndAt: true,
        },
      });

      if (!currentAuction) {
        throw new NotFoundException('Auction draft not found');
      }

      if (input.categoryId !== undefined) {
        const category = await transaction.category.findUnique({
          where: {
            id: input.categoryId,
          },
          select: {
            isActive: true,
          },
        });

        if (!category) {
          throw new NotFoundException('Category not found');
        }

        if (!category.isActive) {
          throw new BadRequestException('Auction category must be active');
        }
      }

      const startingPrice =
        input.startingPrice !== undefined
          ? new Prisma.Decimal(input.startingPrice)
          : currentAuction.startingPrice;

      const minBidIncrement =
        input.minBidIncrement !== undefined
          ? new Prisma.Decimal(input.minBidIncrement)
          : currentAuction.minBidIncrement;

      const reservePrice =
        input.reservePrice === undefined
          ? currentAuction.reservePrice
          : input.reservePrice === null
            ? null
            : new Prisma.Decimal(input.reservePrice);

      if (
        startingPrice.lte(0) ||
        minBidIncrement.lte(0) ||
        reservePrice?.lte(0)
      ) {
        throw new BadRequestException(
          'Auction prices must be greater than zero',
        );
      }

      if (reservePrice && reservePrice.lt(startingPrice)) {
        throw new BadRequestException(
          'Reserve price cannot be lower than starting price',
        );
      }

      const scheduledStartAt =
        input.scheduledStartAt === undefined
          ? currentAuction.scheduledStartAt
          : input.scheduledStartAt;

      const scheduledEndAt =
        input.scheduledEndAt === undefined
          ? currentAuction.originalEndAt
          : input.scheduledEndAt;

      const hasScheduledStart = scheduledStartAt !== null;
      const hasScheduledEnd = scheduledEndAt !== null;

      if (hasScheduledStart !== hasScheduledEnd) {
        throw new BadRequestException(
          'Scheduled start and end times must be supplied together',
        );
      }

      if (
        scheduledStartAt &&
        scheduledEndAt &&
        scheduledEndAt <= scheduledStartAt
      ) {
        throw new BadRequestException(
          'Scheduled end time must be later than start time',
        );
      }

      return transaction.auction.update({
        where: {
          id: input.auctionId,
        },
        data: {
          ...(input.categoryId !== undefined && {
            categoryId: input.categoryId,
          }),
          ...(input.title !== undefined && {
            title: input.title,
          }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          startingPrice,
          reservePrice,
          minBidIncrement,
          currentPrice: startingPrice,
          scheduledStartAt,
          originalEndAt: scheduledEndAt,
          currentEndAt: scheduledEndAt,
          rowVersion: {
            increment: 1,
          },
        },
        select: auctionDraftSelect,
      });
    });

    return mapAuctionDraftResponse(auction);
  }

  async addImage(
    input: AddAuctionImageInput,
  ): Promise<AuctionImageResponseDto> {
    const draft = await this.prisma.auction.findFirst({
      where: {
        id: input.auctionId,
        sellerId: input.sellerId,
        status: AuctionStatus.DRAFT,
        deletedAt: null,
      },
      select: {
        _count: {
          select: {
            auctionImages: true,
          },
        },
      },
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
        const currentDraft = await transaction.auction.findFirst({
          where: {
            id: input.auctionId,
            sellerId: input.sellerId,
            status: AuctionStatus.DRAFT,
            deletedAt: null,
          },
          select: {
            _count: {
              select: {
                auctionImages: true,
              },
            },
          },
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
      try {
        await this.cloudinaryService.deleteImage(storedImage.storageKey);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to remove orphaned Cloudinary image ${storedImage.storageKey}`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }
      throw error;
    }
  }

  async deleteOwnedDraft(input: DeleteAuctionDraftInput): Promise<void> {
    const storageKeys = await this.prisma.$transaction(async (transaction) => {
      const auction = await transaction.auction.findFirst({
        where: {
          id: input.auctionId,
          sellerId: input.sellerId,
          deletedAt: null,
        },
        select: {
          status: true,
          auctionImages: {
            select: {
              storageKey: true,
            },
          },
        },
      });

      if (!auction) {
        throw new NotFoundException('Auction draft not found');
      }

      if (auction.status !== AuctionStatus.DRAFT) {
        throw new ConflictException('Only draft auctions can be deleted');
      }

      const deletionResult = await transaction.auction.updateMany({
        where: {
          id: input.auctionId,
          sellerId: input.sellerId,
          status: AuctionStatus.DRAFT,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          rowVersion: {
            increment: 1,
          },
        },
      });

      if (deletionResult.count !== 1) {
        throw new ConflictException(
          'Auction draft changed before it could be deleted',
        );
      }

      await transaction.auctionImage.deleteMany({
        where: {
          auctionId: input.auctionId,
        },
      });

      return auction.auctionImages.map((image) => image.storageKey);
    });

    for (const storageKey of storageKeys) {
      try {
        await this.cloudinaryService.deleteImage(storageKey);
      } catch (error) {
        this.logger.error(
          `Failed to delete Cloudinary image ${storageKey}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
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
    try {
      await this.cloudinaryService.deleteImage(deletedImage.storageKey);
    } catch (error) {
      this.logger.error(
        `Failed to delete Cloudinary image ${deletedImage.storageKey}`,
        error instanceof Error ? error.stack : undefined, //stack trace normally contains the error message and where it occurred
      );
    }
  }

  async publish(
    input: PublishAuctionInput,
  ): Promise<PublishAuctionResponseDto> {
    const now = new Date();

    const publishedAuction = await this.prisma.$transaction(
      async (transaction) => {
        const auction = await transaction.auction.findFirst({
          where: {
            id: input.auctionId,
            sellerId: input.sellerId,
            deletedAt: null,
          },
          select: {
            id: true,
            sellerId: true,
            title: true,
            description: true,
            status: true,
            startingPrice: true,
            reservePrice: true,
            minBidIncrement: true,
            scheduledStartAt: true,
            currentEndAt: true,
            rowVersion: true,
            category: {
              select: {
                isActive: true,
              },
            },
            _count: {
              select: {
                auctionImages: true,
              },
            },
            auctionImages: {
              where: {
                isPrimary: true,
              },

              select: {
                id: true,
              },
            },
          },
        });
        if (!auction) {
          throw new NotFoundException('Auction draft not found');
        }

        if (auction.status !== AuctionStatus.DRAFT) {
          throw new ConflictException('Only draft auctions can be published');
        }

        if (!auction.title.trim() || !auction.description.trim()) {
          throw new BadRequestException(
            'Auction title and description are required before publication',
          );
        }
        if (!auction.category.isActive) {
          throw new BadRequestException('Auction category must be active');
        }
        if (
          auction.startingPrice.lte(0) ||
          auction.minBidIncrement.lte(0) ||
          auction.reservePrice?.lte(0)
        ) {
          throw new BadRequestException(
            'Auction prices must be greater than zero',
          );
        }
        if (
          auction.reservePrice &&
          auction.reservePrice.lt(auction.startingPrice)
        ) {
          throw new BadRequestException(
            'Reserve price cannot be lower than starting price',
          );
        }
        if (!auction.scheduledStartAt || !auction.currentEndAt) {
          throw new BadRequestException(
            'Auction schedule is required before publication',
          );
        }
        if (auction.currentEndAt <= auction.scheduledStartAt) {
          throw new BadRequestException(
            'Auction end time must be later than start time',
          );
        }
        if (auction.currentEndAt <= now) {
          throw new BadRequestException(
            'Auction end time must be in the future',
          );
        }
        if (auction._count.auctionImages === 0) {
          throw new BadRequestException(
            'At least one auction image is required before publication',
          );
        }
        if (auction.auctionImages.length !== 1) {
          throw new BadRequestException(
            'Auction must have exactly one primary image before publication',
          );
        }

        const nextStatus =
          auction.scheduledStartAt > now
            ? AuctionStatus.SCHEDULED
            : AuctionStatus.ACTIVE;

        const updateResult = await transaction.auction.updateMany({
          where: {
            id: auction.id,
            sellerId: input.sellerId,
            status: AuctionStatus.DRAFT,
            deletedAt: null,
            rowVersion: auction.rowVersion,
          },
          data: {
            status: nextStatus,
            publishedAt: now,
            startedAt: nextStatus === AuctionStatus.ACTIVE ? now : null,
            rowVersion: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'Auction draft changed; reload and try again',
          );
        }

        await transaction.auctionEvent.create({
          data: {
            auctionId: auction.id,
            actorUserId: input.sellerId,
            eventType: AuctionEventType.PUBLISHED,
          },
        });

        if (nextStatus === AuctionStatus.ACTIVE) {
          await transaction.auctionEvent.create({
            data: {
              auctionId: auction.id,
              actorUserId: input.sellerId,
              eventType: AuctionEventType.STARTED,
            },
          });
        }

        const updatedAuction = await transaction.auction.findUnique({
          where: {
            id: auction.id,
          },
          select: publishAuctionSelect,
        });

        if (!updatedAuction) {
          throw new NotFoundException('Published auction not found');
        }
        return updatedAuction;
      },
    );
    return mapPublishAuctionResponse(publishedAuction);
  }
}
