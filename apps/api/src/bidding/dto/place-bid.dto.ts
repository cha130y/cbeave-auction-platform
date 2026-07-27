import { IsString, IsUUID, Matches } from 'class-validator';
import { Trim } from '../../common/decorators/Trim.decorator';
import {
  AUCTION_MONEY_AMOUNT_MESSAGE,
  AUCTION_MONEY_AMOUNT_PATTERN,
} from '../../auctions/validation/auction-money.validation';

export class PlaceBidDto {
  @Trim()
  @IsString()
  @Matches(AUCTION_MONEY_AMOUNT_PATTERN, {
    message: `amount ${AUCTION_MONEY_AMOUNT_MESSAGE}`,
  })
  amount: string;

  @IsUUID('4')
  clientRequestId: string;
}
