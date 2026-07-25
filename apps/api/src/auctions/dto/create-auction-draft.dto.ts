import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/decorators/Trim.decorator';
import { Type } from 'class-transformer';

const MONEY_AMOUNT_PATTERN =
  /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,15}(?:\.\d{1,2})?)$/;

const MONEY_AMOUNT_MESSAGE =
  'must be a positive monetary amount with at most 2 decimal places';
export class CreateAuctionDraftDto {
  @IsUUID()
  categoryId: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @Trim()
  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN, {
    message: `startingPrice ${MONEY_AMOUNT_MESSAGE}`,
  })
  startingPrice: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN, {
    message: `reservePrice ${MONEY_AMOUNT_MESSAGE}`,
  })
  reservePrice?: string | null;

  @Trim()
  @IsString()
  @Matches(MONEY_AMOUNT_PATTERN, {
    message: `minBidIncrement ${MONEY_AMOUNT_MESSAGE}`,
  })
  minBidIncrement: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledStartAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledEndAt?: Date | null;
}
