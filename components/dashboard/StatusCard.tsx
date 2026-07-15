import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type StatusCardProps = {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
};

export function StatusCard({
  title,
  value,
  description,
  icon: Icon,
}: StatusCardProps) {
  return (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-3 text-4xl font-bold tracking-tight">
            {value}
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
          <Icon className="h-5 w-5 text-neutral-800" />
        </div>
      </CardContent>
    </Card>
  );
}