type TodayHeaderProps = {
  dateLabel: string;
  decisionCount: number;
};

export function TodayHeader({ dateLabel, decisionCount }: TodayHeaderProps) {
  return (
    <header className="border-b border-neutral-200 pb-12 sm:pb-16">
      <p className="text-sm font-medium text-neutral-500">{dateLabel}</p>

      <div className="mt-6 max-w-3xl space-y-5">
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
          Guten Morgen.
        </h1>

        <p className="text-xl leading-8 text-neutral-600 sm:text-2xl sm:leading-9">
          Atlas hat heute {decisionCount} Entscheidungen vorbereitet.
        </p>
      </div>
    </header>
  );
}
