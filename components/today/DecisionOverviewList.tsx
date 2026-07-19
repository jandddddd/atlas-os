type DecisionOverviewItem = {
  id: string;
  title: string;
  context: string;
  meta: string;
};

type DecisionOverviewListProps = {
  decisions: DecisionOverviewItem[];
  onSelect: (decisionId: string) => void;
  isDisabled?: boolean;
};

export function DecisionOverviewList({
  decisions,
  onSelect,
  isDisabled = false,
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
          <button
            key={decision.id}
            type="button"
            className="w-full rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
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
        ))}
      </div>
    </section>
  );
}
