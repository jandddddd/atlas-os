import { expect, test } from "@playwright/test";

const inboxDecisionTitle = "Angebotsentwurf Familie Schneider vorbereiten";
const inboxAnalysisFixture = {
  customer: { name: "Unbekannt" },
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
    title: inboxDecisionTitle,
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

async function fillAndAnalyze(page) {
  await page.goto("/inbox");
  await page.getByLabel("Kunde oder Kontakt").fill("Familie Berger");
  await page.getByLabel("Ort (optional)").fill("Heidelberg");
  await page.getByLabel("Kundenanfrage").fill(
    "Bitte unser Wohnzimmer streichen. Bilder reichen wir nach.",
  );
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
}

async function openInboxDecision(page) {
  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL("/today");
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();
}

async function generateOfferAndAssertPayload(page) {
  const requestPromise = page.waitForRequest("**/api/generate-offer");
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  const payload = (await requestPromise).postDataJSON();
  expect(payload.analysis).toEqual(inboxAnalysisFixture);
  expect(payload.analysis).not.toHaveProperty("workflowId");
  await expect(
    page.getByText("Angebotsentwurf Familie Schneider", { exact: true }),
  ).toBeVisible();
  const storedWorkflow = await page.evaluate(() => ({
    analysis: JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
    binding: JSON.parse(
      window.localStorage.getItem("atlas-editable-offer-analysis-binding"),
    ),
  }));
  expect(storedWorkflow.binding.workflowId).toBe(storedWorkflow.analysis.workflowId);
}

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: inboxAnalysisFixture }),
    });
  });
  await page.route("**/api/generate-offer", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ offer: inboxOfferFixture }),
    });
  });
});

test("Today exposes no offer-draft handoff when no draft has been saved", async ({ page }) => {
  await fillAndAnalyze(page);
  await openInboxDecision(page);

  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Angebotsentwurf weiterbearbeiten" }),
  ).toHaveCount(0);
});

test("Today hides a stale draft from another workflow even when analysis content matches", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.evaluate((offer) => {
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
    window.localStorage.setItem(
      "atlas-editable-offer-analysis-binding",
      JSON.stringify({ version: 1, workflowId: "stale-other-tab" }),
    );
  }, inboxOfferFixture);
  await openInboxDecision(page);

  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Angebotsentwurf weiterbearbeiten" }),
  ).toHaveCount(0);
});

test("handoff revalidates storage when the draft disappears after approval", async ({ page }) => {
  await fillAndAnalyze(page);
  await generateOfferAndAssertPayload(page);
  await openInboxDecision(page);

  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  const handoff = page.getByRole("link", { name: "Angebotsentwurf weiterbearbeiten" });
  await expect(handoff).toBeVisible();
  await page.evaluate(() => window.localStorage.removeItem("atlas-editable-offer"));
  await handoff.click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(handoff).toHaveCount(0);
});

test("saved offer handoff restores, scrolls to and focuses the draft", async ({ page }) => {
  await fillAndAnalyze(page);
  await generateOfferAndAssertPayload(page);
  await openInboxDecision(page);

  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  const handoff = page.getByRole("link", { name: "Angebotsentwurf weiterbearbeiten" });
  await expect(handoff).toBeVisible();

  await handoff.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/inbox#offer-draft$/);

  const target = page.locator("#offer-draft");
  await expect(target).toBeVisible();
  await expect(target).toBeFocused();
  await expect.poll(async () => target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.top < window.innerHeight;
  })).toBe(true);
  await expect.poll(async () => target.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return style.outlineStyle !== "none" && style.outlineWidth !== "0px";
  })).toBe(true);
});

test("offer workspace keeps the draft and reflects its Today review status", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(
    page.getByText("Angebotsentwurf Familie Schneider", { exact: true }),
  ).toBeVisible();

  await page.goto("/offers");
  const offer = page.getByRole("article");
  await expect(page.getByRole("heading", { name: "Angebote" })).toBeVisible();
  await expect(offer).toContainText("Angebotsentwurf Familie Schneider");
  await expect(offer).toContainText("Prüfung offen");
  await expect(offer.getByRole("link", { name: "In der Inbox bearbeiten" })).toHaveAttribute(
    "href",
    "/inbox#offer-draft",
  );

  await page.goto("/today");
  await page.getByRole("button", { name: inboxDecisionTitle }).click();
  await expect(page.getByRole("heading", { name: inboxDecisionTitle })).toBeVisible();
  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();

  await page.goto("/offers");
  await expect(page.getByRole("article")).toContainText("Geprüft");
});

test("offer workspace opens a historical draft by its workflow id", async ({ page }) => {
  await page.goto("/offers");
  await page.evaluate((offer) => {
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify({
      version: 1,
      offers: [
        {
          id: "historical-workflow",
          workflowId: "historical-workflow",
          offer,
          status: "reviewed",
          updatedAt: "2026-08-17T12:00:00.000Z",
        },
      ],
    }));
  }, inboxOfferFixture);
  await page.reload();

  await page.getByRole("link", { name: "Details ansehen" }).click();
  await expect(page).toHaveURL(/\/offers\/historical-workflow$/);
  await expect(page.getByRole("heading", { name: "Angebotsentwurf Familie Schneider" })).toBeVisible();
  await expect(page.getByText("Geprüft", { exact: true })).toBeVisible();
  await expect(page.getByText("Malerarbeiten in den angefragten Räumen", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "In der Inbox bearbeiten" })).toHaveCount(0);
});

test("offer workspace searches and filters archived drafts", async ({ page }) => {
  await page.goto("/offers");
  await page.evaluate((offer) => {
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify({
      version: 1,
      offers: [
        {
          id: "pending-workflow",
          workflowId: "pending-workflow",
          offer: { ...offer, customerName: "Familie Müller" },
          status: "review-pending",
          updatedAt: "2026-08-17T12:00:00.000Z",
        },
        {
          id: "reviewed-workflow",
          workflowId: "reviewed-workflow",
          offer: {
            ...offer,
            customerName: "Gewerbepark Süd",
            title: "Fassadenanstrich",
            missingInformation: [],
          },
          status: "reviewed",
          updatedAt: "2026-08-17T13:00:00.000Z",
        },
      ],
    }));
  }, inboxOfferFixture);
  await page.reload();

  await expect(page.getByText("2 Angaben offen", { exact: true })).toBeVisible();
  await expect(page.getByText("Angaben vollständig", { exact: true })).toBeVisible();
  await expect(page.getByRole("article").first()).toContainText("Gewerbepark Süd");

  await page.getByLabel("Sortierung").selectOption("oldest");
  await expect(page.getByRole("article").first()).toContainText("Familie Müller");

  await page.getByLabel("Sortierung").selectOption("customer");
  await expect(page.getByRole("article").first()).toContainText("Familie Müller");

  await page.getByLabel("Angebote durchsuchen").fill("müller");
  await expect(page.getByRole("article")).toContainText("Familie Müller");
  await expect(page.getByText("Gewerbepark Süd", { exact: true })).toHaveCount(0);

  await page.getByLabel("Angebote durchsuchen").fill("");
  await page.getByLabel("Prüfstatus").selectOption("reviewed");
  await expect(page.getByRole("article")).toContainText("Gewerbepark Süd");
  await expect(page.getByText("Familie Müller", { exact: true })).toHaveCount(0);
  await expect(page.getByText("1 Vorgang", { exact: true })).toBeVisible();

  await page.getByLabel("Prüfstatus").selectOption("all");
  await page.getByLabel("Angaben").selectOption("missing");
  await expect(page.getByRole("article")).toContainText("Familie Müller");
  await expect(page.getByText("Gewerbepark Süd", { exact: true })).toHaveCount(0);

  await page.getByLabel("Angaben").selectOption("complete");
  await expect(page.getByRole("article")).toContainText("Gewerbepark Süd");
  await expect(page.getByText("Familie Müller", { exact: true })).toHaveCount(0);

  await page.getByLabel("Angebote durchsuchen").fill("nicht vorhanden");
  await expect(page.getByRole("heading", { name: "Keine passenden Angebote" })).toBeVisible();
  await page.getByRole("button", { name: "Filter zurücksetzen" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
});

test("historical offer editing persists the exact archive entry and reopens review", async ({ page }) => {
  await page.goto("/offers/historical-workflow");
  await page.evaluate((offer) => {
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify({
      version: 1,
      offers: [
        {
          id: "historical-workflow",
          workflowId: "historical-workflow",
          offer,
          status: "reviewed",
          updatedAt: "2026-08-17T12:00:00.000Z",
        },
        {
          id: "other-workflow",
          workflowId: "other-workflow",
          offer: { ...offer, title: "Unveränderter Entwurf" },
          status: "reviewed",
          updatedAt: "2026-08-17T13:00:00.000Z",
        },
      ],
    }));
  }, inboxOfferFixture);
  await page.reload();

  await page.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await page.getByLabel("Angebotstitel").fill("Historisch überarbeitet");
  await page.getByRole("button", { name: "Änderungen übernehmen" }).click();

  await expect(page.getByRole("heading", { name: "Historisch überarbeitet" })).toBeVisible();
  await expect(page.getByText("Prüfung offen", { exact: true })).toBeVisible();
  const storedOffers = await page.evaluate(() => JSON.parse(window.localStorage.getItem("atlas-offer-workspace")).offers);
  expect(storedOffers[0].id).toBe("historical-workflow");
  expect(storedOffers[0].offer.title).toBe("Historisch überarbeitet");
  expect(storedOffers[0].status).toBe("review-pending");
  expect(storedOffers[1].offer.title).toBe("Unveränderter Entwurf");
});

test("historical editing stays bound when its workflow becomes active before save", async ({ page }) => {
  await page.goto("/offers/historical-workflow");
  await page.evaluate((offer) => {
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify({
      version: 1,
      offers: [{
        id: "historical-workflow",
        workflowId: "historical-workflow",
        offer,
        status: "reviewed",
        updatedAt: "2026-08-17T12:00:00.000Z",
      }],
    }));
  }, inboxOfferFixture);
  await page.reload();

  await page.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await page.getByLabel("Angebotstitel").fill("Jetzt aktiver Entwurf");
  await page.evaluate(({ analysis, offer }) => {
    const workflowId = "historical-workflow";
    window.localStorage.setItem(
      "atlas-inquiry-analysis",
      JSON.stringify({ ...analysis, workflowId }),
    );
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
    window.localStorage.setItem(
      "atlas-editable-offer-analysis-binding",
      JSON.stringify({ version: 1, workflowId }),
    );
  }, { analysis: inboxAnalysisFixture, offer: inboxOfferFixture });
  await page.getByRole("button", { name: "Änderungen übernehmen" }).click();

  await expect(page.getByRole("link", { name: "In der Inbox bearbeiten" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entwurf bearbeiten" })).toHaveCount(0);
  const storedState = await page.evaluate(() => ({
    activeOffer: JSON.parse(window.localStorage.getItem("atlas-editable-offer")),
    binding: JSON.parse(window.localStorage.getItem("atlas-editable-offer-analysis-binding")),
    offers: JSON.parse(window.localStorage.getItem("atlas-offer-workspace")).offers,
  }));
  expect(storedState.activeOffer.title).toBe("Jetzt aktiver Entwurf");
  expect(storedState.binding).toEqual({ version: 1, workflowId: "historical-workflow" });
  expect(storedState.offers[0].offer.title).toBe("Jetzt aktiver Entwurf");
  expect(storedState.offers[0].status).toBe("review-pending");
});

test("offer detail handles an unknown workspace id safely", async ({ page }) => {
  await page.goto("/offers/unknown-workflow");

  await expect(page.getByRole("heading", { name: "Angebot nicht gefunden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Zur Angebotsübersicht" })).toHaveAttribute("href", "/offers");
});

test("a Today approval cannot re-mark an offer reviewed while new customer information requires re-review", async ({ page }) => {
  await fillAndAnalyze(page);
  await generateOfferAndAssertPayload(page);

  await openInboxDecision(page);
  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();

  const analysis = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-inquiry-analysis")),
  );
  const readWorkspace = () =>
    page.evaluate(() => JSON.parse(window.localStorage.getItem("atlas-offer-workspace")));

  let workspace = await readWorkspace();
  expect(
    workspace.offers.find((entry) => entry.workflowId === analysis.workflowId).status,
  ).toBe("reviewed");

  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: { ...inboxAnalysisFixture, missingInformation: [] },
      }),
    });
  });

  await page.getByRole("button", { name: "Kundenantwort ergänzen" }).click();
  const panel = page.getByLabel("Kundenantwort ergänzen");
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  workspace = await readWorkspace();
  const entryAfterReply = workspace.offers.find(
    (entry) => entry.workflowId === analysis.workflowId,
  );
  expect(entryAfterReply.status).toBe("review-pending");
  expect(entryAfterReply.offer).toEqual(inboxOfferFixture);

  await openInboxDecision(page);
  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();

  workspace = await readWorkspace();
  const entryAfterApproval = workspace.offers.find(
    (entry) => entry.workflowId === analysis.workflowId,
  );
  expect(entryAfterApproval.status).toBe("review-pending");
  expect(entryAfterApproval.offer).toEqual(inboxOfferFixture);
});

test("offer workspace migrates the valid bound draft from before Sprint 4a", async ({ page }) => {
  await page.goto("/offers");
  await page.evaluate(({ analysis, offer }) => {
    const workflowId = "legacy-bound-workflow";
    window.localStorage.setItem(
      "atlas-inquiry-analysis",
      JSON.stringify({ ...analysis, workflowId }),
    );
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
    window.localStorage.setItem(
      "atlas-editable-offer-analysis-binding",
      JSON.stringify({ version: 1, workflowId }),
    );
    window.localStorage.removeItem("atlas-offer-workspace");
  }, { analysis: inboxAnalysisFixture, offer: inboxOfferFixture });

  await page.reload();
  const migratedOffer = page.getByRole("article");
  await expect(migratedOffer).toContainText("Angebotsentwurf Familie Schneider");
  await expect(migratedOffer).toContainText("Prüfung offen");
});
