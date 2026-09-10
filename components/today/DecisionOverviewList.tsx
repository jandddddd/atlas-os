import Link from "next/link";

type DecisionOverviewItem = {
  id: string;
  title: string;
  context: string;
  meta: string;
  /**
   * Pure navigation target for an exactly matched Offer Workspace entry.
   * The caller has already confirmed the workflowId match; this component
   * only renders the given href as a plain link, never as part of the
   * selection button, so opening it can never trigger onSelect.
   */
  offerHref?: string;
};

type DecisionOverviewListProps = {
  decisions: DecisionOverviewItem[];
  onSelect: (decisionId: string) => void;
  isDisabled?: boolean;
  /**
   * Marks one item as a pure navigation/focus target (e.g. from an Inbox
   * handoff), never a priority/selection state. The caller has already
   * confirmed the match; this component only renders the given id, without
   * any workflowId or other identity check of its own.
   */
  focusedDecisionId?: string;
};

export function DecisionOverviewList({
  decisions,
  onSelect,
  isDisabled = false,
  focusedDecisionId,
}: DecisionOverviewListProps) {
  return (
    <section aria-labelledby="additional-decisions" className="space-y-5">
      <div className="max-w-2xl space-y-2">
        <h2
          id="additional-decisions"
          className="text-2xl font-semibold tracking-tight text-neutral-950"
        >
          Weitere Entscheidungen
        </h2>
        <p className="text-base leading-7 text-neutral-600">
          Wähle eine vorbereitete Entscheidung, um sie als Nächstes zu prüfen.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {decisions.map((decision) => (
          <div
            key={decision.id}
            className={
              decision.id === focusedDecisionId
                ? "overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm ring-2 ring-emerald-400 transition hover:border-neutral-300 hover:shadow-md"
                : "overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow-md"
            }
          >
            <button
              type="button"
              data-handoff-focused={decision.id === focusedDecisionId ? "true" : undefined}
              className="w-full p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDisabled}
              onClick={() => onSelect(decision.id)}
            >
              <p className="text-sm font-medium text-neutral-500">{decision.meta}</p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-neutral-950">
                {decision.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {decision.context}
              </p>
            </button>
            {decision.offerHref ? (
              <div className="border-t border-neutral-200 px-6 py-4">
                <Link
                  href={decision.offerHref}
                  className="inline-flex text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
                >
                  Angebot öffnen
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
