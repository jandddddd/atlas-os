export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-8">
      <div className="max-w-3xl text-center">

        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          Atlas OS
        </span>

        <h1 className="mt-8 text-7xl font-black tracking-tight text-slate-900">
          Atlas
        </h1>

        <h2 className="mt-6 text-3xl font-semibold text-slate-700">
          Das Betriebssystem für Handwerksbetriebe
        </h2>

        <p className="mt-8 text-xl leading-9 text-slate-500">
          Atlas übernimmt Büroarbeit, organisiert deinen Betrieb und gibt
          deinem Team den Feierabend zurück.
        </p>

        <div className="mt-14 flex justify-center gap-4">

          <button className="rounded-xl bg-slate-900 px-8 py-4 text-white transition hover:bg-slate-700">
            Atlas starten
          </button>

          <button className="rounded-xl border border-slate-300 bg-white px-8 py-4 hover:bg-slate-100">
            Demo ansehen
          </button>

        </div>

      </div>
    </main>
  );
}