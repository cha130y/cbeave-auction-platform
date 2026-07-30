import { AuctionDraftScreen } from '@/features/auctions/components/auction-draft-screen';

type AuctionDraftPageProps = {
  params: Promise<{
    auctionId: string;
  }>;
};

export default async function AuctionDraftPage({
  params,
}: AuctionDraftPageProps) {
  const { auctionId } = await params;

  return <AuctionDraftScreen auctionId={auctionId} />;
}
