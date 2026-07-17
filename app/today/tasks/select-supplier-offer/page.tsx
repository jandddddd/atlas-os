import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function SelectSupplierOfferPage() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <Link
          href="/today"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          ← Zurück zu Heute
        </Link>

        <div className="mt-8 rounded-2xl border bg-white p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
            <PackageSearch className="h-6 w-6 text-neutral-700" />
          </div>

          <p className="mt-6 text-sm font-medium text-emerald-700">
            Auswahl erforderlich
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Lieferantenangebot auswählen
          </h1>
          <p className="mt-4 text-neutral-600">
            Atlas hat drei Lieferantenangebote verglichen. Die detaillierte
            Auswahl wird hier als nächster Schritt ergänzt.
          </p>
        </div>
      </div>
    </main>
  );
}
