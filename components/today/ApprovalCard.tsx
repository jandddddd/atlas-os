"use client";

export type ApprovalCardAction = {
  label: string;
  pendingLabel?: string;
  href?: string;
  onSelect?: () => void;
  isDisabled?: boolean;
  controls?: string;
  expanded?: boolean;
};

export type ApprovalCardContextItem = {
  label: string;
  value: string;
};

export type ApprovalCardProps = {
  decisionType: string;
  title: string;
  context: ApprovalCardContextItem[];
  summary: string;
  recommendation: string;
  rationale: string[];
  uncertainty?: {
    title: string;
    description: string;
    nextStep: string;
  };
  consequence: string;
  primaryAction: ApprovalCardAction;
  secondaryActions: ApprovalCardAction[];
  details?: {
    id: string;
    title: string;
    items: string[];
    isVisible: boolean;
  };
  notice?: {
    text: string;
  };
};

type ActionStyle = "primary" | "secondary";

function getActionClassName(style: ActionStyle, isUnavailable: boolean) {
  if (style === "primary") {
    return isUnavailable
      ? "inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-neutral-700 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
      : "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:w-auto";
  }

  return isUnavailable
    ? "inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground"
    : "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
}

function getVisibleActionLabel(action: ApprovalCardAction, style: ActionStyle) {
  const label = action.isDisabled && action.pendingLabel ? action.pendingLabel : action.label;
  const fallbackLabel = style === "primary" ? "Freigeben und senden" : "Aktion nicht verfügbar";

  return label.trim() || fallbackLabel;
}

function ApprovalCardActionControl({
  action,
  style,
}: {
  action: ApprovalCardAction;
  style: ActionStyle;
}) {
  const hasLink = Boolean(action.href);
  const hasHandler = Boolean(action.onSelect);
  const isUnavailable = !hasLink && !hasHandler;
  const className = getActionClassName(style, isUnavailable || action.isDisabled === true);
  const visibleLabel = getVisibleActionLabel(action, style);

  if (action.href && !action.isDisabled) {
    return (
      <a className={className} href={action.href}>
        {visibleLabel}
      </a>
    );
  }

  if (action.onSelect) {
    return (
      <button
        type="button"
        className={className}
        disabled={action.isDisabled}
        aria-label={visibleLabel}
        data-testid={style === "primary" ? "approval-primary-action" : undefined}
        aria-controls={action.controls}
        aria-expanded={action.expanded}
        onClick={action.onSelect}
      >
        {visibleLabel}
      </button>
    );
  }

  return (
    <span aria-disabled="true" className={className} role="text">
      {visibleLabel}
    </span>
  );
}

export function ApprovalCard({
  decisionType,
  title,
  context,
  summary,
  recommendation,
  rationale,
  uncertainty,
  consequence,
  primaryAction,
  secondaryActions,
  details,
  notice,
}: ApprovalCardProps) {
  return (
    <section aria-labelledby="priority-decision" className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          Priorität
        </p>
        <h2
          id="priority-decision"
          className="text-3xl font-semibold tracking-tight text-neutral-950"
        >
          Heute zuerst
        </h2>
      </div>

      <article className="rounded-[2rem] border border-border bg-card px-6 py-6 text-card-foreground shadow-sm sm:px-8 sm:py-7 lg:px-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
              {decisionType}
            </p>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                {title}
              </h3>
              <p className="max-w-2xl text-lg leading-8 text-neutral-600">
                {summary}
              </p>
            </div>
          </header>

          <dl className="grid gap-4 rounded-2xl bg-muted/60 px-5 py-4 sm:grid-cols-3">
            {context.map((item) => (
              <div key={`${item.label}-${item.value}`} className="space-y-1">
                <dt className="text-sm text-neutral-500">{item.label}</dt>
                <dd className="text-base font-medium text-neutral-900">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-7">
            <div className="space-y-5">
              <section aria-labelledby="atlas-recommendation" className="rounded-2xl border border-border px-5 py-4 space-y-2">
                <p
                  id="atlas-recommendation"
                  className="text-sm font-medium text-neutral-500"
                >
                  Empfehlung von Atlas
                </p>
                <p className="text-xl font-semibold leading-8 text-neutral-950">
                  {recommendation}
                </p>
              </section>

              <section aria-labelledby="atlas-rationale" className="space-y-3">
                <h4
                  id="atlas-rationale"
                  className="text-sm font-medium text-neutral-500"
                >
                  Begründung
                </h4>
                <ul className="space-y-2 text-base leading-7 text-neutral-600">
                  {rationale.map((reason) => (
                    <li key={reason} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300"
                      />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <aside className="space-y-5 rounded-2xl bg-muted/60 p-5">
              {uncertainty ? (
                <section aria-labelledby="atlas-uncertainty" className="space-y-3">
                  <h4
                    id="atlas-uncertainty"
                    className="text-sm font-medium text-neutral-500"
                  >
                    {uncertainty.title}
                  </h4>
                  <p className="text-base leading-7 text-neutral-700">
                    {uncertainty.description}
                  </p>
                  <p className="text-sm leading-6 text-neutral-500">
                    {uncertainty.nextStep}
                  </p>
                </section>
              ) : null}

              <section aria-labelledby="atlas-consequence" className="space-y-3">
                <h4
                  id="atlas-consequence"
                  className="text-sm font-medium text-neutral-500"
                >
                  Konsequenz
                </h4>
                <p className="text-base leading-7 text-neutral-700">{consequence}</p>
              </section>
            </aside>
          </div>

          {notice ? (
            <p className="rounded-3xl bg-neutral-50 px-5 py-4 text-sm leading-6 text-neutral-600">
              {notice.text}
            </p>
          ) : null}

          {details?.isVisible ? (
            <section
              id={details.id}
              aria-label={details.title}
              className="rounded-3xl border border-neutral-200 bg-white p-6"
            >
              <h4 className="text-sm font-medium text-neutral-500">{details.title}</h4>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
                {details.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="w-full sm:w-auto">
              <ApprovalCardActionControl action={primaryAction} style="primary" />
            </div>
            <div className="flex flex-wrap gap-1 sm:ml-1">
              {secondaryActions.map((action) => (
                <ApprovalCardActionControl
                  key={action.label}
                  action={action}
                  style="secondary"
                />
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
