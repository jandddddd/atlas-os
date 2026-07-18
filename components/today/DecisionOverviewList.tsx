type DecisionOverviewItem = {
  id: string;
  title: string;
  context: string;
  meta: string;
};

type DecisionOverviewListProps = {
  decisions: DecisionOverviewItem[];
};

export function DecisionOverviewList({ decisions }: DecisionOverviewListProps) {
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
          Nur Übersicht. Atlas zeigt hier später weitere vorbereitete Entscheidungen,
          ohne den Fokus vom wichtigsten Punkt zu nehmen.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {decisions.map((decision) => (
          <article
            key={decision.id}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-neutral-500">{decision.meta}</p>
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-neutral-950">
              {decision.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {decision.context}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
