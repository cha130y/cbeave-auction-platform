import { describe, expect, it } from 'vitest';

import { addMoneyAmounts, isMoneyAtLeast } from './money';

describe('addMoneyAmounts', () => {
  it('adds two monetary values without floating-point errors', () => {
    expect(addMoneyAmounts('12.30', '0.20')).toBe('12.50');
  });

  it('normalizes amounts to two decimal places', () => {
    expect(addMoneyAmounts('12', '0.5')).toBe('12.50');
  });
});

describe('isMoneyAtLeast', () => {
  it('returns true when the amount equals the minimum', () => {
    expect(isMoneyAtLeast('100.00', '100.00')).toBe(true);
  });

  it('returns true when the amount is greater than the minimum', () => {
    expect(isMoneyAtLeast('105.00', '100.00')).toBe(true);
  });

  it('returns false when the amount is below the minimum', () => {
    expect(isMoneyAtLeast('99.99', '100.00')).toBe(false);
  });
});
