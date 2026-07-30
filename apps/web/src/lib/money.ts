//ex. "12.34" → 1234n , "12.3" → 1230n , "12" → 1200n , "-12.34" → -1234n
function toMinorUnits(amount: string): bigint {
  const match = amount.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`Invalid monetary amount: ${amount}`);
  }

  const [, wholePart, decimalPart = ''] = match;

  return BigInt(wholePart) * BigInt(100) + BigInt(decimalPart.padEnd(2, '0'));
}

function fromMinorUnits(amount: bigint): string {
  const wholePart = amount / BigInt(100);
  const decimalPart = (amount % BigInt(100)).toString().padStart(2, '0');

  return `${wholePart}.${decimalPart}`;
}

export function addMoneyAmounts(left: string, right: string): string {
  return fromMinorUnits(toMinorUnits(left) + toMinorUnits(right));
}

export function isMoneyAtLeast(amount: string, minimumAmount: string): boolean {
  return toMinorUnits(amount) >= toMinorUnits(minimumAmount);
}
