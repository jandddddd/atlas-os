"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareText } from "lucide-react";

export function OfferApprovalActions() {
  const [mode, setMode] = useState<
    "idle" | "approved" | "requesting-change" | "change-requested"
  >("idle");

  const [changeRequest, setChangeRequest] = useState("");
  const router = useRouter();

  function approveOffer() {
    setMode("approved");

    window.setTimeout(() => {
      router.push("/today?offerApproved=true");
    }, 1200);
  }

  function submitChangeRequest() {
    const cleanedRequest = changeRequest.trim();

    if (!cleanedRequest) {
      return;
    }

    setMode("change-requested");

    window.setTimeout(() => {
      router.push("/today?changeRequested=true");
    }, 1200);
  }

  if (mode === "approved") {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />

          <div>
            <p className="font-semibold text-emerald-900">
              Angebot freigegeben
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              Atlas bringt dich zurück zu deinem Tagesüberblick.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "change-requested") {
    return (
      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <MessageSquareText className="mt-0.5 h-5 w-5 text-blue-700" />

          <div>
            <p className="font-semibold text-blue-900">
              Änderung wurde angefordert
            </p>

            <p className="mt-1 text-sm text-blue-700">
              Atlas bereitet eine überarbeitete Angebotsversion vor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "requesting-change") {
    return (
      <div className="mt-8 rounded-xl border bg-white p-5">
        <label
          htmlFor="change-request"
          className="text-sm font-semibold text-neutral-900"
        >
          Was soll Atlas ändern?
        </label>

        <textarea
          id="change-request"
          value={changeRequest}
          onChange={(event) => setChangeRequest(event.target.value)}
          placeholder="Zum Beispiel: Position 3 auf RAL 9010 ändern und die Materialkosten neu berechnen."
          className="mt-3 min-h-32 w-full rounded-xl border bg-neutral-50 p-4 text-sm outline-none transition focus:border-neutral-400"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitChangeRequest}
            disabled={!changeRequest.trim()}
            className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Änderung senden
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setChangeRequest("");
            }}
            className="rounded-xl border bg-white px-6 py-3 font-medium transition hover:bg-neutral-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={approveOffer}
        className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700"
      >
        Angebot freigeben
      </button>

      <button
        type="button"
        onClick={() => setMode("requesting-change")}
        className="rounded-xl border bg-white px-6 py-3 font-medium transition hover:bg-neutral-50"
      >
        Änderungen anfordern
      </button>
    </div>
  );
}