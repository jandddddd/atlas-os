type TodayHeaderProps = {
  dateLabel: string;
  decisionCount: number;
};

export function TodayHeader({ dateLabel, decisionCount }: TodayHeaderProps) {
  const isComplete = decisionCount === 0;

  return (
    <header
      className={
        isComplete
          ? "border-b border-neutral-200 pb-8 sm:pb-10"
          : "border-b border-neutral-200 pb-12 sm:pb-16"
      }
    >
      <p className="text-sm font-medium text-neutral-500">{dateLabel}</p>

      <div className={isComplete ? "mt-5 max-w-3xl space-y-3" : "mt-6 max-w-3xl space-y-5"}>
        <h1
          className={
            isComplete
              ? "text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl"
              : "text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl"
          }
        >
          Guten Morgen.
        </h1>

        <p className="text-lg leading-8 text-neutral-600 sm:text-xl sm:leading-8">
          Atlas hat heute {decisionCount} Entscheidungen vorbereitet.
        </p>
      </div>
    </header>
  );
}
