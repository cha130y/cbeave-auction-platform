import { Type } from 'class-transformer';
import { IsOptional, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { AdminActionType } from '../../generated/prisma/enums';

export class ListAdminActionsQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsEnum(AdminActionType)
  actionType?: AdminActionType;
}
