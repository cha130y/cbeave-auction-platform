import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuctionParticipantsService } from './auction-participants.service';
import { GetActiveArenaStateInput } from '../types/get-active-arena-state.input';
import { ActiveArenaStateDto } from '../dto/active-arena-state.dto';
import { AuctionStatus } from '../../generated/prisma/enums';
import { activeArenaStateSelect } from '../queries/active-arena-state.select';
import { WsException } from '@nestjs/websockets';
import { mapActiveArenaState } from '../mappers/map-active-arena-state.mapper';

@Injectable()
export class ActiveArenaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionParticipantsService: AuctionParticipantsService,
  ) {}

  async getState(
    input: GetActiveArenaStateInput,
  ): Promise<ActiveArenaStateDto> {
    const auction = await this.prisma.auction.findFirst({
      where: {
        id: input.auctionId,
        status: AuctionStatus.ACTIVE,
        deletedAt: null,
        currentEndAt: {
          gt: new Date(),
        },
      },
      select: activeArenaStateSelect,
    });

    if (!auction) {
      throw new WsException('Auction is not active');
    }

    if (!auction.startedAt || !auction.currentEndAt) {
      throw new WsException('Auction is missing lifecycle timestamps');
    }

    const participantCount = await this.auctionParticipantsService.countJoined(
      input.auctionId,
    );

    return mapActiveArenaState(
      auction,
      input.userId,
      input.userRole,
      participantCount,
    );
  }
}
