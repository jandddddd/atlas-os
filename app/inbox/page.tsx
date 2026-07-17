import { Inbox, Mail, MapPin, UserRound } from "lucide-react";

import { InboxAnalysis } from "@/components/inbox/InboxAnalysis";

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-5xl px-8 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Inbox className="h-6 w-6 text-neutral-800" />
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Neue Kundenanfrage
            </h1>

            <p className="mt-1 text-neutral-500">
              Atlas prüft die Anfrage und bereitet die nächsten Schritte vor.
            </p>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border bg-white p-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-neutral-50 p-5">
              <UserRound className="h-5 w-5 text-neutral-700" />

              <p className="mt-4 text-sm text-neutral-500">
                Kunde
              </p>

              <p className="mt-1 font-medium">
                Familie Schneider
              </p>
            </div>

            <div className="rounded-xl bg-neutral-50 p-5">
              <Mail className="h-5 w-5 text-neutral-700" />

              <p className="mt-4 text-sm text-neutral-500">
                Eingang
              </p>

              <p className="mt-1 font-medium">
                E-Mail
              </p>
            </div>

            <div className="rounded-xl bg-neutral-50 p-5">
              <MapPin className="h-5 w-5 text-neutral-700" />

              <p className="mt-4 text-sm text-neutral-500">
                Ort
              </p>

              <p className="mt-1 font-medium">
                Mannheim
              </p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-medium text-neutral-500">
              Nachricht
            </p>

            <div className="mt-3 rounded-xl border bg-neutral-50 p-6 leading-7 text-neutral-700">
              Guten Tag, wir möchten unser Wohnzimmer, Esszimmer und den
              Flur streichen lassen. Die Räume sind zusammen ungefähr
              75 Quadratmeter groß. Könnten Sie uns bitte ein Angebot
              erstellen? Bilder können wir gerne nachreichen.
            </div>
          </div>

          <InboxAnalysis />
        </section>
      </div>
    </main>
  );
}