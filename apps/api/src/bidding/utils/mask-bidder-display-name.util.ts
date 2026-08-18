type MaskableBidder = {
  userProfile?: { displayName: string | null } | null;
};

export function maskBidderDisplayNameOrDefault(bidder: MaskableBidder): string {
  return maskBidderDisplayName(bidder.userProfile?.displayName ?? 'Bidder');
}

export function maskBidderDisplayName(displayName: string): string {
  const characters = Array.from(displayName.trim());

  if (characters.length === 0) {
    return '***';
  }

  if (characters.length === 1) {
    return '*';
  }

  if (characters.length === 2) {
    return `${characters[0]}*`;
  }

  return `${characters[0]}***${characters[characters.length - 1]}`;
}
