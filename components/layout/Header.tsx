export function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-white px-8 py-5">
      <h1 className="text-2xl font-bold tracking-tight">
        ATLAS
      </h1>

      <nav className="flex items-center gap-8 text-sm font-medium text-neutral-600">
        <a href="#">Funktionen</a>
        <a href="#">Preise</a>
        <a href="#">Kontakt</a>
      </nav>

      <button className="rounded-xl bg-slate-900 px-5 py-3 text-white transition hover:bg-slate-700">
        Demo anfragen
      </button>
    </header>
  );
}