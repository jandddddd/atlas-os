import { OfferApprovalActions } from "@/components/dashboard/OfferApprovalActions";

const offerItems = [
  {
    id: 1,
    description: "Abdeck- und Vorbereitungsarbeiten",
    quantity: "1 Pauschale",
    price: "650,00 €",
  },
  {
    id: 2,
    description: "Wände und Decken grundieren",
    quantity: "120 m²",
    price: "1.080,00 €",
  },
  {
    id: 3,
    description: "Wände zweimal streichen",
    quantity: "120 m²",
    price: "2.400,00 €",
  },
  {
    id: 4,
    description: "Material und Anfahrt",
    quantity: "1 Pauschale",
    price: "720,00 €",
  },
];

export default function OfferMuellerPage() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <a
          href="/today"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← Zurück zu Heute
        </a>

        <div className="mt-8 rounded-2xl border bg-white p-8">
          <p className="text-sm font-medium text-red-600">
            Freigabe erforderlich
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Angebot Müller prüfen
          </h1>

          <p className="mt-4 text-neutral-600">
            Atlas hat den Angebotsentwurf vorbereitet. Prüfe die Angaben,
            bevor das Angebot an den Kunden versendet wird.
          </p>

          <div className="mt-8 grid gap-4 rounded-xl bg-neutral-50 p-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-neutral-500">Kunde</p>
              <p className="mt-1 font-medium">Familie Müller</p>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Angebotswert</p>
              <p className="mt-1 font-medium">4.850 €</p>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Leistung</p>
              <p className="mt-1 font-medium">Innenräume streichen</p>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Status</p>
              <p className="mt-1 font-medium">Entwurf vorbereitet</p>
            </div>
          </div>

         <section className="mt-8">
  <div className="mb-4 flex items-end justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        Angebotspositionen
      </h2>

      <p className="mt-1 text-sm text-neutral-500">
        Von Atlas auf Grundlage der Kundenanfrage vorbereitet.
      </p>
    </div>

    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
      Entwurf
    </span>
  </div>

  <div className="overflow-hidden rounded-xl border">
    <div className="grid grid-cols-[1fr_140px_140px] bg-neutral-50 px-5 py-3 text-sm font-medium text-neutral-500">
      <span>Leistung</span>
      <span>Menge</span>
      <span className="text-right">Preis</span>
    </div>

    {offerItems.map((item) => (
      <div
        key={item.id}
        className="grid grid-cols-[1fr_140px_140px] border-t bg-white px-5 py-4"
      >
        <span className="font-medium">
          {item.description}
        </span>

        <span className="text-neutral-600">
          {item.quantity}
        </span>

        <span className="text-right font-medium">
          {item.price}
        </span>
      </div>
    ))}

    <div className="flex justify-end border-t bg-neutral-50 px-5 py-5">
      <div className="w-72 space-y-2">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Nettosumme</span>
          <span>4.850,00 €</span>
        </div>

        <div className="flex justify-between text-sm text-neutral-600">
          <span>19 % MwSt.</span>
          <span>921,50 €</span>
        </div>

        <div className="flex justify-between border-t pt-3 text-lg font-semibold">
          <span>Gesamtsumme</span>
          <span>5.771,50 €</span>
        </div>
      </div>
    </div>
  </div>
</section>

          <OfferApprovalActions />
        </div>
      </div>
    </main>
  );
} 