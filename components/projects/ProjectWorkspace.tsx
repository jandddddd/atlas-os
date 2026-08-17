"use client";

import Link from "next/link";
import { ClipboardList, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import {
  loadProjectWorkspace,
  type ProjectWorkspaceEntry,
} from "@/lib/projects/project-storage";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ProjectWorkspace() {
  const [projects, setProjects] = useState<ProjectWorkspaceEntry[] | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setProjects(loadProjectWorkspace()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (projects === null) {
    return <p role="status" className="mt-10 text-sm text-neutral-500">Projekte werden geladen …</p>;
  }

  if (projects.length === 0) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed bg-white p-8 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-neutral-400" />
        <h2 className="mt-4 text-xl font-semibold">Noch keine Projektentwürfe</h2>
        <p className="mx-auto mt-2 max-w-xl text-neutral-600">
          Öffne ein geprüftes Angebot und bereite daraus ausdrücklich einen
          Projektentwurf vor. Das erfasst noch keine Angebotsannahme und keinen Auftrag.
        </p>
        <Link href="/offers" className="mt-6 inline-flex rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700">
          Zu den Angeboten
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="project-list-heading" className="mt-10">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">
        {projects.length} {projects.length === 1 ? "Entwurf" : "Entwürfe"}
      </p>
      <h2 id="project-list-heading" className="mt-1 text-2xl font-semibold">Projektvorbereitung</h2>
      <div className="mt-5 grid gap-4">
        {projects.map((project) => (
          <article key={project.id} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <ClipboardList className="h-5 w-5 text-neutral-700" />
                </span>
                <div className="min-w-0">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">Vorbereitung</span>
                  <h3 className="mt-3 text-xl font-semibold">{project.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{project.customerName}</p>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{project.summary}</p>
                  <p className="mt-3 text-sm font-medium text-neutral-700">
                    {project.openPoints.length === 0
                      ? "Keine offenen Angaben aus dem Angebot übernommen."
                      : `${project.openPoints.length} ${project.openPoints.length === 1 ? "offene Angabe" : "offene Angaben"} aus dem Angebot`}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-neutral-500">Vorbereitet {dateFormatter.format(new Date(project.createdAt))}</p>
                <Link href={`/offers/${encodeURIComponent(project.sourceOfferWorkflowId)}`} className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-neutral-50">
                  <FileText className="h-4 w-4" />
                  Ursprungsangebot
                </Link>
              </div>
            </div>
            <p className="mt-5 border-t pt-4 text-xs leading-5 text-neutral-500">
              Dieser Projektentwurf dokumentiert nur die Vorbereitung. Eine Angebotsannahme oder Beauftragung ist nicht erfasst.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
