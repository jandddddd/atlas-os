type TodayEmptyStateProps = {
  isVisible: boolean;
};

export function TodayEmptyState({ isVisible }: TodayEmptyStateProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <section
      aria-labelledby="today-complete-title"
      className="rounded-[2rem] border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-neutral-950 text-lg font-semibold text-white"
        >
          ✓
        </span>
        <h2
          id="today-complete-title"
          className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl"
        >
          Für heute ist alles erledigt.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
          Wenn neue Entscheidungen vorbereitet werden, erscheinen sie wieder in der
          Priorität und in der Übersicht.
        </p>
      </div>
    </section>
  );
}
