"use client";

import { Button } from "@/components/ui/Button";

type TodayErrorProps = {
  reset: () => void;
};

export default function TodayError({ reset }: TodayErrorProps) {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 sm:px-8 sm:py-14">
        <section
          aria-labelledby="today-error-title"
          className="w-full max-w-xl rounded-[2rem] border border-neutral-200 bg-white px-7 py-8 text-neutral-700 shadow-sm sm:px-10 sm:py-10"
        >
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Heute
          </p>
          <h1 id="today-error-title" className="mt-3 text-2xl font-medium tracking-tight text-neutral-950 sm:text-3xl">
            Die heutigen Entscheidungen konnten nicht geladen werden.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7">
            Bitte versuche es noch einmal. Wenn das Problem weiterhin besteht, prüfe die Seite später erneut.
          </p>
          <Button className="mt-7" size="lg" type="button" onClick={reset}>
            Erneut versuchen
          </Button>
        </section>
      </div>
    </main>
  );
}
