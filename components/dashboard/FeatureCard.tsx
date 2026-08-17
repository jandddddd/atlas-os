import type { LucideIcon } from "lucide-react";
import Link from "next/link";

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
  href?: string;
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  statusText,
  href,
}: FeatureCardProps) {
  const card = (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
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

  return href ? (
    <Link href={href} className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900">
      {card}
    </Link>
  ) : card;
}
