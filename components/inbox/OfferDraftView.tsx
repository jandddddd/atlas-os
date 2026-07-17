import { Plus } from "lucide-react";

import { OfferPositionRow } from "./OfferPositionRow";
import type { OfferDraft, OfferPosition } from "./types";

type OfferDraftViewProps = {
  editableOffer: OfferDraft;
  isEditing: boolean;
  lastSavedAt: string | null;
  onChange: (offer: OfferDraft) => void;
  onStartEditing: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

export function OfferDraftView({
  editableOffer,
  isEditing,
  lastSavedAt,
  onChange,
  onStartEditing,
  onSave,
  onDiscard,
}: OfferDraftViewProps) {
  function updatePosition(id: number, changes: Partial<OfferPosition>) {
    onChange({
      ...editableOffer,
      positions: editableOffer.positions.map((position) =>
        position.id === id ? { ...position, ...changes } : position,
      ),
    });
  }

  function addPosition() {
    const nextId =
      editableOffer.positions.length === 0
        ? 1
        : Math.max(...editableOffer.positions.map((position) => position.id)) + 1;

    onChange({
      ...editableOffer,
      positions: [
        ...editableOffer.positions,
        {
          id: nextId,
          description: "Neue Leistung",
          quantity: 0,
          unit: "noch zu ermitteln",
          notes: "",
        },
      ],
    });
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            Entwurf
          </span>

          <div>
            {isEditing ? (
              <div className="flex flex-wrap gap-3">
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
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartEditing}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
              >
                Entwurf bearbeiten
              </button>
            )}

            {lastSavedAt && !isEditing && (
              <p className="mt-3 text-sm text-emerald-700">
                Änderungen gespeichert um {lastSavedAt} Uhr
              </p>
            )}
          </div>

          {isEditing ? (
            <div className="mt-4 space-y-3">
              <input
                value={editableOffer.title}
                onChange={(event) =>
                  onChange({ ...editableOffer, title: event.target.value })
                }
                className="w-full rounded-lg border px-3 py-2 text-2xl font-bold"
              />
              <textarea
                value={editableOffer.projectSummary}
                onChange={(event) =>
                  onChange({
                    ...editableOffer,
                    projectSummary: event.target.value,
                  })
                }
                className="min-h-24 w-full rounded-lg border px-3 py-2 text-neutral-700"
              />
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                {editableOffer.title}
              </h2>
              <p className="mt-2 text-neutral-600">
                {editableOffer.projectSummary}
              </p>
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-sm text-neutral-500">Kunde</p>
          <p className="mt-1 font-medium">{editableOffer.customerName}</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border">
        <div
          className="grid gap-4 bg-neutral-50 px-5 py-3 text-sm font-medium text-neutral-500"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 110px 150px" }}
        >
          <span>Leistung</span>
          <span>Menge</span>
          <span>Einheit</span>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={addPosition}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
          >
            <Plus className="h-4 w-4" />
            Position hinzufügen
          </button>
        )}

        {editableOffer.positions.map((position) => (
          <OfferPositionRow
            key={position.id}
            isEditing={isEditing}
            position={position}
            onChange={(changes) => updatePosition(position.id, changes)}
            onDelete={() =>
              onChange({
                ...editableOffer,
                positions: editableOffer.positions.filter(
                  (item) => item.id !== position.id,
                ),
              })
            }
          />
        ))}
      </div>

      {editableOffer.assumptions.length > 0 && (
        <div className="mt-6 rounded-xl bg-neutral-50 p-5">
          <p className="font-semibold">Annahmen</p>
          <ul className="mt-3 space-y-2 text-sm text-neutral-700">
            {editableOffer.assumptions.map((assumption) => (
              <li key={assumption}>• {assumption}</li>
            ))}
          </ul>
        </div>
      )}

      {editableOffer.missingInformation.length > 0 && (
        <div className="mt-4 rounded-xl bg-sky-100 p-5">
          <p className="font-semibold text-sky-900">Vor Freigabe noch klären</p>
          <ul className="mt-3 space-y-2 text-sm text-sky-800">
            {editableOffer.missingInformation.map((information) => (
              <li key={information}>• {information}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-xl border p-5">
        <p className="text-sm text-neutral-500">Empfohlener nächster Schritt</p>
        <p className="mt-1 font-medium">{editableOffer.recommendedNextStep}</p>
      </div>

      <p className="mt-5 text-sm text-neutral-500">
        Dieser Entwurf enthält bewusst noch keine Preise. Preise werden später
        aus dem betriebseigenen Leistungskatalog ergänzt.
      </p>
    </section>
  );
}
