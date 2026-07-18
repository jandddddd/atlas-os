type CompletionStatus = "offer-approved" | "change-requested";

type TodayCompletionNoticeProps = {
  status: CompletionStatus | null;
};

const completionMessages: Record<
  CompletionStatus,
  {
    title: string;
    description: string;
  }
> = {
  "offer-approved": {
    title: "Angebot Müller wurde freigegeben.",
    description: "Atlas bereitet jetzt den Versand an den Kunden vor.",
  },
  "change-requested": {
    title: "Änderung für Angebot Müller wurde angefordert.",
    description: "Atlas erstellt jetzt eine überarbeitete Version des Angebots.",
  },
};

export function TodayCompletionNotice({ status }: TodayCompletionNoticeProps) {
  if (!status) {
    return null;
  }

  const message = completionMessages[status];

  return (
    <section
      aria-label="Abschlusszustand"
      className="rounded-3xl border border-neutral-200 bg-white px-6 py-5 shadow-sm sm:px-8"
    >
      <p className="font-semibold text-neutral-950">{message.title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {message.description}
      </p>
    </section>
  );
}
