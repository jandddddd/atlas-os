import { Trash2 } from "lucide-react";

import type { OfferPosition } from "./types";

type OfferPositionRowProps = {
  isEditing: boolean;
  position: OfferPosition;
  onChange: (changes: Partial<OfferPosition>) => void;
  onDelete: () => void;
};

export function OfferPositionRow({
  isEditing,
  position,
  onChange,
  onDelete,
}: OfferPositionRowProps) {
  return (
    <div
      className="grid gap-4 border-t px-5 py-4"
      style={{
        gridTemplateColumns: isEditing
          ? "minmax(0, 1fr) 110px 150px 44px"
          : "minmax(0, 1fr) 110px 150px",
      }}
    >
      <div>
        {isEditing ? (
          <input
            value={position.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className="w-full rounded-lg border px-3 py-2 font-medium"
          />
        ) : (
          <p className="font-medium">{position.description}</p>
        )}

        {position.notes && (
          <p className="mt-1 text-sm text-neutral-500">{position.notes}</p>
        )}
      </div>

      <span className="text-neutral-700">
        {isEditing ? (
          <input
            type="number"
            min="0"
            value={position.quantity}
            onChange={(event) => onChange({ quantity: Number(event.target.value) })}
            className="w-full rounded-lg border px-3 py-2"
          />
        ) : position.quantity === 0 ? (
          "—"
        ) : (
          position.quantity
        )}
      </span>

      <span className="text-neutral-700">
        {isEditing ? (
          <input
            value={position.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
            className="w-full rounded-lg border px-3 py-2"
          />
        ) : (
          position.unit
        )}
      </span>

      {isEditing && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
          aria-label={`${position.description} löschen`}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
