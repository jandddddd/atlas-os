"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Inbox } from "lucide-react";

import {
  loadInquiryAnalysis,
  loadOfferWorkspace,
  type OfferWorkspaceEntry,
} from "@/lib/storage/inbox-storage";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels = {
  "review-pending": "Prüfung offen",
  reviewed: "Geprüft",
} as const;

export function OfferWorkspace() {
  const [offers, setOffers] = useState<OfferWorkspaceEntry[] | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOffers(loadOfferWorkspace());
      setCurrentWorkflowId(loadInquiryAnalysis()?.workflowId ?? null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (offers === null) {
    return (
      <p role="status" className="mt-10 text-sm text-neutral-500">
        Angebote werden geladen …
      </p>
    );
  }

  if (offers.length === 0) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed bg-white p-8 text-center">
        <Inbox className="mx-auto h-8 w-8 text-neutral-400" />
        <h2 className="mt-4 text-xl font-semibold">Noch keine Angebotsentwürfe</h2>
        <p className="mx-auto mt-2 max-w-xl text-neutral-600">
          Analysiere zuerst eine Kundenanfrage in der Inbox und erstelle daraus
          einen Angebotsentwurf. Atlas übernimmt ihn anschließend automatisch
          hierher.
        </p>
        <Link
          href="/inbox"
          className="mt-6 inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Zur Inbox
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="offer-list-heading" className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">
            {offers.length} {offers.length === 1 ? "Vorgang" : "Vorgänge"}
          </p>
          <h2 id="offer-list-heading" className="mt-1 text-2xl font-semibold">
            Angebotsentwürfe
          </h2>
        </div>
        <Link
          href="/inbox"
          className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
        >
          Neue Anfrage analysieren
        </Link>
      </div>

      <div className="mt-5 grid gap-4">
        {offers.map((entry) => {
          const isCurrentWorkflow = entry.workflowId === currentWorkflowId;

          return (
            <article
              key={entry.id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <FileText className="h-5 w-5 text-neutral-700" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={entry.status === "reviewed"
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                          : "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"}
                      >
                        {statusLabels[entry.status]}
                      </span>
                      {isCurrentWorkflow ? (
                        <span className="text-xs font-medium text-neutral-500">
                          Aktueller Inbox-Vorgang
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 truncate text-xl font-semibold">
                      {entry.offer.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      {entry.offer.customerName}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">
                      {entry.offer.projectSummary}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-neutral-500">
                    Aktualisiert {dateFormatter.format(new Date(entry.updatedAt))}
                  </p>
                  <Link
                    href={`/offers/${encodeURIComponent(entry.id)}`}
                    className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
                  >
                    Details ansehen
                  </Link>
                  {isCurrentWorkflow ? (
                    <Link
                      href="/inbox#offer-draft"
                      className="mt-3 block text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
                    >
                      In der Inbox bearbeiten
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
