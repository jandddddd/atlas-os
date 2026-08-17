"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Inbox } from "lucide-react";
import { useEffect, useState } from "react";

import {
  findOfferWorkspaceEntry,
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

type OfferWorkspaceDetailProps = {
  offerId: string;
};

export function OfferWorkspaceDetail({ offerId }: OfferWorkspaceDetailProps) {
  const [entry, setEntry] = useState<OfferWorkspaceEntry | null | undefined>();
  const [isCurrentWorkflow, setIsCurrentWorkflow] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setEntry(findOfferWorkspaceEntry(loadOfferWorkspace(), offerId));
      setIsCurrentWorkflow(loadInquiryAnalysis()?.workflowId === offerId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [offerId]);

  if (entry === undefined) {
    return <p role="status" className="mt-10 text-sm text-neutral-500">Angebot wird geladen …</p>;
  }

  if (entry === null) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed bg-white p-8 text-center">
        <Inbox className="mx-auto h-8 w-8 text-neutral-400" />
        <h2 className="mt-4 text-xl font-semibold">Angebot nicht gefunden</h2>
        <p className="mx-auto mt-2 max-w-xl text-neutral-600">
          Dieser Entwurf ist nicht mehr im lokalen Angebotsarchiv dieses Browsers gespeichert.
        </p>
        <Link href="/offers" className="mt-6 inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700">
          Zur Angebotsübersicht
        </Link>
      </section>
    );
  }

  const { offer } = entry;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/offers" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Alle Angebote
        </Link>
        {isCurrentWorkflow ? (
          <Link href="/inbox#offer-draft" className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700">
            In der Inbox bearbeiten
          </Link>
        ) : null}
      </div>

      <article className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
              <FileText className="h-5 w-5 text-neutral-700" />
            </span>
            <div>
              <span className={entry.status === "reviewed" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800" : "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"}>
                {statusLabels[entry.status]}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">{offer.title}</h1>
              <p className="mt-2 text-neutral-600">{offer.projectSummary}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Kunde</p>
            <p className="mt-1 font-medium">{offer.customerName}</p>
            <p className="mt-3 text-xs text-neutral-500">Aktualisiert {dateFormatter.format(new Date(entry.updatedAt))}</p>
          </div>
        </div>

        <section aria-labelledby="positions-heading" className="mt-8 overflow-hidden rounded-xl border">
          <h2 id="positions-heading" className="bg-neutral-50 px-5 py-3 text-sm font-semibold text-neutral-700">Leistungen</h2>
          {offer.positions.length === 0 ? (
            <p className="px-5 py-5 text-sm text-neutral-500">Noch keine Leistungen erfasst.</p>
          ) : offer.positions.map((position) => (
            <div key={position.id} className="grid gap-3 border-t px-5 py-4 sm:grid-cols-[minmax(0,1fr)_110px_150px]">
              <div>
                <p className="font-medium">{position.description}</p>
                {position.notes ? <p className="mt-1 text-sm text-neutral-500">{position.notes}</p> : null}
              </div>
              <p className="text-sm text-neutral-700">{position.quantity}</p>
              <p className="text-sm text-neutral-700">{position.unit}</p>
            </div>
          ))}
        </section>

        {offer.assumptions.length > 0 ? (
          <section className="mt-6 rounded-xl bg-neutral-50 p-5">
            <h2 className="font-semibold">Annahmen</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">{offer.assumptions.map((item) => <li key={item}>• {item}</li>)}</ul>
          </section>
        ) : null}

        {offer.missingInformation.length > 0 ? (
          <section className="mt-4 rounded-xl bg-sky-100 p-5">
            <h2 className="font-semibold text-sky-900">Vor Freigabe noch klären</h2>
            <ul className="mt-3 space-y-2 text-sm text-sky-800">{offer.missingInformation.map((item) => <li key={item}>• {item}</li>)}</ul>
          </section>
        ) : null}

        <section className="mt-6 rounded-xl border p-5">
          <h2 className="text-sm font-normal text-neutral-500">Empfohlener nächster Schritt</h2>
          <p className="mt-1 font-medium">{offer.recommendedNextStep}</p>
        </section>

        <p className="mt-5 text-sm text-neutral-500">Dieser Entwurf enthält bewusst noch keine Preise und bleibt unverbindlich.</p>
      </article>
    </>
  );
}
