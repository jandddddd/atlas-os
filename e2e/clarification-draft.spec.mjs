import { expect, test } from "@playwright/test";

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
    title: "Angebotsentwurf Familie Schneider vorbereiten",
  },
};

const inboxAnalysisWithoutMissingInformationFixture = {
  ...inboxAnalysisFixture,
  missingInformation: [],
};

const staleClarificationDraftFixture = {
  customerName: "Unbekannt",
  subject: "Rückfrage zu Ihrer Anfrage: Alte Anfrage",
  message: "Sehr geehrte Damen und Herren,\n\n...",
  missingInformation: ["Alte Angabe"],
  status: "draft",
};

async function stubClipboard(page) {
  await page.addInitScript(() => {
    window.__copiedText = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedText = text;
        },
      },
    });
  });
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

async function fillAndAnalyze(page, overrides) {
  await page.goto("/inbox");
  await fillInboxInquiry(page, overrides);
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await stubClipboard(page);
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: inboxAnalysisFixture }),
    });
  });
});

test("CTA erscheint nur, wenn fehlende Informationen vorhanden sind", async ({ page }) => {
  await fillAndAnalyze(page);

  await expect(
    page.getByRole("button", { name: "Rückfrage vorbereiten" }),
  ).toBeVisible();
});

test("CTA erscheint nicht, wenn keine Informationen fehlen", async ({ page }) => {
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: inboxAnalysisWithoutMissingInformationFixture }),
    });
  });

  await fillAndAnalyze(page);

  await expect(
    page.getByRole("button", { name: "Rückfrage vorbereiten" }),
  ).toHaveCount(0);
});

test("Rückfrage kann lokal aus den fehlenden Informationen erstellt werden", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();

  const draft = page.getByLabel("Rückfrageentwurf");
  await expect(draft).toBeVisible();
  await expect(
    draft.getByRole("heading", {
      name: "Rückfrage zu Ihrer Anfrage: Wohnzimmer, Esszimmer und Flur streichen",
    }),
  ).toBeVisible();
  await expect(draft.getByText("Guten Tag,")).toBeVisible();
  await expect(draft.getByText("- Bilder")).toBeVisible();
  await expect(draft.getByText("- genaue Raummaße")).toBeVisible();
});

test("Betreff und Nachricht können bearbeitet werden", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");

  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft.getByLabel("Betreff").fill("Kurze Rückfrage zu Ihrem Anstrich");
  await draft.getByLabel("Nachricht").fill("Angepasster Nachrichtentext.");

  await expect(draft.getByLabel("Betreff")).toHaveValue(
    "Kurze Rückfrage zu Ihrem Anstrich",
  );
  await expect(draft.getByLabel("Nachricht")).toHaveValue(
    "Angepasster Nachrichtentext.",
  );
});

test("Änderungen können verworfen werden", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");

  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft.getByLabel("Betreff").fill("Verworfene Änderung");
  await draft.getByRole("button", { name: "Änderungen verwerfen" }).click();

  await expect(
    draft.getByRole("heading", {
      name: "Rückfrage zu Ihrer Anfrage: Wohnzimmer, Esszimmer und Flur streichen",
    }),
  ).toBeVisible();
  await expect(draft.getByText("Verworfene Änderung")).toHaveCount(0);
});

test("Änderungen können gespeichert werden", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");

  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft.getByLabel("Betreff").fill("Gespeicherte Änderung");
  await draft.getByRole("button", { name: "Änderungen übernehmen" }).click();

  await expect(
    draft.getByRole("heading", { name: "Gespeicherte Änderung" }),
  ).toBeVisible();
  await expect(draft.getByText(/Änderungen gespeichert um/)).toBeVisible();
});

test("eine erneute CTA-Interaktion überschreibt einen bereits bearbeiteten und gespeicherten Entwurf nicht", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");

  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft
    .getByLabel("Nachricht")
    .fill("Individuell angepasster, bereits abgestimmter Text.");
  await draft.getByRole("button", { name: "Änderungen übernehmen" }).click();

  await expect(
    page.getByRole("button", { name: "Rückfrage vorbereiten" }),
  ).toHaveCount(0);
  const viewButton = page.getByRole("button", { name: "Rückfrage ansehen" });
  await expect(viewButton).toBeVisible();
  await viewButton.click();

  await expect(
    draft.getByText("Individuell angepasster, bereits abgestimmter Text."),
  ).toBeVisible();
  await expect(draft.getByText(/vielen Dank für Ihre Anfrage/)).toHaveCount(0);
});

test("Entwurf überlebt einen Reload für denselben Workflow", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");
  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft.getByLabel("Betreff").fill("Betreff nach Speichern");
  await draft.getByRole("button", { name: "Änderungen übernehmen" }).click();

  await page.reload();

  await expect(
    page.getByLabel("Rückfrageentwurf").getByRole("heading", {
      name: "Betreff nach Speichern",
    }),
  ).toBeVisible();
});

test("ein neu gestarteter Workflow entfernt einen zuvor erstellten Rückfrageentwurf", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  await fillInboxInquiry(page, {
    customer: "Familie Weber",
    message: "Bitte die Fassade neu streichen.",
  });
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
});

test("ein an einen anderen Workflow gebundener Entwurf wird nach einem Reload nicht angezeigt", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.evaluate((draft) => {
    window.localStorage.setItem("atlas-clarification-draft", JSON.stringify(draft));
    window.localStorage.setItem(
      "atlas-clarification-draft-analysis-binding",
      JSON.stringify({ version: 1, workflowId: "stale-other-tab" }),
    );
  }, staleClarificationDraftFixture);

  await page.reload();

  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
});

test("der vollständige Reset entfernt den Rückfrageentwurf", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  await page
    .getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" })
    .click();

  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("atlas-clarification-draft")))
    .toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("atlas-clarification-draft-analysis-binding"),
      ),
    )
    .toBeNull();
});

test("Nachricht kopieren kopiert den sichtbaren Nachrichtentext und bestätigt dies", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");

  await draft.getByRole("button", { name: "Nachricht kopieren" }).click();
  await expect(draft.getByText("Nachricht kopiert")).toBeVisible();

  const copiedText = await page.evaluate(() => window.__copiedText);
  expect(copiedText).toContain("Bilder");
  expect(copiedText).toContain("genaue Raummaße");
});

test("der Rückfrageentwurf bietet keinen Versand oder automatischen Versand an", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");
  await expect(draft).toBeVisible();

  await expect(
    draft.getByRole("button", { name: /senden|versenden|verschicken/i }),
  ).toHaveCount(0);
  await expect(draft.getByRole("link", { name: /senden|versenden|verschicken/i })).toHaveCount(0);
});
