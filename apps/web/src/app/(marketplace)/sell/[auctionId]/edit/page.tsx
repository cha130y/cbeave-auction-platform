import { EditAuctionScreen } from '@/features/auctions/components/edit-auction-screen';

type EditAuctionPageProps = {
  params: Promise<{
    auctionId: string;
  }>;
};

export default async function EditAuctionPage({
  params,
}: EditAuctionPageProps) {
  const { auctionId } = await params;

  return <EditAuctionScreen auctionId={auctionId} />;
}
