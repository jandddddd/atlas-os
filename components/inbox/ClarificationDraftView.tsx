"use client";

import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";

import type { ClarificationCommunicationStatus, ClarificationDraft } from "./types";

type ClarificationDraftViewProps = {
  editableDraft: ClarificationDraft;
  /**
   * The draft's communication status, derived and tracked by the caller —
   * this component never derives it from editableDraft itself, since the
   * draft content no longer carries that truth.
   */
  communicationStatus: ClarificationCommunicationStatus;
  /**
   * True only when subject or message in editableDraft actually differs from
   * the last persisted (and, if applicable, sent-attested) content — never
   * merely because edit mode is open. Used so a sent draft with an unsaved
   * local edit never visually claims that the edited text was sent.
   */
  hasUnsavedChanges: boolean;
  isEditing: boolean;
  lastSavedAt: string | null;
  /**
   * Disables starting/saving/discarding an edit, and marking/unmarking the
   * draft as sent, without hiding the draft or discarding any text already
   * typed. Used while an unrelated workflow-mutating action is in progress
   * elsewhere. "Nachricht kopieren" stays available, since it is read-only.
   */
  disabled?: boolean;
  onChange: (draft: ClarificationDraft) => void;
  onStartEditing: () => void;
  onSave: () => void;
  onDiscard: () => void;
  /** Explicit human confirmation that this draft was sent outside ATLAS. */
  onMarkSent: () => void;
  /** Corrects an ATLAS-side sent marking; never claims the message itself was un-sent. */
  onUnmarkSent: () => void;
};

const COPY_STATUS_RESET_DELAY_MS = 2500;

export function ClarificationDraftView({
  editableDraft,
  communicationStatus,
  hasUnsavedChanges,
  isEditing,
  lastSavedAt,
  disabled = false,
  onChange,
  onStartEditing,
  onSave,
  onDiscard,
  onMarkSent,
  onUnmarkSent,
}: ClarificationDraftViewProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current);
      }
    };
  }, []);

  // A sent attestation applies to the exact persisted content it was granted
  // for; once the visible text diverges from that (an unsaved local edit),
  // the status must say so honestly instead of claiming the edited text was
  // sent. The persisted marker itself is untouched here — this only changes
  // what is displayed until the edit is saved or discarded.
  const statusLabel =
    communicationStatus === "sent"
      ? hasUnsavedChanges
        ? "Änderungen noch nicht versendet"
        : "Rückfrage versendet"
      : "Rückfrage vorbereitet";

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(editableDraft.message);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    if (copyResetTimeout.current) {
      clearTimeout(copyResetTimeout.current);
    }
    copyResetTimeout.current = setTimeout(
      () => setCopyStatus("idle"),
      COPY_STATUS_RESET_DELAY_MS,
    );
  }

  return (
    <section
      id="clarification-draft"
      aria-label="Rückfrageentwurf"
      tabIndex={-1}
      className="scroll-mt-6 rounded-2xl border bg-white p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
            Rückfrageentwurf
          </span>
          <p className="mt-2 text-sm font-medium text-neutral-600">{statusLabel}</p>

          <div className="mt-3 flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={disabled}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Änderungen übernehmen
                </button>
                <button
                  type="button"
                  onClick={onDiscard}
                  disabled={disabled}
                  className="rounded-lg border bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Änderungen verwerfen
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartEditing}
                disabled={disabled}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Entwurf bearbeiten
              </button>
            )}

            <button
              type="button"
              onClick={() => void copyMessage()}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
            >
              <Copy className="h-4 w-4" />
              Nachricht kopieren
            </button>

            {!isEditing &&
              (communicationStatus === "sent" ? (
                <button
                  type="button"
                  onClick={onUnmarkSent}
                  disabled={disabled}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Versandmarkierung zurücknehmen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onMarkSent}
                  disabled={disabled}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Als versendet markieren
                </button>
              ))}
          </div>

          {lastSavedAt && !isEditing && (
            <p className="mt-3 text-sm text-emerald-700">
              Änderungen gespeichert um {lastSavedAt} Uhr
            </p>
          )}

          <p role="status" aria-live="polite" className="mt-3 text-sm text-neutral-600">
            {copyStatus === "copied"
              ? "Nachricht kopiert"
              : copyStatus === "error"
                ? "Kopieren war nicht möglich."
                : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-neutral-500">Kunde</p>
          <p className="mt-1 font-medium">{editableDraft.customerName}</p>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <input
            aria-label="Betreff"
            value={editableDraft.subject}
            onChange={(event) =>
              onChange({ ...editableDraft, subject: event.target.value })
            }
            disabled={disabled}
            className="w-full rounded-lg border px-3 py-2 text-xl font-bold disabled:cursor-not-allowed disabled:opacity-60"
          />
          <textarea
            aria-label="Nachricht"
            value={editableDraft.message}
            onChange={(event) =>
              onChange({ ...editableDraft, message: event.target.value })
            }
            rows={10}
            disabled={disabled}
            className="min-h-48 w-full rounded-lg border px-3 py-2 leading-6 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      ) : (
        <>
          <h3 className="mt-4 text-xl font-bold tracking-tight">
            {editableDraft.subject}
          </h3>
          <p className="mt-2 whitespace-pre-line leading-6 text-neutral-700">
            {editableDraft.message}
          </p>
        </>
      )}

      <p className="mt-5 text-sm text-neutral-500">
        Dieser Entwurf wird nicht automatisch versendet. Prüfe ihn und kopiere
        ihn bei Bedarf in dein eigenes Kommunikationsprogramm.
      </p>
    </section>
  );
}
