import { AdminActionType, AuctionStatus } from '../../generated/prisma/enums';

export class AdminActionUserResponseDto {
  id: string;
  email: string;
  displayName: string | null;
}

export class AdminActionAuctionResponseDto {
  id: string;
  title: string;
  status: AuctionStatus;
}

export class AdminActionCategoryResponseDto {
  id: string;
  name: string;
}

export class AdminActionResponseDto {
  id: string;
  actionType: AdminActionType;
  note: string | null;
  createdAt: Date;
  adminUser: AdminActionUserResponseDto;
  targetUser: AdminActionUserResponseDto | null;
  auction: AdminActionAuctionResponseDto | null;
  category: AdminActionCategoryResponseDto | null;
}

export class ListAdminActionsResponseDto {
  items: AdminActionResponseDto[];
  nextCursor: string | null;
}
