import { Injectable } from '@nestjs/common';
import { AuctionStatus, ParticipantStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { AuctionParticipationResult } from '../types/auction-participation-result.type';
import { WsException } from '@nestjs/websockets';
import { UpdateAuctionParticipationInput } from '../types/update-auction-participation.input';

const PARTICIPATION_AUCTION_STATUSES: AuctionStatus[] = [
  AuctionStatus.SCHEDULED,
  AuctionStatus.ACTIVE,
];

@Injectable()
export class AuctionParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async join(
    input: UpdateAuctionParticipationInput,
  ): Promise<AuctionParticipationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const auction = await transaction.auction.findFirst({
        where: {
          id: input.auctionId,
          status: {
            in: PARTICIPATION_AUCTION_STATUSES,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!auction) {
        throw new WsException('Auction is not available for participation');
      }

      const now = new Date();

      await transaction.auctionParticipant.upsert({
        where: {
          auctionId_userId: {
            auctionId: input.auctionId,
            userId: input.userId,
          },
        },
        create: {
          auctionId: input.auctionId,
          userId: input.userId,
          status: ParticipantStatus.JOINED,
          joinedAt: now,
          lastSeenAt: now,
        },
        update: {
          status: ParticipantStatus.JOINED,
          joinedAt: now,
          lastSeenAt: now,
        },
      });

      const participantCount = await transaction.auctionParticipant.count({
        where: {
          auctionId: input.auctionId,
          status: ParticipantStatus.JOINED,
        },
      });

      return {
        auctionId: input.auctionId,
        participantCount,
      };
    });
  }

  async leave(
    input: UpdateAuctionParticipationInput,
  ): Promise<AuctionParticipationResult> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.auctionParticipant.updateMany({
        where: {
          auctionId: input.auctionId,
          userId: input.userId,
          status: ParticipantStatus.JOINED,
        },
        data: {
          status: ParticipantStatus.LEFT,
          lastSeenAt: new Date(),
        },
      });

      const participantCount = await transaction.auctionParticipant.count({
        where: {
          auctionId: input.auctionId,
          status: ParticipantStatus.JOINED,
        },
      });

      return {
        auctionId: input.auctionId,
        participantCount,
      };
    });
  }

  async countJoined(auctionId: string): Promise<number> {
    return this.prisma.auctionParticipant.count({
      where: {
        auctionId,
        status: ParticipantStatus.JOINED,
      },
    });
  }
}
