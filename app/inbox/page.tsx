import { Inbox } from "lucide-react";

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

        <section className="mt-10 rounded-2xl border bg-white p-5 sm:p-8">
          <InboxAnalysis />
        </section>
      </div>
    </main>
  );
}
