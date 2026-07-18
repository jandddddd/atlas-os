type TodayEmptyStateProps = {
  isVisible: boolean;
};

export function TodayEmptyState({ isVisible }: TodayEmptyStateProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <section
      aria-label="Abschlussbereich"
      className="rounded-[2rem] border border-neutral-200 bg-white px-8 py-10 text-center shadow-sm"
    >
      <p className="text-2xl font-semibold tracking-tight text-neutral-950">
        Für heute ist alles erledigt.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-500">
        Wenn neue Entscheidungen vorbereitet werden, erscheinen sie wieder in der
        Priorität und in der Übersicht.
      </p>
    </section>
  );
}
