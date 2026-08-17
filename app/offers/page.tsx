import { FileText } from "lucide-react";

import { OfferWorkspace } from "@/components/offers/OfferWorkspace";

export default function OffersPage() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            <FileText className="h-6 w-6 text-neutral-800" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Angebote</h1>
            <p className="mt-1 text-neutral-500">
              Entwürfe, offene Prüfungen und geprüfte Vorgänge an einem Ort.
            </p>
          </div>
        </div>

        <OfferWorkspace />
      </div>
    </main>
  );
}
