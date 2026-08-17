"use client";

import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import { useEffect, useState } from "react";

import { OfferDraftView } from "@/components/inbox/OfferDraftView";
import type { OfferDraft } from "@/components/inbox/types";
import {
  findOfferWorkspaceEntry,
  loadInquiryAnalysis,
  loadOfferWorkspace,
  saveArchivedOfferDraft,
  type OfferWorkspaceEntry,
} from "@/lib/storage/inbox-storage";

const statusLabels = {
  "review-pending": "Prüfung offen",
  reviewed: "Geprüft",
} as const;

type OfferWorkspaceDetailProps = {
  offerId: string;
};

export function OfferWorkspaceDetail({ offerId }: OfferWorkspaceDetailProps) {
  const [entry, setEntry] = useState<OfferWorkspaceEntry | null | undefined>();
  const [editableOffer, setEditableOffer] = useState<OfferDraft | null>(null);
  const [isCurrentWorkflow, setIsCurrentWorkflow] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const loadedEntry = findOfferWorkspaceEntry(loadOfferWorkspace(), offerId);
      setEntry(loadedEntry);
      setEditableOffer(loadedEntry?.offer ?? null);
      setIsCurrentWorkflow(loadInquiryAnalysis()?.workflowId === offerId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [offerId]);

  if (entry === undefined) {
    return (
      <p role="status" className="mt-10 text-sm text-neutral-500">
        Angebot wird geladen …
      </p>
    );
  }

  if (entry === null || editableOffer === null) {
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

  function saveChanges() {
    if (!editableOffer) return;

    const savedEntry = saveArchivedOfferDraft(offerId, editableOffer);
    if (!savedEntry) {
      setEntry(null);
      setEditableOffer(null);
      setIsEditing(false);
      return;
    }

    setEntry(savedEntry);
    setEditableOffer(savedEntry.offer);
    setIsCurrentWorkflow(loadInquiryAnalysis()?.workflowId === offerId);
    setIsEditing(false);
    setLastSavedAt(
      new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(savedEntry.updatedAt)),
    );
  }

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

      <div className="mt-6">
        <OfferDraftView
          editableOffer={editableOffer}
          isEditing={isEditing}
          lastSavedAt={lastSavedAt}
          canEdit={!isCurrentWorkflow}
          statusLabel={statusLabels[entry.status]}
          statusTone={entry.status === "reviewed" ? "reviewed" : "pending"}
          onChange={setEditableOffer}
          onStartEditing={() => setIsEditing(true)}
          onSave={saveChanges}
          onDiscard={() => {
            setEditableOffer(entry.offer);
            setIsEditing(false);
          }}
        />
      </div>
    </>
  );
}
