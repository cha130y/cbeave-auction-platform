import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ListNotificationsResponseDto,
  NotificationResponseDto,
} from './dto/list-notifications-response.dto';
import { MarkNotificationReadInput } from './types/mark-notification-read.input';
import { NotificationType, Prisma } from '../generated/prisma/client';
import { CreateOutbidNotificationInput } from './types/create-outbid-notification.input';
import { ListNotificationsInput } from './types/list-notifications.input';
import { CreateAuctionResultNotificationsInput } from './types/create-auction-result-notifications.input';
import { CreateAuctionCancellationNotificationsInput } from './types/create-auction-cancellation-notifications.input';
import { assertCursorExists } from '../common/pagination/assert-cursor-exists.util';
import { paginate } from '../common/pagination/paginate.util';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(
    input: ListNotificationsInput,
  ): Promise<ListNotificationsResponseDto> {
    if (input.cursor) {
      await assertCursorExists(
        this.prisma.notification,
        {
          id: input.cursor,
          userId: input.userId,
        },
        'Invalid notification cursor',
      );
    }

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: input.userId,
        //unread ==> no readAt
        ...(input.unreadOnly ? { readAt: null } : {}),
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
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1,
      select: {
        id: true,
        auctionId: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    });

    const { page, nextCursor } = paginate(
      notifications,
      input.limit,
      (notification) => notification.id,
    );

    return {
      items: page,
      nextCursor,
    };
  }

  async markNotificationAsRead(
    input: MarkNotificationReadInput,
  ): Promise<NotificationResponseDto> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.notification.updateMany({
        where: {
          id: input.notificationId,
          userId: input.userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      const notification = await transaction.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: input.userId,
        },
        select: {
          id: true,
          auctionId: true,
          type: true,
          title: true,
          message: true,
          readAt: true,
          createdAt: true,
        },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }
      return notification;
    });
  }

  async createOutbidNotification(
    transaction: Prisma.TransactionClient,
    input: CreateOutbidNotificationInput,
  ): Promise<void> {
    await transaction.notification.create({
      data: {
        userId: input.userId,
        auctionId: input.auctionId,
        bidId: input.bidId,
        type: NotificationType.OUTBID,
        title: 'You have been outbid',
        message:
          `A higher bid was placed on "${input.auctionTitle}". ` +
          `The current price is ${input.currentPrice} ${input.currency}.`,
      },
    });
  }

  async createAuctionResultNotifications(
    transaction: Prisma.TransactionClient,
    input: CreateAuctionResultNotificationsInput,
  ): Promise<void> {
    await transaction.notification.create({
      data: {
        userId: input.sellerId,
        auctionId: input.auctionId,
        bidId: input.result.sold
          ? input.result.winningBidId
          : input.result.highestBidId,
        type: NotificationType.AUCTION_ENDED,
        title: 'Your auction has ended',
        message: input.result.sold
          ? `"${input.auctionTitle}" sold for ` +
            `${input.result.soldPrice} ${input.currency}.`
          : `"${input.auctionTitle}" ended without a successful sale.`,
      },
    });

    if (!input.result.sold) {
      return;
    }

    await transaction.notification.create({
      data: {
        userId: input.result.winnerUserId,
        auctionId: input.auctionId,
        bidId: input.result.winningBidId,
        type: NotificationType.AUCTION_WON,
        title: 'You won the auction',
        message:
          `You won "${input.auctionTitle}" with a bid of ` +
          `${input.result.soldPrice} ${input.currency}.`,
      },
    });
  }

  async createAuctionCancellationNotifications(
    transaction: Prisma.TransactionClient,
    input: CreateAuctionCancellationNotificationsInput,
  ): Promise<void> {
    if (input.userIds.length === 0) {
      return;
    }

    await transaction.notification.createMany({
      data: input.userIds.map((userId) => ({
        userId,
        auctionId: input.auctionId,
        bidId: null,
        type: NotificationType.AUCTION_CANCELLED,
        title: 'Auction cancelled',
        message:
          `Auction "${input.auctionTitle}" was cancelled. ` +
          `Reason: ${input.reason}`,
      })),
    });
  }
}
