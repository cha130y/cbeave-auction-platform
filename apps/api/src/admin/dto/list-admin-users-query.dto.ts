import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums';
import { Type } from 'class-transformer';

export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsUUID('4')
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
