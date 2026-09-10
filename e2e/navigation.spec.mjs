import { expect, test } from "@playwright/test";

const todayDecisionCookieName = "atlas-today-decisions";
const offerTitle = "Angebot für Familie Müller freigeben und senden";
const offerOverviewTitle = "Angebotsentwurf Müller prüfen";
const visitTitle = "Besichtigung Weber als nächsten Schritt einplanen";
const visitOverviewTitle = "Besichtigung Weber einordnen";
const measurementTitle = "Fehlendes Maß vor der nächsten Einschätzung kennzeichnen";
const measurementOverviewTitle = "Fehlendes Maß kennzeichnen";
const inboxAnalysisFixture = {
  customer: {
    name: "Unbekannt",
  },
  project: {
    trade: "Malerarbeiten",
    service: "Wohnzimmer, Esszimmer und Flur streichen",
    estimatedArea: 75,
  },
  workflow: {
    priority: "normal",
    confidence: 0.82,
    nextAction: "Angebotsentwurf vorbereiten",
  },
  nextSteps: ["Besichtigung oder Bildmaterial anfordern"],
  missingInformation: ["Bilder", "genaue Raummaße"],
  recommendedTask: {
    type: "offer",
    title: "Angebotsentwurf Familie Schneider vorbereiten",
  },
};
const inboxOfferFixture = {
  customerName: "Unbekannt",
  title: "Angebotsentwurf Familie Schneider",
  projectSummary: "Streichen von Wohnzimmer, Esszimmer und Flur auf Basis der Kundenanfrage.",
  positions: [
    {
      id: 1,
      description: "Malerarbeiten in den angefragten Räumen",
      quantity: 0,
      unit: "noch zu ermitteln",
      notes: "Exakte Mengen und Untergründe müssen vor Ort oder anhand belastbarer Bilder geprüft werden.",
    },
  ],
  assumptions: ["Die genannte Fläche beschreibt die Raumfläche, nicht automatisch Wand- oder Deckenflächen."],
  missingInformation: ["Bilder", "genaue Raummaße"],
  recommendedNextStep: "Besichtigung oder Bild- und Maßmaterial anfordern.",
  status: "draft",
};

async function resetTodayState(context) {
  await context.clearCookies();
}

async function fillInboxInquiry(page, {
  customer = "Familie Berger",
  location = "Heidelberg",
  message = "Bitte unser Wohnzimmer streichen. Bilder reichen wir nach.",
} = {}) {
  await page.getByLabel("Kunde oder Kontakt").fill(customer);
  if (location) {
    await page.getByLabel("Ort (optional)").fill(location);
  }
  await page.getByLabel("Kundenanfrage").fill(message);
}

async function prioritizeDecision(page, overviewTitle, expectedTitle) {
  await page.getByRole("button", { name: overviewTitle }).click();
  await expect(page.getByRole("heading", { name: expectedTitle })).toBeVisible();
}

async function prioritizeOffer(page) {
  await prioritizeDecision(page, offerOverviewTitle, offerTitle);
}

function currentPriorityDecisionHeading(page) {
  return page.locator('section[aria-labelledby="priority-decision"] article h3');
}

async function expectNextOpenDecision(page) {
  const heading = currentPriorityDecisionHeading(page);

  await expect(heading).toBeVisible();
  await expect(heading).not.toHaveText(offerTitle);

  return heading.innerText();
}

function manualPriorityExplanation(page) {
  return page
    .locator('section[aria-labelledby="atlas-rationale"]')
    .getByText("Diese Entscheidung wurde manuell für Heute zuerst priorisiert.", { exact: true });
}

test.beforeEach(async ({ context, page }) => {
  await resetTodayState(context);
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: inboxAnalysisFixture,
      }),
    });
  });

  await page.route("**/api/generate-offer", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        offer: inboxOfferFixture,
      }),
    });
  });
});

test("Startseite ist erreichbar", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("header").getByRole("heading", { name: "ATLAS" })).toBeVisible();
  await expect(page.getByText("Atlas erstellt Angebotsentwürfe")).toBeVisible();
});

test("Today-Seite ist erreichbar", async ({ page }) => {
  await page.goto("/today");

  await expect(page).toHaveURL("/today");
  await expect(page.getByRole("heading", { name: "Guten Morgen." })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heute zuerst" })).toBeVisible();
  await expect(page.getByRole("heading", { name: visitTitle })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: offerOverviewTitle })).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Prüfgrundlage aus der Inbox" })).toHaveCount(0);
});

test("Inbox-Analyse wird als vorbereitete Entscheidung auf Today geladen", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();

  await expect(
    page.getByRole("heading", { name: "Analyse abgeschlossen" }),
  ).toBeVisible();

  await page.goto("/today");

  await expect(page.getByText("Atlas hat heute 6 Entscheidungen vorbereitet.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Angebotsentwurf Familie Schneider vorbereiten" }),
  ).toBeVisible();
});

test("Inbox und Today bilden einen beidseitigen Prüfpfad für die vorbereitete Entscheidung", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();
  const reviewContext = page.getByRole("region", { name: "Prüfgrundlage aus der Inbox" });
  await expect(reviewContext).toContainText("Ursprung: Inbox · ungeprüfte KI-Analyse");
  await expect(reviewContext).toContainText(
    "KI-Zusammenfassung der Anfrage (ungeprüft)",
  );
  await expect(reviewContext).toContainText(
    "Unbekannt: Wohnzimmer, Esszimmer und Flur streichen",
  );
  await expect(reviewContext).toContainText(
    "Genannte Flächenangabe laut Analyse: 75 m². Sie ist keine automatisch abgeleitete Wand- oder Deckenfläche.",
  );
  await expect(reviewContext).toContainText("Angebotsentwurf vorbereiten");
  await expect(reviewContext).toContainText(
    "Dieser Schritt ist vorbereitet, aber noch nicht freigegeben oder final.",
  );
  await expect(page.getByText("Bilder, genaue Raummaße")).toBeVisible();
  await expect(page.getByRole("button", { name: "Als geprüft vormerken" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "Prüfgrundlage aus der Inbox" })).toContainText(
    "Unbekannt: Wohnzimmer, Esszimmer und Flur streichen",
  );

  await page.getByRole("link", { name: "Ändern" }).click();
  await expect(page).toHaveURL("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt.",
  );
  await expect(page.getByRole("link", { name: "In Heute weiterprüfen" })).toHaveCount(0);
});

test("Inbox → Today Handoff fokussiert die dynamische Inbox-Decision, ohne sie zu priorisieren", async ({
  page,
  context,
}) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const analysis = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
  );

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(`/today?focusWorkflowId=${analysis.workflowId}`);

  // The static Weber fixture (high priority) still outranks the fresh,
  // normal-priority Schneider decision by default, so the handoff must
  // focus it inside "Weitere Entscheidungen" rather than promoting it to
  // "Heute zuerst".
  await expect(
    page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" }),
  ).toBeVisible();

  const focusedItem = page.locator('[data-handoff-focused="true"]');
  await expect(focusedItem).toBeVisible();
  await expect(focusedItem).toContainText("Angebotsentwurf Familie Schneider vorbereiten");
  // Accessible handoff: keyboard and screen reader users must land on the
  // same target as the visual highlight, not just see it scrolled into view.
  await expect(focusedItem).toBeFocused();

  // No prioritization mutation: the decision-state cookie must not record a
  // "prioritize" action for the inbox decision from this pure focus hint.
  const decisionCookie = (await context.cookies(page.url())).find(
    (cookie) => cookie.name === todayDecisionCookieName,
  );
  if (decisionCookie) {
    const persistedState = JSON.parse(decodeURIComponent(decisionCookie.value));
    expect(persistedState.decisions).not.toContainEqual({
      decisionId: "inbox-recommended-task",
      action: "prioritize",
    });
  }
});

test("Inbox → Today Handoff fokussiert die dynamische Inbox-Decision, wenn sie bereits Heute zuerst ist", async ({
  page,
}) => {
  // A small/mobile viewport, deliberately shorter than the full primary
  // ApprovalCard: this is exactly the case where centering the card instead
  // of aligning it to the start would push its own heading out of view.
  await page.setViewportSize({ width: 390, height: 600 });

  const highPriorityAnalysisFixture = {
    ...inboxAnalysisFixture,
    workflow: { ...inboxAnalysisFixture.workflow, priority: "high" },
  };
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: highPriorityAnalysisFixture }),
    });
  });

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const analysis = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
  );

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(`/today?focusWorkflowId=${analysis.workflowId}`);

  const handoffHeading = page.getByRole("heading", {
    name: "Angebotsentwurf Familie Schneider vorbereiten",
  });
  await expect(handoffHeading).toBeVisible();

  const focusedItem = page.locator('[data-handoff-focused="true"]');
  await expect(focusedItem).toBeVisible();
  await expect(focusedItem).toBeFocused();

  // The card's own heading must stay within the visible viewport instead of
  // landing above it, which block: "center" could do on a card taller than
  // the viewport.
  await expect(async () => {
    const headingBox = await handoffHeading.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(headingBox.y).toBeGreaterThanOrEqual(0);
  }).toPass();
});

test("Ein fremder oder ungültiger focusWorkflowId fokussiert keine Decision", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today/);

  await page.goto("/today?focusWorkflowId=unrelated-or-invalid-workflow-id");

  await expect(page.locator('[data-handoff-focused="true"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" }),
  ).toBeVisible();
  // No accessible handoff focus was set anywhere on the page either.
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("Ein focusWorkflowId fokussiert eine legacy Inbox-Decision ohne workflowId nicht", async ({
  page,
  context,
}) => {
  const legacyDecisionTitle = "Altbestand ohne workflowId pruefen";
  const legacyAnalysis = {
    customer: { name: "Familie Alt" },
    project: {
      trade: "Malerarbeiten",
      service: "Flur streichen",
      estimatedArea: null,
    },
    workflow: {
      priority: "high",
      confidence: 0.7,
      nextAction: "Entwurf pruefen",
    },
    nextSteps: [],
    missingInformation: [],
    recommendedTask: {
      type: "offer",
      title: legacyDecisionTitle,
    },
  };
  await context.addCookies([
    {
      name: "atlas-inbox-today-decision",
      value: JSON.stringify(legacyAnalysis),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/today?focusWorkflowId=some-workflow-id");
  await expect(page.getByRole("heading", { name: legacyDecisionTitle })).toBeVisible();
  await expect(page.locator('[data-handoff-focused="true"]')).toHaveCount(0);
  // No accessible handoff focus was set anywhere on the page either.
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("Ändern führt bei einer inzwischen fremden live Inbox-Analyse nicht mehr in den falschen Vorgang", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();

  // Simulate the live Inbox slot moving on to an unrelated workflow after
  // this Today decision was created, without touching the Today decision
  // itself (its cookie-backed snapshot still refers to the original case).
  await page.evaluate(() => {
    const currentAnalysis = JSON.parse(
      window.localStorage.getItem("atlas-inquiry-analysis"),
    );
    currentAnalysis.workflowId = "unrelated-workflow-b";
    window.localStorage.setItem(
      "atlas-inquiry-analysis",
      JSON.stringify(currentAnalysis),
    );
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();

  const changeAction = page.getByRole("link", { name: "Ändern" });
  await expect(changeAction).toHaveCount(0);
  await page.getByRole("button", { name: "Ändern" }).click();
  await expect(page.getByText("Bearbeitungsansicht folgt.")).toBeVisible();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);

  const analysisAfter = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
  );
  expect(analysisAfter.workflowId).toBe("unrelated-workflow-b");
});

test("Ändern erkennt einen echten Cross-Tab-Wechsel des live Inbox-Workflows ohne Reload", async ({
  page,
  context,
}) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ändern" })).toBeVisible();

  // A genuine second tab in the same browser context shares the same
  // localStorage origin. Writing there fires a native "storage" event in
  // the first tab (the same-tab case never fires "storage" at all, which is
  // why this needs a real second page instead of page.evaluate on `page`).
  const secondTab = await context.newPage();
  await secondTab.goto("/inbox");
  await secondTab.evaluate(() => {
    const currentAnalysis = JSON.parse(
      window.localStorage.getItem("atlas-inquiry-analysis"),
    );
    currentAnalysis.workflowId = "unrelated-workflow-b";
    window.localStorage.setItem(
      "atlas-inquiry-analysis",
      JSON.stringify(currentAnalysis),
    );
  });
  await secondTab.close();

  // No reload: Today must notice the cross-tab change while staying mounted.
  const changeAction = page.getByRole("link", { name: "Ändern" });
  await expect(changeAction).toHaveCount(0);
  await page.getByRole("button", { name: "Ändern" }).click();
  await expect(page.getByText("Bearbeitungsansicht folgt.")).toBeVisible();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);

  const analysisAfter = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
  );
  expect(analysisAfter.workflowId).toBe("unrelated-workflow-b");
});

test("Ändern öffnet bei einer legacy Inbox-Today-Entscheidung ohne workflowId nicht ungeprüft /inbox", async ({
  page,
  context,
}) => {
  const legacyDecisionTitle = "Altbestand ohne workflowId pruefen";

  // A dynamic Inbox Today decision from before workflowId existed on the
  // analysis contract: isAnalysisResult() explicitly allows workflowId to be
  // omitted, and createInboxTodayDecision() still renders it, exactly as
  // covered by the existing unit test for legacy offer analyses. Kept
  // free of German diacritics: this cookie is injected as a raw value via
  // context.addCookies() to simulate a decision from before workflowId
  // existed, bypassing the app's own cookie read/write round-trip that
  // normally encodes/decodes matching pairs consistently.
  const legacyAnalysis = {
    customer: { name: "Familie Alt" },
    project: {
      trade: "Malerarbeiten",
      service: "Flur streichen",
      estimatedArea: null,
    },
    workflow: {
      priority: "high",
      confidence: 0.7,
      nextAction: "Entwurf pruefen",
    },
    nextSteps: [],
    missingInformation: [],
    recommendedTask: {
      type: "offer",
      title: legacyDecisionTitle,
    },
  };
  await context.addCookies([
    {
      name: "atlas-inbox-today-decision",
      value: JSON.stringify(legacyAnalysis),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // A live, unrelated current Inbox workflow exists, but the legacy decision
  // has nothing to safely match it against.
  await page.addInitScript((analysis) => {
    window.localStorage.setItem("atlas-inquiry-analysis", JSON.stringify(analysis));
  }, { ...inboxAnalysisFixture, workflowId: "current-workflow-c" });

  await page.goto("/today");
  // High priority/confidence already makes this the primary "Heute zuerst"
  // decision, so no selection click is needed before it is visible.
  await expect(page.getByRole("heading", { name: legacyDecisionTitle })).toBeVisible();

  await expect(page.getByRole("link", { name: "Ändern" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ändern" }).click();
  await expect(page.getByText("Bearbeitungsansicht folgt.")).toBeVisible();
  await expect(page).toHaveURL("/today");

  const liveAnalysis = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
  );
  expect(liveAnalysis.workflowId).toBe("current-workflow-c");
});

test("Today zeigt einen Hinweis, wenn für die Anfrage bereits eine Rückfrage vorbereitet wurde", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByRole("region", { name: "Rückfrageentwurf" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();

  await expect(
    page.getByText("Für diese Anfrage ist bereits eine Rückfrage vorbereitet."),
  ).toBeVisible();
});

test("der Rückfrage-Hinweis verschwindet sofort, wenn nach dem Verschieben eine andere Decision Priorität wird", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByRole("region", { name: "Rückfrageentwurf" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();
  await expect(
    page.getByText("Für diese Anfrage ist bereits eine Rückfrage vorbereitet."),
  ).toBeVisible();

  // Freeze future animation frames so the note can no longer rely on the
  // deferred localStorage read (scheduled via requestAnimationFrame) ever
  // completing again; it must already be correct synchronously once the
  // priority decision itself switches to an unrelated one.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.getByRole("button", { name: "Später entscheiden" }).click();
  const priorityHeading = currentPriorityDecisionHeading(page);
  await expect(priorityHeading).toBeVisible();
  await expect(priorityHeading).not.toHaveText(inboxDecisionTitle);
  await expect(
    page.getByText("Für diese Anfrage ist bereits eine Rückfrage vorbereitet."),
  ).toHaveCount(0);
});

test("Today zeigt keinen Rückfrage-Hinweis ohne vorbereiteten Rückfrageentwurf", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();

  await expect(
    page.getByText("Für diese Anfrage ist bereits eine Rückfrage vorbereitet."),
  ).toHaveCount(0);
});

test("Weitere Entscheidungen zeigt 'Rückfrage vorbereitet' für die dynamische Inbox-Decision, wenn ein passender Draft existiert", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByRole("region", { name: "Rückfrageentwurf" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);

  // Deliberately not promoted to priority: this decision must show its
  // status directly from the collapsed "Weitere Entscheidungen" row.
  const overviewItem = page.getByRole("button", { name: inboxDecisionTitle });
  await expect(overviewItem).toBeVisible();
  await expect(overviewItem).toContainText("Rückfrage vorbereitet");
});

test("Weitere Entscheidungen zeigt keinen Rückfrage-Status ohne vorbereiteten Draft", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);

  const overviewItem = page.getByRole("button", { name: inboxDecisionTitle });
  await expect(overviewItem).toBeVisible();
  await expect(overviewItem).not.toContainText("Rückfrage vorbereitet");
  await expect(overviewItem).toContainText("Angebot · Prüfung offen");
});

test("Weitere Entscheidungen behält 'Rückfrage vorbereitet' bei einem fremden live Inbox-Workflow", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByRole("region", { name: "Rückfrageentwurf" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);

  // The live Inbox slot moves on to an unrelated workflow. The overview
  // status is scoped to the decision's own workflowId and must stay correct
  // regardless of liveInboxWorkflowId, unlike the "Ändern" edit handoff.
  await page.evaluate(() => {
    const currentAnalysis = JSON.parse(
      window.localStorage.getItem("atlas-inquiry-analysis"),
    );
    currentAnalysis.workflowId = "unrelated-workflow-b";
    window.localStorage.setItem(
      "atlas-inquiry-analysis",
      JSON.stringify(currentAnalysis),
    );
  });
  await page.reload();

  const overviewItem = page.getByRole("button", { name: inboxDecisionTitle });
  await expect(overviewItem).toBeVisible();
  await expect(overviewItem).toContainText("Rückfrage vorbereitet");
});

test("Weitere Entscheidungen erkennt einen Cross-Tab-Draft ohne Reload", async ({
  page,
  context,
}) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);

  const overviewItem = page.getByRole("button", { name: inboxDecisionTitle });
  await expect(overviewItem).toBeVisible();
  await expect(overviewItem).not.toContainText("Rückfrage vorbereitet");

  // A genuine second tab shares the same localStorage origin, so writing
  // there fires a native "storage" event in the first tab (a same-tab write
  // never fires this event at all).
  const secondTab = await context.newPage();
  await secondTab.goto("/inbox");
  await secondTab.evaluate(() => {
    const currentAnalysis = JSON.parse(
      window.localStorage.getItem("atlas-inquiry-analysis"),
    );
    window.localStorage.setItem(
      "atlas-clarification-draft",
      JSON.stringify({
        customerName: currentAnalysis.customer.name,
        subject: "Rückfrage zu Ihrer Anfrage",
        message: "Bitte ergänzen Sie die fehlenden Angaben.",
        missingInformation: currentAnalysis.missingInformation,
        status: "draft",
      }),
    );
    window.localStorage.setItem(
      "atlas-clarification-draft-analysis-binding",
      JSON.stringify({ version: 1, workflowId: currentAnalysis.workflowId }),
    );
  });
  await secondTab.close();

  // No reload: Today must notice the cross-tab draft while staying mounted.
  await expect(overviewItem).toContainText("Rückfrage vorbereitet");
});

test("Today zeigt den Hinweis nicht für einen Rückfrageentwurf einer fremden workflowId", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem("atlas-clarification-draft", JSON.stringify({
      customerName: "Fremde Anfrage",
      subject: "Rückfrage zu einer anderen Anfrage",
      message: "Sehr geehrte Damen und Herren,\n\n...",
      missingInformation: ["Andere Angabe"],
      status: "draft",
    }));
    window.localStorage.setItem("atlas-clarification-draft-analysis-binding", JSON.stringify({
      version: 1,
      workflowId: "foreign-workflow-id",
    }));
  });

  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL(/\/today\?focusWorkflowId=.+/);
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();

  await expect(
    page.getByText("Für diese Anfrage ist bereits eine Rückfrage vorbereitet."),
  ).toHaveCount(0);
});

test("eine statische Today-Entscheidung ohne workflowId zeigt nie einen Rückfrage-Hinweis", async ({ page }) => {
  await page.goto("/today");
  await page.evaluate(() => {
    window.localStorage.setItem("atlas-clarification-draft", JSON.stringify({
      customerName: "Irgendein Kunde",
      subject: "Irgendeine Rückfrage",
      message: "Sehr geehrte Damen und Herren,\n\n...",
      missingInformation: ["Irgendeine Angabe"],
      status: "draft",
    }));
    window.localStorage.setItem("atlas-clarification-draft-analysis-binding", JSON.stringify({
      version: 1,
      workflowId: "irgendein-workflow",
    }));
  });
  await page.reload();

  await expect(page.getByRole("heading", { name: "Heute zuerst" })).toBeVisible();
  await expect(
    page.getByText("Für diese Anfrage ist bereits eine Rückfrage vorbereitet."),
  ).toHaveCount(0);
});

test("Inbox-Prüfvormerkung bleibt auch während der Verarbeitung klar benannt", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await page.getByRole("button", { name: "Angebotsentwurf Familie Schneider vorbereiten" }).click();
  // "**/today" alone would no longer match once focusWorkflowId is part of
  // the URL, since Next.js Server Actions post back to the exact current
  // URL including its query string.
  await page.route("**/today**", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await route.continue();
  });

  const submit = page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("button", { name: "Wird vorgemerkt …" })).toBeDisabled();
  await submit;
});

test("Inbox-Review-Kontext bleibt im mobilen Today-Happy-Path vollständig prüfbar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await page.getByRole("button", { name: "Angebotsentwurf Familie Schneider vorbereiten" }).click();

  const reviewContext = page.getByRole("region", { name: "Prüfgrundlage aus der Inbox" });
  await expect(reviewContext).toBeVisible();
  await expect(reviewContext).toContainText("KI-Zusammenfassung der Anfrage (ungeprüft)");
  await expect(reviewContext).toContainText("Nächster menschlicher Schritt");
  await expect(page.getByRole("link", { name: "Ändern" })).toBeVisible();
});

test("Inbox-Reset entfernt die vorbereitete Entscheidung aus Today", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(
    page.getByRole("heading", { name: "Analyse abgeschlossen" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" })
    .click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toHaveCount(0);

  await page.goto("/today");

  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Angebotsentwurf Familie Schneider vorbereiten" }),
  ).toHaveCount(0);
});

test("Inbox-Reset leert den lokalen Vorgang auch bei fehlgeschlagenem Server-Cleanup", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(
    page.getByRole("heading", { name: "Analyse abgeschlossen" }),
  ).toBeVisible();

  await page.route("**/inbox", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 500, body: "Server-Cleanup fehlgeschlagen" });
      return;
    }

    await route.continue();
  });

  await page
    .getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" })
    .click();

  await expect(
    page.getByRole("button", { name: "Anfrage analysieren" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Der Vorgang wurde lokal zurückgesetzt.",
  );
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("atlas-inquiry-analysis")))
    .toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("atlas-editable-offer")))
    .toBeNull();
});

test("Eine erneute Inbox-Analyse entfernt eine alte manuelle Priorisierung", async ({ page }) => {
  const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(
    page.getByRole("heading", { name: "Analyse abgeschlossen" }),
  ).toBeVisible();

  await page.goto("/today");
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(manualPriorityExplanation(page)).toBeVisible();

  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  // "Analyse erneut starten" on a restored analysis now safely re-runs the
  // persisted context instead of the (unused) intake fields; wait for the
  // restored warning to clear as the reliable completion signal, since the
  // "Analyse abgeschlossen" heading is already visible before the click.
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);

  await page.goto("/today");
  await expect(manualPriorityExplanation(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: inboxDecisionTitle })).toBeVisible();
});

test("Dependencies halten wartende Entscheidungen zurück und schalten Folgeentscheidungen frei", async ({ page }) => {
  await page.goto("/today");

  await expect(page.getByRole("heading", { name: visitTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: offerTitle })).toHaveCount(0);

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await page.getByRole("button", { name: "Später entscheiden" }).click();

  await expect(page.getByRole("heading", { name: measurementTitle })).toBeVisible();
  await expect(
    page.getByText("Blockiert weitere Arbeiten: Voraussetzung für Folgeentscheidung."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: measurementOverviewTitle })).toHaveCount(0);

  await page.getByRole("button", { name: "Prüfpunkt markieren" }).click();

  await expect(page.getByRole("heading", { name: offerTitle })).toBeVisible();
  await expect(page.getByText("Wartet auf vorherige Entscheidung.")).toHaveCount(0);
  await expect(
    page.getByText("Blockiert weitere Arbeiten: Voraussetzung für Folgeentscheidung."),
  ).toBeVisible();
});

test("Eine weitere Entscheidung wird manuell priorisiert, während die übrige Queue von der Engine kommt", async ({ page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Materialrückfrage vormerken" }).click();

  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Besichtigung Weber einordnen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();
  await expect(manualPriorityExplanation(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Besichtigung Weber einordnen" })).toBeVisible();
});

test("Eine neu priorisierte Entscheidung kann sofort freigegeben werden", async ({ page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Materialrückfrage vormerken" }).click();
  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Rückfrage vormerken" }).click();

  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Materialrückfrage wurde vorgemerkt.",
  );
  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Entscheidungsfehler")).toHaveCount(0);
});

test("Eine erneut priorisierte Entscheidung verliert ihren Später-Status", async ({
  context,
  page,
}) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await page.getByRole("button", { name: "Besichtigung Weber einordnen" }).click();

  await expect(
    page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" }),
  ).toBeVisible();

  const decisionCookie = (await context.cookies(page.url())).find(
    (cookie) => cookie.name === todayDecisionCookieName,
  );
  expect(decisionCookie).toBeDefined();
  const persistedState = JSON.parse(decodeURIComponent(decisionCookie.value));

  expect(persistedState.decisions).not.toContainEqual({
    decisionId: "visit-weber",
    action: "later",
  });
});

test("Der primäre Freigabe-Button ist sichtbar, erreichbar und rückt die nächste Entscheidung nach", async ({ page }) => {
  await page.goto("/today");
  await prioritizeOffer(page);

  const approveButton = page.getByRole("button", { name: "Angebot senden" });
  await expect(approveButton).toBeVisible();
  await expect(approveButton).toBeEnabled();
  await expect(approveButton).toHaveText(/\S/);
  await expect(approveButton).toHaveText("Angebot senden");

  const approveButtonBox = await approveButton.boundingBox();
  expect(approveButtonBox).not.toBeNull();
  expect(approveButtonBox?.width).toBeGreaterThan(0);
  expect(approveButtonBox?.height).toBeGreaterThan(0);

  await approveButton.focus();
  await expect(approveButton).toBeFocused();
  await approveButton.click();

  await expect(page).toHaveURL("/today");
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText("Angebot für Familie Müller wurde freigegeben.");
  await expect(page.getByRole("heading", { name: offerTitle })).toHaveCount(0);
  await expectNextOpenDecision(page);
  await expect(
    page.getByText("Diese Entscheidung wurde manuell für Heute zuerst priorisiert."),
  ).toHaveCount(0);
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Während der Freigabe bleiben alle Aktionen sichtbar, aber gesperrt", async ({ page }) => {
  await page.goto("/today");
  await prioritizeOffer(page);
  await page.route("**/today", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await route.continue();
  });

  const approveButton = page.getByRole("button", { name: "Angebot senden" });
  const submit = approveButton.click();

  await expect(page.getByRole("button", { name: "Wird freigegeben …" })).toBeDisabled();
  await expect(page.getByText("Ändern", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Später entscheiden" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Details ansehen" })).toBeDisabled();

  await submit;
  await expect(page.getByLabel("Aktueller Abschluss")).toBeVisible();
});

test("Freigabe bleibt nach einem Reload erhalten", async ({ page }) => {
  await page.goto("/today");
  await prioritizeOffer(page);

  await page.getByRole("button", { name: "Angebot senden" }).click();
  const nextDecisionTitle = await expectNextOpenDecision(page);
  await page.reload();

  await expect(page.getByRole("heading", { name: offerTitle })).toHaveCount(0);
  await expect(currentPriorityDecisionHeading(page)).toHaveText(nextDecisionTitle);
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Später entscheiden verschiebt die Priorität ans Ende", async ({ page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Später entscheiden" }).click();

  await expect(page).toHaveURL("/today");
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Die Entscheidung wurde für später eingeordnet.",
  );
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText("Zurückgestellt");
  await expect(page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Besichtigung Weber einordnen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Später entscheiden bleibt nach einem Reload in der offenen Queue", async ({ context, page }) => {
  await page.goto("/today");
  const deferredDecision = {
    id: "visit-weber",
    overviewTitle: visitOverviewTitle,
  };

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Die Entscheidung wurde für später eingeordnet.",
  );
  await page.reload();

  await expect(page.getByRole("button", { name: deferredDecision.overviewTitle })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();

  const decisionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === todayDecisionCookieName && cookie.path === "/",
  );
  expect(decisionCookie).toBeDefined();
  const persistedState = JSON.parse(decodeURIComponent(decisionCookie.value));
  expect(persistedState.decisions).toContainEqual({
    decisionId: deferredDecision.id,
    action: "later",
  });
});

test("Beschädigte Cookie-Daten werden ignoriert", async ({ context, page }) => {
  await context.addCookies([
    {
      name: todayDecisionCookieName,
      value: "not-json",
      url: "http://localhost:3000/today",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/today");

  await expect(page.getByRole("heading", { name: visitTitle })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Ein gültiger Cookie-Zustand wird gelesen", async ({ context, page }) => {
  await context.addCookies([
    {
      name: todayDecisionCookieName,
      value: JSON.stringify({
        version: 1,
        decisions: [{ decisionId: "offer-mueller", action: "approve" }],
      }),
      url: "http://localhost:3000/today",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/today");

  await expect(page.getByRole("heading", { name: offerTitle })).toHaveCount(0);
  await expectNextOpenDecision(page);
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Ein Version-2-Cookie behält nur den manuellen Override", async ({ context, page }) => {
  await context.addCookies([
    {
      name: todayDecisionCookieName,
      value: JSON.stringify({
        version: 2,
        decisions: [],
        decisionOrder: ["supplier-selection", "offer-mueller", "visit-weber"],
      }),
      url: "http://localhost:3000/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  await page.goto("/today");

  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();
  await expect(manualPriorityExplanation(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Besichtigung Weber einordnen" })).toBeVisible();

  await page.getByRole("button", { name: "Rückfrage vormerken" }).click();
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Materialrückfrage wurde vorgemerkt.",
  );

  const decisionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === todayDecisionCookieName && cookie.path === "/",
  );
  expect(decisionCookie).toBeDefined();
  expect(decisionCookie).toMatchObject({ path: "/", secure: false });
  const persistedState = JSON.parse(decodeURIComponent(decisionCookie.value));
  expect(persistedState.version).toBe(3);
  expect(persistedState.decisions).toContainEqual({
    decisionId: "supplier-selection",
    action: "approve",
  });
  expect(persistedState.manualPriorityDecisionId).toBeNull();
  expect(persistedState).not.toHaveProperty("decisionOrder");

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toHaveCount(0);
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Doppelte decisionIds im Cookie behalten die erste gültige Aktion", async ({ context, page }) => {
  await context.addCookies([
    {
      name: todayDecisionCookieName,
      value: JSON.stringify({
        version: 1,
        decisions: [
          { decisionId: "offer-mueller", action: "later" },
          { decisionId: "offer-mueller", action: "approve" },
        ],
      }),
      url: "http://localhost:3000/today",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/today");

  await expect(page.getByRole("heading", { name: visitTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: offerOverviewTitle })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Unbekannte IDs und ungültige Aktionen im Cookie werden ignoriert", async ({ context, page }) => {
  await context.addCookies([
    {
      name: todayDecisionCookieName,
      value: JSON.stringify({
        version: 1,
        decisions: [
          { decisionId: "nicht-bekannt", action: "approve" },
          { decisionId: "offer-mueller", action: "ungueltig" },
        ],
      }),
      url: "http://localhost:3000/today",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/today");

  await expect(page.getByRole("heading", { name: visitTitle })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Die Freigabe schreibt ausschließlich das kompakte Entscheidungsmodell", async ({ context, page }) => {
  await page.goto("/today");
  await prioritizeOffer(page);

  await page.getByRole("button", { name: "Angebot senden" }).click();
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Angebot für Familie Müller wurde freigegeben.",
  );

  const decisionCookie = (await context.cookies(page.url())).find(
    (cookie) => cookie.name === todayDecisionCookieName,
  );

  expect(decisionCookie).toBeDefined();
  expect(decisionCookie).toMatchObject({
    name: todayDecisionCookieName,
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
  });

  const persistedState = JSON.parse(decodeURIComponent(decisionCookie.value));

  expect(persistedState.version).toBe(3);
  expect(persistedState.decisions).toEqual([{ decisionId: "offer-mueller", action: "approve" }]);
  expect(persistedState.manualPriorityDecisionId).toBeNull();
  expect(Object.keys(persistedState).sort()).toEqual([
    "decisions",
    "manualPriorityDecisionId",
    "version",
  ]);
  expect(Object.keys(persistedState.decisions[0]).sort()).toEqual(["action", "decisionId"]);
});

test("Eine bereits erledigte Entscheidung entfernt bei einem stale Submit nicht die nächste", async ({
  context,
  page,
}) => {
  await page.goto("/today");
  await prioritizeOffer(page);
  await context.addCookies([
    {
      name: todayDecisionCookieName,
      value: JSON.stringify({
        version: 1,
        decisions: [{ decisionId: "offer-mueller", action: "approve" }],
      }),
      url: "http://localhost:3000/today",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.getByRole("button", { name: "Angebot senden" }).click();
  await expect(page.getByLabel("Entscheidungsfehler")).toBeVisible();
  await page.reload();

  await expectNextOpenDecision(page);
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Details lassen sich öffnen und schließen", async ({ page }) => {
  await page.goto("/today");
  await prioritizeOffer(page);

  const detailsButton = page.getByRole("button", { name: "Details ansehen" });
  await expect(detailsButton).toHaveAttribute("aria-expanded", "false");

  await detailsButton.click();

  await expect(page.getByRole("button", { name: "Details ausblenden" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Details zum Angebotsentwurf")).toBeVisible();

  await page.getByRole("button", { name: "Details ausblenden" }).click();

  await expect(page.getByRole("button", { name: "Details ansehen" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Details zum Angebotsentwurf")).toHaveCount(0);
});

test("Ändern erzeugt keinen falschen Abschlussstatus", async ({ page }) => {
  await page.goto("/today");
  await prioritizeOffer(page);

  await page.getByRole("link", { name: "Ändern" }).click();

  await expect(page).toHaveURL("/today/tasks/offer-mueller");
  await expect(page.getByRole("heading", { name: "Angebot Müller prüfen" })).toBeVisible();
  await expect(page.getByLabel("Abschlusszustand")).toHaveCount(0);
});

test("Nicht implementierte Sekundäraktionen werden nicht angeboten", async ({ page }) => {
  await page.goto("/today");

  await expect(page.getByText("Rückfrage stellen")).toHaveCount(0);
  await expect(page.getByText("Später entscheiden")).toBeVisible();
});

test("Today-Seite zeigt Abschlusszustand nach Angebotsfreigabe", async ({ page }) => {
  await page.goto("/today?offerApproved=true");

  await expect(page).toHaveURL("/today?offerApproved=true");
  await expect(page.getByRole("heading", { name: "Guten Morgen." })).toBeVisible();
  await expect(page.getByLabel("Abschlusszustand")).toContainText("Angebot Müller wurde freigegeben.");
  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toHaveCount(0);
});

test("Der Angebotsabschluss bleibt nach Priorisieren und Verschieben wirksam", async ({ page }) => {
  await page.goto("/today?offerApproved=true");

  await expect(
    page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Materialrückfrage vormerken" }).click();
  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await expect(
    page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" }),
  ).toHaveCount(0);
});

test("Today-Seite zeigt Abschlusszustand nach Änderungsanforderung", async ({ page }) => {
  await page.goto("/today?changeRequested=true");

  await expect(page).toHaveURL("/today?changeRequested=true");
  await expect(page.getByRole("heading", { name: "Guten Morgen." })).toBeVisible();
  await expect(page.getByLabel("Abschlusszustand")).toContainText("Änderung für Angebot Müller wurde angefordert.");
  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toHaveCount(0);
});

test("Die Änderungsanforderung bleibt nach Priorisieren und Freigeben wirksam", async ({ page }) => {
  await page.goto("/today?changeRequested=true");

  await page.getByRole("button", { name: "Materialrückfrage vormerken" }).click();
  await page.getByRole("button", { name: "Rückfrage vormerken" }).click();

  await expect(
    page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" }),
  ).toHaveCount(0);
});

test("Inbox ist erreichbar", async ({ page }) => {
  await page.goto("/inbox");

  await expect(page.getByRole("heading", { name: "Neue Kundenanfrage" })).toBeVisible();
  await expect(page.getByLabel("Kunde oder Kontakt")).toHaveValue("");
  await expect(page.getByLabel("Ort (optional)")).toHaveValue("");
  await expect(page.getByLabel("Kundenanfrage")).toHaveValue("");
  await expect(page.getByText("Familie Schneider", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Mannheim", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Anfrage analysieren" })).toBeVisible();
});

test("Inbox weist leere Pflichtfelder zugänglich zurück", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();

  await expect(page.getByText("Bitte einen Kunden oder Kontakt angeben.")).toBeVisible();
  await expect(page.getByText("Bitte die Kundenanfrage eingeben.")).toBeVisible();
  await expect(page.getByLabel("Kunde oder Kontakt")).toBeFocused();
});

test("Inbox übermittelt Kontakt, optionalen Ort und Anfrage im bestehenden Analysevertrag", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page, {
    customer: "Malerbetrieb König",
    location: "Speyer",
    message: "Bitte prüfen Sie einen neuen Anstrich im Treppenhaus.",
  });

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({
    inquiry: [
      "Kunde/Kontakt: Malerbetrieb König",
      "Ort: Speyer",
      "Kundenanfrage:",
      "Bitte prüfen Sie einen neuen Anstrich im Treppenhaus.",
    ].join("\n"),
  });
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByText("Flächenangabe laut Analyse")).toBeVisible();
  await expect(page.getByText("75 m²", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Keine automatisch abgeleitete Wand- oder Deckenfläche."),
  ).toBeVisible();
  await expect(page.getByText("Geschätzte Fläche")).toHaveCount(0);
});

test("Inbox analysiert eine gültige Anfrage ohne optionalen Ort", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page, { location: "" });

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON().inquiry).not.toContain("Ort:");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
});

test("Eine wiederhergestellte Analyse benötigt vor der Angebotserstellung eine neue Analyse", async ({ page }) => {
  await page.addInitScript((analysis) => {
    window.localStorage.setItem("atlas-inquiry-analysis", JSON.stringify(analysis));
  }, inboxAnalysisFixture);
  await page.goto("/inbox");

  const offerButton = page.getByRole("button", { name: "Angebotsentwurf erstellen" });
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt.",
  );
  await expect(offerButton).toBeDisabled();

  await fillInboxInquiry(page, {
    customer: "Familie Anders",
    location: "Ludwigshafen",
    message: "Bitte die Fassade neu streichen.",
  });
  await expect(offerButton).toBeDisabled();

  // This restored analysis has no persisted workflow-bound context, so
  // "Analyse erneut starten" must not silently start a new workflow from
  // whatever happens to be typed in the intake fields; it shows a safe,
  // understandable message instead and leaves everything else untouched.
  let analyzeRequested = false;
  await page.route("**/api/analyze-inquiry", async (route) => {
    analyzeRequested = true;
    await route.continue();
  });
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText(
      "Der gespeicherte Anfragekontext fehlt. Diese Analyse kann nicht sicher erneut ausgewertet werden.",
    ),
  ).toBeVisible();
  expect(analyzeRequested).toBe(false);
  await expect(offerButton).toBeDisabled();

  // The existing reset button remains the correct, explicit way to discard
  // this restored analysis and analyze a genuinely new inquiry.
  await page.getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" }).click();
  await fillInboxInquiry(page, {
    customer: "Familie Anders",
    location: "Ludwigshafen",
    message: "Bitte die Fassade neu streichen.",
  });

  // Restore the normal analyze-inquiry mock: the route.continue() handler
  // above only proved the safety path makes no request, but it would
  // otherwise shadow the beforeEach fixture mock and let this next,
  // legitimate submit reach the real API route.
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: inboxAnalysisFixture }),
    });
  });

  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(offerButton).toBeEnabled();

  const offerRequestPromise = page.waitForRequest("**/api/generate-offer");
  await offerButton.click();
  const offerRequest = await offerRequestPromise;
  expect(offerRequest.postDataJSON().inquiry).toBe([
    "Kunde/Kontakt: Familie Anders",
    "Ort: Ludwigshafen",
    "Kundenanfrage:",
    "Bitte die Fassade neu streichen.",
  ].join("\n"));
});

test("Die Angebotserstellung bleibt an die exakt analysierte Anfrage gebunden", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page, {
    customer: "Familie König",
    location: "Speyer",
    message: "Bitte das Treppenhaus streichen.",
  });
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await page.getByLabel("Kunde oder Kontakt").fill("Familie Nachträglich");
  await page.getByLabel("Ort (optional)").fill("Mannheim");
  await page.getByLabel("Kundenanfrage").fill("Eine andere Anfrage.");

  const offerRequestPromise = page.waitForRequest("**/api/generate-offer");
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  const offerRequest = await offerRequestPromise;

  expect(offerRequest.postDataJSON().inquiry).toBe([
    "Kunde/Kontakt: Familie König",
    "Ort: Speyer",
    "Kundenanfrage:",
    "Bitte das Treppenhaus streichen.",
  ].join("\n"));
});

test("Analyse erneut starten entfernt bei fehlendem Kontext den bestehenden Angebotsentwurf nicht", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(({ analysis, offer }) => {
    window.localStorage.setItem("atlas-inquiry-analysis", JSON.stringify(analysis));
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
  }, { analysis: inboxAnalysisFixture, offer: inboxOfferFixture });
  await page.goto("/inbox");

  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();
  await fillInboxInquiry(page, {
    customer: "Familie B",
    location: "Heidelberg",
    message: "Bitte das Schlafzimmer streichen.",
  });

  // This restored analysis has no persisted workflow-bound context (it was
  // seeded directly, not via a real analyze run), so restarting must not
  // silently swap the workflow using the freshly typed intake fields, and
  // must therefore not touch the existing offer draft either.
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText(
      "Der gespeicherte Anfragekontext fehlt. Diese Analyse kann nicht sicher erneut ausgewertet werden.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angebotsentwurf erstellen" })).toBeDisabled();
});

test("Analyse erneut starten löst bei fehlendem Kontext keinen Request aus und lässt den persistierten Vorgang unverändert", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(({ analysis, offer }) => {
    window.localStorage.setItem("atlas-inquiry-analysis", JSON.stringify(analysis));
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
  }, { analysis: inboxAnalysisFixture, offer: inboxOfferFixture });
  let analyzeRequested = false;
  await page.route("**/api/analyze-inquiry", async (route) => {
    analyzeRequested = true;
    await route.continue();
  });
  await page.goto("/inbox");
  await fillInboxInquiry(page, {
    customer: "Familie B",
    message: "Bitte das Schlafzimmer streichen.",
  });
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText(
      "Der gespeicherte Anfragekontext fehlt. Diese Analyse kann nicht sicher erneut ausgewertet werden.",
    ),
  ).toBeVisible();
  expect(analyzeRequested).toBe(false);

  const storedWorkflow = await page.evaluate(() => ({
    analysis: JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis") ?? "null"),
    offer: JSON.parse(window.localStorage.getItem("atlas-editable-offer") ?? "null"),
  }));
  expect(storedWorkflow.analysis).toEqual(inboxAnalysisFixture);
  expect(storedWorkflow.offer).toEqual(inboxOfferFixture);
});

test("Eine ausstehende Angebot-Antwort bleibt nach Start der Analyse B wirkungslos", async ({ page }) => {
  let releaseOfferA;
  let offerAFulfilled = false;
  let offerRequestCount = 0;
  await page.route("**/api/generate-offer", async (route) => {
    offerRequestCount += 1;
    if (offerRequestCount === 1) {
      await new Promise((resolve) => {
        releaseOfferA = resolve;
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ offer: inboxOfferFixture }),
      });
      offerAFulfilled = true;
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        offer: {
          ...inboxOfferFixture,
          title: "Angebotsentwurf B",
          projectSummary: "Anfrage B",
        },
      }),
    });
  });
  await page.goto("/inbox");
  await fillInboxInquiry(page, {
    customer: "Familie A",
    message: "Anfrage A",
  });
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect.poll(() => typeof releaseOfferA).toBe("function");

  await page.getByLabel("Kunde oder Kontakt").fill("Familie B");
  await page.getByLabel("Kundenanfrage").fill("Anfrage B");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  releaseOfferA();
  await expect.poll(() => offerAFulfilled).toBe(true);
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toHaveCount(0);
  await expect.poll(
    () => page.evaluate(() => window.localStorage.getItem("atlas-editable-offer")),
  ).toBeNull();

  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf B", { exact: true })).toBeVisible();
  await expect.poll(
    () => page.evaluate(() => JSON.parse(
      window.localStorage.getItem("atlas-editable-offer") ?? "null",
    )?.title),
  ).toBe("Angebotsentwurf B");
});

test("Inbox bewahrt die bestehenden Analyse- und Angebotsverträge im lokalen Speicher", async ({ page }) => {
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();

  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => ({
    analysis: JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis") ?? "null"),
    offer: JSON.parse(window.localStorage.getItem("atlas-editable-offer") ?? "null"),
  }));

  expect(stored.analysis).toMatchObject({
    customer: { name: "Unbekannt" },
    project: { trade: "Malerarbeiten", estimatedArea: 75 },
    recommendedTask: { type: "offer" },
  });
  expect(stored.offer).toMatchObject({
    customerName: "Unbekannt",
    positions: [{ quantity: 0, unit: "noch zu ermitteln" }],
    status: "draft",
  });
});

test("Inbox zeigt den bestehenden Analysefehler und erlaubt einen neuen Versuch", async ({ page }) => {
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Analyse vorübergehend nicht verfügbar." }),
    });
  });
  await page.goto("/inbox");
  await fillInboxInquiry(page);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();

  await expect(page.getByText("Analyse fehlgeschlagen")).toBeVisible();
  await expect(page.getByText("Analyse vorübergehend nicht verfügbar.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Erneut versuchen" })).toBeVisible();
});

test("Lieferantenangebot ist erreichbar und Zurück-Link funktioniert", async ({ page }) => {
  await page.goto("/today/tasks/select-supplier-offer");

  await expect(page.getByRole("heading", { name: "Lieferantenangebot auswählen" })).toBeVisible();

  await page.getByRole("link", { name: "← Zurück zur Tagesübersicht" }).click();

  await expect(page).toHaveURL("/today");
  await expect(page.getByRole("heading", { name: "Guten Morgen." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heute zuerst" })).toBeVisible();
});
