import {
  CircleCheck,
  Clock3,
  ShieldAlert,
} from "lucide-react";

import { StatusCard } from "@/components/dashboard/StatusCard";

export default function TodayPage() {
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

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          <StatusCard
            title="Entscheidungen"
            value={3}
            description="Benötigen deine Freigabe"
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
      </div>
    </main>
  );
}