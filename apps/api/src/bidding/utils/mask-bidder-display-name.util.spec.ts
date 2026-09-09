import {
  maskBidderDisplayName,
  maskBidderDisplayNameOrDefault,
} from './mask-bidder-display-name.util';

describe('maskBidderDisplayName', () => {
  it('keeps only the first and last character of a longer name', () => {
    expect(maskBidderDisplayName('AuctionJohn')).toBe('A***n');
  });

  it('uses a fixed number of stars so length stays private', () => {
    expect(maskBidderDisplayName('Al')).toBe('A*');
    expect(maskBidderDisplayName('Ann')).toBe('A***n');
    expect(maskBidderDisplayName('Alexander')).toBe('A***r');
  });

  it('masks a single character entirely', () => {
    expect(maskBidderDisplayName('A')).toBe('*');
  });

  it('masks an empty or whitespace-only name entirely', () => {
    expect(maskBidderDisplayName('')).toBe('***');
    expect(maskBidderDisplayName('   ')).toBe('***');
  });

  it('trims surrounding whitespace before masking', () => {
    expect(maskBidderDisplayName('  Somchai  ')).toBe('S***i');
  });

  it('counts code points rather than UTF-16 units', () => {
    expect(maskBidderDisplayName('สมชาย')).toBe('ส***ย');
    expect(maskBidderDisplayName('🙂🙂🙂')).toBe('🙂***🙂');
  });
});

describe('maskBidderDisplayNameOrDefault', () => {
  it('masks the display name of a bidder with a profile', () => {
    expect(
      maskBidderDisplayNameOrDefault({
        userProfile: { displayName: 'AuctionJohn' },
      }),
    ).toBe('A***n');
  });

  it('falls back to a generic label when the profile has no display name', () => {
    expect(
      maskBidderDisplayNameOrDefault({ userProfile: { displayName: null } }),
    ).toBe('B***r');
  });

  it('falls back to a generic label when the bidder has no profile', () => {
    expect(maskBidderDisplayNameOrDefault({ userProfile: null })).toBe('B***r');
    expect(maskBidderDisplayNameOrDefault({})).toBe('B***r');
  });
});
