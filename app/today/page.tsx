import { TodayApprovalCenter } from "@/components/today/TodayApprovalCenter";
import { fixtureTodayDecisionRepository } from "@/lib/today/fixture-decision-repository";
import { getTodayDecisionStateFromCookie } from "@/lib/today/today-decision-cookie";
import { applyTodayDecisionState } from "@/lib/today/today-decision-state";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type TodayPageProps = {
  searchParams: Promise<{
    offerApproved?: string;
    changeRequested?: string;
  }>;
};

function getCompletionStatus({
  offerApproved,
  changeRequested,
}: Awaited<TodayPageProps["searchParams"]>) {
  if (offerApproved === "true") {
    return "offer-approved" as const;
  }

  if (changeRequested === "true") {
    return "change-requested" as const;
  }

  return null;
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const [params, decisions, persistedState] = await Promise.all([
    searchParams,
    fixtureTodayDecisionRepository.getTodayDecisions(),
    getTodayDecisionStateFromCookie(),
  ]);
  const completionStatus = getCompletionStatus(params);
  const todayLabel = dateFormatter.format(new Date());

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-10 sm:gap-16 sm:px-8 sm:py-14 lg:py-18">
        <TodayApprovalCenter
          dateLabel={todayLabel}
          initialCompletionStatus={completionStatus}
          decisions={applyTodayDecisionState(decisions, persistedState)}
        />
      </div>
    </main>
  );
}
