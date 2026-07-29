import { PublicAuctionDetail } from '@/features/auctions/components/public-auction-detail';

type AuctionDetailPageProps = {
  params: Promise<{
    auctionId: string;
  }>;
};

export default async function AuctionDetailPage({
  params,
}: AuctionDetailPageProps) {
  const { auctionId } = await params;
  return <PublicAuctionDetail auctionId={auctionId} />;
}
