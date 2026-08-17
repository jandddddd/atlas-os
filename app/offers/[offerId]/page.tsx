import { OfferWorkspaceDetail } from "@/components/offers/OfferWorkspaceDetail";

export default async function OfferDetailPage({ params }: PageProps<"/offers/[offerId]">) {
  const { offerId } = await params;

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
        <OfferWorkspaceDetail offerId={offerId} />
      </div>
    </main>
  );
}
