import Link from "next/link";
import { CalendarDays, Clock3, MapPin } from "lucide-react";

export default function VisitWeberPage() {
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
          <p className="text-sm font-medium text-amber-700">
            Terminbestätigung erforderlich
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Besichtigung Weber bestätigen
          </h1>

          <p className="mt-4 text-neutral-600">
            Atlas hat den Termin mit dem Kunden abgestimmt. Prüfe die Angaben
            und bestätige oder ändere den Vorschlag.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-neutral-50 p-5">
              <CalendarDays className="h-5 w-5 text-neutral-700" />

              <p className="mt-4 text-sm text-neutral-500">
                Datum
              </p>

              <p className="mt-1 font-medium">
                Heute
              </p>
            </div>

            <div className="rounded-xl bg-neutral-50 p-5">
              <Clock3 className="h-5 w-5 text-neutral-700" />

              <p className="mt-4 text-sm text-neutral-500">
                Uhrzeit
              </p>

              <p className="mt-1 font-medium">
                15:30 Uhr
              </p>
            </div>

            <div className="rounded-xl bg-neutral-50 p-5">
              <MapPin className="h-5 w-5 text-neutral-700" />

              <p className="mt-4 text-sm text-neutral-500">
                Adresse
              </p>

              <p className="mt-1 font-medium">
                Gartenstraße 18
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border bg-neutral-50 p-6">
            <h2 className="text-lg font-semibold">
              Notiz von Atlas
            </h2>

            <p className="mt-2 text-neutral-600">
              Der Kunde bevorzugt den Nachmittag. Die Anfahrt von der
              vorherigen Baustelle beträgt voraussichtlich 18 Minuten.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700">
              Termin bestätigen
            </button>

            <button className="rounded-xl border bg-white px-6 py-3 font-medium transition hover:bg-neutral-50">
              Anderen Termin vorschlagen
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}