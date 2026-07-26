export const AUCTION_MONEY_AMOUNT_PATTERN =
  /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,15}(?:\.\d{1,2})?)$/;

export const AUCTION_MONEY_AMOUNT_MESSAGE =
  'must be a positive monetary amount with at most 2 decimal places';
