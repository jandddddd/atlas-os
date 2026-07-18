type PriorityApprovalPlaceholderProps = {
  title: string;
  context: string;
  note: string;
};

export function PriorityApprovalPlaceholder({
  title,
  context,
  note,
}: PriorityApprovalPlaceholderProps) {
  return (
    <section aria-labelledby="priority-decision" className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          Priorität
        </p>
        <h2
          id="priority-decision"
          className="text-3xl font-semibold tracking-tight text-neutral-950"
        >
          Heute zuerst
        </h2>
      </div>

      <div className="min-h-[24rem] rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
        <div className="flex h-full min-h-[18rem] flex-col justify-between gap-12">
          <div className="max-w-2xl space-y-5">
            <p className="text-sm font-medium text-neutral-500">Platzhalter für Approval Card</p>
            <h3 className="text-4xl font-semibold tracking-tight text-neutral-950">
              {title}
            </h3>
            <p className="text-lg leading-8 text-neutral-600">{context}</p>
          </div>

          <p className="max-w-xl border-t border-neutral-200 pt-6 text-sm leading-6 text-neutral-500">
            {note}
          </p>
        </div>
      </div>
    </section>
  );
}
