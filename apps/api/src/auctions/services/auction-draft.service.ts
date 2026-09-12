import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AuctionEventType,
  AuctionStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuctionDraftResponseDto } from '../dto/auction-draft-response.dto';
import { CreateAuctionDraftInput } from '../types/create-auction-draft.input';
import { DeleteAuctionDraftInput } from '../types/delete-auction-draft.input';
import { UpdateAuctionDraftInput } from '../types/update-auction-draft.input';
import { auctionDraftSelect } from '../queries/auction-draft.select';
import { mapAuctionDraftResponse } from '../mappers/map-auction-draft-response.mapper';
import { assertValidAuctionPricing } from '../utils/assert-valid-auction-pricing.util';
import { assertValidAuctionSchedule } from '../utils/assert-valid-auction-schedule.util';
import { AuctionImageStorageService } from './auction-image-storage.service';

/**
 * Everything a seller may do to an auction before it is published: creating it,
 * reading it back, editing it, and deleting it.
 */
@Injectable()
export class AuctionDraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionImageStorageService: AuctionImageStorageService,
  ) {}

  async createDraft(
    input: CreateAuctionDraftInput,
  ): Promise<AuctionDraftResponseDto> {
    const startingPrice = new Prisma.Decimal(input.startingPrice);
    const minBidIncrement = new Prisma.Decimal(input.minBidIncrement);

    const reservePrice =
      input.reservePrice !== undefined && input.reservePrice !== null
        ? new Prisma.Decimal(input.reservePrice)
        : null;

    assertValidAuctionPricing(startingPrice, minBidIncrement, reservePrice);

    const scheduledStartAt = input.scheduledStartAt ?? null;
    const scheduledEndAt = input.scheduledEndAt ?? null;

    assertValidAuctionSchedule(scheduledStartAt, scheduledEndAt);

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
    this.assertUpdateIsWellFormed(input);

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

      assertValidAuctionPricing(startingPrice, minBidIncrement, reservePrice);

      const scheduledStartAt =
        input.scheduledStartAt === undefined
          ? currentAuction.scheduledStartAt
          : input.scheduledStartAt;

      const scheduledEndAt =
        input.scheduledEndAt === undefined
          ? currentAuction.originalEndAt
          : input.scheduledEndAt;

      assertValidAuctionSchedule(scheduledStartAt, scheduledEndAt);

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
      await this.auctionImageStorageService.deleteQuietly(storageKey);
    }
  }

  // Both checks are rejected before a transaction is opened: neither of them
  // needs the database to decide.
  private assertUpdateIsWellFormed(input: UpdateAuctionDraftInput): void {
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
  }
}
