"use client";

import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";

import type { ClarificationDraft } from "./types";

type ClarificationDraftViewProps = {
  editableDraft: ClarificationDraft;
  isEditing: boolean;
  lastSavedAt: string | null;
  onChange: (draft: ClarificationDraft) => void;
  onStartEditing: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

const COPY_STATUS_RESET_DELAY_MS = 2500;

export function ClarificationDraftView({
  editableDraft,
  isEditing,
  lastSavedAt,
  onChange,
  onStartEditing,
  onSave,
  onDiscard,
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

          <div className="mt-3 flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
                >
                  Änderungen übernehmen
                </button>
                <button
                  type="button"
                  onClick={onDiscard}
                  className="rounded-lg border bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
                >
                  Änderungen verwerfen
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartEditing}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
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
            className="w-full rounded-lg border px-3 py-2 text-xl font-bold"
          />
          <textarea
            aria-label="Nachricht"
            value={editableDraft.message}
            onChange={(event) =>
              onChange({ ...editableDraft, message: event.target.value })
            }
            rows={10}
            className="min-h-48 w-full rounded-lg border px-3 py-2 leading-6 text-neutral-700"
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
