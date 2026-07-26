import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/decorators/Trim.decorator';
import { Type } from 'class-transformer';
import {
  AUCTION_MONEY_AMOUNT_MESSAGE,
  AUCTION_MONEY_AMOUNT_PATTERN,
} from '../validation/auction-money.validation';

export class UpdateAuctionDraftDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  categoryId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString()
  @Matches(AUCTION_MONEY_AMOUNT_PATTERN, {
    message: `startingPrice ${AUCTION_MONEY_AMOUNT_MESSAGE}`,
  })
  startingPrice?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Matches(AUCTION_MONEY_AMOUNT_PATTERN, {
    message: `reservePrice ${AUCTION_MONEY_AMOUNT_MESSAGE}`,
  })
  reservePrice?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString()
  @Matches(AUCTION_MONEY_AMOUNT_PATTERN, {
    message: `minBidIncrement ${AUCTION_MONEY_AMOUNT_MESSAGE}`,
  })
  minBidIncrement?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledStartAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledEndAt?: Date | null;
}
