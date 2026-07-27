import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(
    input: ListNotificationsInput,
  ): Promise<ListNotificationsResponseDto> {
    if (input.cursor) {
      const cursorExists = await this.prisma.notification.findFirst({
        where: {
          id: input.cursor,
          userId: input.userId,
        },
        select: {
          id: true,
        },
      });
      if (!cursorExists) {
        throw new BadRequestException('Invalid notification cursor');
      }
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

    const hasMore = notifications.length > input.limit;
    const page = hasMore ? notifications.slice(0, input.limit) : notifications;
    const lastNotification = page[page.length - 1];
    return {
      items: page,
      nextCursor: hasMore && lastNotification ? lastNotification.id : null,
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
}
