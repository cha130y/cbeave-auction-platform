import { Type } from 'class-transformer';
import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';

export class ListWatchlistQueryDto {
  @IsOptional()
  @IsUUID('4')
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
