import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Trim } from '../../common/decorators/Trim.decorator';

export class AddAuctionImageDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  altText?: string;
}
