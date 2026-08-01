import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/use-auth';
import { usePlaceBid } from '@/features/bidding/queries/bidding.queries';

import { PlaceBidForm } from './place-bid-form';

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/bidding/queries/bidding.queries', () => ({
  usePlaceBid: vi.fn(),
}));

const auction = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'ACTIVE' as const,
  currency: 'USD',
  currentPrice: '100.00',
  minBidIncrement: '5.00',
  seller: {
    id: 'seller-user-id',
    displayName: 'AuctionSeller',
    avatarUrl: null,
  },
};

const mutateAsync = vi.fn();

function setUnauthenticatedUser() {
  vi.mocked(useAuth).mockReturnValue({
    status: 'unauthenticated',
    user: null,
  } as ReturnType<typeof useAuth>);
}

function setAuthenticatedBidder() {
  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    user: {
      id: 'bidder-user-id',
      role: 'USER',
    },
  } as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();

  setUnauthenticatedUser();

  vi.mocked(usePlaceBid).mockReturnValue({
    isPending: false,
    mutateAsync,
  } as unknown as ReturnType<typeof usePlaceBid>);
});

describe('PlaceBidForm', () => {
  it('explains when bidding is not open', () => {
    render(
      <PlaceBidForm
        auction={{
          ...auction,
          status: 'SOLD',
        }}
      />,
    );

    expect(screen.getByText('Bidding is not open')).toBeInTheDocument();
  });

  it('asks unauthenticated visitors to sign in', () => {
    render(<PlaceBidForm auction={auction} />);

    expect(screen.getByText('Sign in to place a bid')).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: 'Log in or register' }),
    ).toHaveAttribute('href', '/auth');
  });

  it('rejects a bid below the minimum next bid', async () => {
    setAuthenticatedBidder();

    const user = userEvent.setup();

    render(<PlaceBidForm auction={auction} />);

    await user.type(screen.getByLabelText('Your bid'), '104.99');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));

    expect(
      await screen.findByText('Bid must be at least 105.00'),
    ).toBeInTheDocument();

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits an eligible bid and shows confirmation', async () => {
    setAuthenticatedBidder();

    mutateAsync.mockResolvedValue({
      amount: '105.00',
    });

    const user = userEvent.setup();

    render(<PlaceBidForm auction={auction} />);

    await user.type(screen.getByLabelText('Your bid'), '105.00');
    await user.click(screen.getByRole('button', { name: 'Place bid' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        auctionId: auction.id,
        amount: '105.00',
      });
    });

    expect(
      await screen.findByText('Bid accepted at $105.00.'),
    ).toBeInTheDocument();
  });
});
