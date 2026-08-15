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

function analysisKey(analysis) {
  return JSON.stringify({
    version: 1,
    customer: analysis.customer,
    project: analysis.project,
    workflow: analysis.workflow,
    nextSteps: analysis.nextSteps,
    missingInformation: analysis.missingInformation,
    recommendedTask: analysis.recommendedTask,
  });
}

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

test("Today hides a stale draft bound to another analysis even for the same customer", async ({ page }) => {
  await fillAndAnalyze(page);
  const staleAnalysis = {
    ...inboxAnalysisFixture,
    project: {
      ...inboxAnalysisFixture.project,
      service: "Fassade streichen",
    },
    recommendedTask: {
      type: "offer",
      title: "Angebotsentwurf Fassade vorbereiten",
    },
  };
  await page.evaluate(({ offer, staleKey }) => {
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
    window.localStorage.setItem(
      "atlas-editable-offer-analysis-binding",
      JSON.stringify({ version: 1, analysisKey: staleKey }),
    );
  }, { offer: inboxOfferFixture, staleKey: analysisKey(staleAnalysis) });
  await openInboxDecision(page);

  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Angebotsentwurf weiterbearbeiten" }),
  ).toHaveCount(0);
});

test("handoff revalidates storage when the draft disappears after approval", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
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
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();
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
