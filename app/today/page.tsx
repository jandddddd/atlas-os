import {
  CircleCheck,
  Clock3,
  ShieldAlert,
} from "lucide-react";

import { StatusCard } from "@/components/dashboard/StatusCard";

import { TaskItem } from "@/components/dashboard/TaskItem";

const tasks = [
  {
    id: 1,
    title: "Angebot Müller prüfen",
    description: "Entwurf über 4.850 € wartet auf Freigabe",
    priority: "high" as const,
  },
  {
    id: 2,
    title: "Besichtigung Weber bestätigen",
    description: "Vorgeschlagener Termin: heute um 15:30 Uhr",
    priority: "medium" as const,
  },
  {
    id: 3,
    title: "Lieferantenangebot auswählen",
    description: "Drei Angebote wurden von Atlas verglichen",
    priority: "low" as const,
  },
];


type TodayPageProps = {
  searchParams: Promise<{
    offerApproved?: string;
    changeRequested?: string;
  }>;
};

export default async function TodayPage({
  searchParams,
}: TodayPageProps) {
  const params = await searchParams;
  const offerApproved = params.offerApproved === "true";
  const changeRequested = params.changeRequested === "true";
  const visibleTasks = offerApproved
  ? tasks.filter((task) => task.id !== 1)
  : tasks;
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl px-8 py-12">
        <h1 className="text-5xl font-bold tracking-tight">
          Guten Morgen, Jan 👋
        </h1>

        <p className="mt-4 text-xl text-neutral-600">
          Ich habe deinen Arbeitstag vorbereitet. Drei Entscheidungen
          warten noch auf dich.
        </p>
        
        {offerApproved && (
  <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
    <p className="font-semibold">
      Angebot Müller wurde freigegeben.
    </p>

    <p className="mt-1 text-sm text-emerald-700">
      Atlas bereitet jetzt den Versand an den Kunden vor.
    </p>
  </div>
)}

{changeRequested && (
  <div className="mt-8 rounded-xl border border-sky-300 bg-sky-100 px-5 py-4 text-sky-900">
    <p className="font-semibold">
      Änderung für Angebot Müller wurde angefordert.
    </p>

    <p className="mt-1 text-sm text-sky-700">
      Atlas erstellt jetzt eine überarbeitete Version des Angebots.
    </p>
  </div>
)}

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          <StatusCard
            title="Entscheidungen"
            value={offerApproved ? 2 : 3}
            description={
  offerApproved
    ? "Noch zwei Entscheidungen warten"
    : "Benötigen deine Freigabe"
}
            icon={ShieldAlert}
          />

          <StatusCard
            title="In Bearbeitung"
            value={8}
            description="Atlas arbeitet bereits daran"
            icon={Clock3}
          />

          <StatusCard
            title="Heute erledigt"
            value={5}
            description="Seit deinem letzten Besuch"
            icon={CircleCheck}
          />
        </section>

        <section className="mt-12">
  <div className="mb-5">
    <h2 className="text-2xl font-bold tracking-tight">
      Heute zuerst
    </h2>

    <p className="mt-1 text-neutral-500">
      Atlas hat die Vorarbeit erledigt. Diese Entscheidungen warten auf dich.
    </p>
  </div>

  <div className="space-y-3">
    {visibleTasks.map((task) => (
      <TaskItem
        key={task.id}
        title={task.title}
        description={task.description}
        priority={task.priority}
      />
    ))}
  </div>
</section>

      </div>
    </main>
  );
}