import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  statusText?: string;
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  statusText,
}: FeatureCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-6 w-6 text-slate-900" />
        </div>

        <CardTitle>{title}</CardTitle>

        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>

      {statusText && (
        <CardContent>
          <p className="text-sm font-medium text-slate-600">
            {statusText}
          </p>
        </CardContent>
      )}
    </Card>
  );
}