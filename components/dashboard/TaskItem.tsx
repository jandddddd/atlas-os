import { ChevronRight } from "lucide-react";

import Link from "next/link";

type TaskItemProps = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

export function TaskItem({
  title,
  description,
  priority,
}: TaskItemProps) {
  const priorityStyles = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  };

  return (
    <Link
     href="/today/tasks/offer-mueller"
     className="flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left transition hover:bg-neutral-50"
    >
      <span
        className={`h-3 w-3 shrink-0 rounded-full ${priorityStyles[priority]}`}
      />

      <div className="min-w-0 flex-1">
        <p className="font-medium text-neutral-900">
          {title}
        </p>

        <p className="mt-1 text-sm text-neutral-500">
          {description}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
    </Link>
  );
}