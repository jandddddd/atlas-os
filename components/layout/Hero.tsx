export function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-8 py-28 text-center">
      <span className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium">
        KI-Betriebssystem für Handwerksbetriebe
      </span>

      <h1 className="max-w-4xl text-6xl font-bold leading-tight tracking-tight">
        Atlas gibt
        <br />
        Handwerksbetrieben
        <br />
        den Feierabend zurück.
      </h1>

      <p className="mt-8 max-w-2xl text-xl text-neutral-600">
        Angebote, Dokumente, Lieferanten, Termine und KI –
        alles an einem Ort.
      </p>

      <div className="mt-12 flex gap-4">
        <button className="rounded-xl bg-slate-900 px-7 py-4 text-white">
          Demo anfragen
        </button>

        <button className="rounded-xl border px-7 py-4">
          Mehr erfahren
        </button>
      </div>
    </section>
  );
}