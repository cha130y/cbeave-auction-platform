import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

@Injectable()
export class AuctionsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
