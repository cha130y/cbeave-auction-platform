import { AuctionLobbyScreen } from '@/features/live-arena/components/auction-lobby-screen';

type AuctionLivePageProps = {
  params: Promise<{
    auctionId: string;
  }>;
};

export default async function AuctionLivePage({
  params,
}: AuctionLivePageProps) {
  const { auctionId } = await params;

  return <AuctionLobbyScreen auctionId={auctionId} />;
}
