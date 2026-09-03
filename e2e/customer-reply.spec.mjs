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

const updatedAfterFirstReplyFixture = {
  ...inboxAnalysisFixture,
  missingInformation: ["Wunschtermin"],
};

const updatedAfterSecondReplyFixture = {
  ...inboxAnalysisFixture,
  missingInformation: [],
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
  await page
    .getByLabel("Kundenanfrage")
    .fill("Bitte unser Wohnzimmer streichen. Bilder reichen wir nach.");
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
}

async function openReplyPanel(page) {
  await page.getByRole("button", { name: "Kundenantwort ergänzen" }).click();
  return page.getByLabel("Kundenantwort ergänzen");
}

async function readLocalStorageJson(page, key) {
  return page.evaluate(
    (storageKey) => JSON.parse(window.localStorage.getItem(storageKey) ?? "null"),
    key,
  );
}

test.beforeEach(async ({ page }) => {
  let analyzeCallCount = 0;

  await page.route("**/api/analyze-inquiry", async (route) => {
    analyzeCallCount += 1;
    const response =
      analyzeCallCount === 1
        ? inboxAnalysisFixture
        : analyzeCallCount === 2
          ? updatedAfterFirstReplyFixture
          : updatedAfterSecondReplyFixture;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: response }),
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

test("CTA Kundenantwort ergänzen ist auf der Inbox-Seite vorhanden", async ({ page }) => {
  await fillAndAnalyze(page);

  await expect(
    page.getByRole("button", { name: "Kundenantwort ergänzen" }),
  ).toBeVisible();
});

test("das Panel lässt sich öffnen und wieder abbrechen", async ({ page }) => {
  await fillAndAnalyze(page);

  const panel = await openReplyPanel(page);
  await expect(panel).toBeVisible();

  await panel.getByRole("button", { name: "Abbrechen" }).click();
  await expect(panel).toHaveCount(0);
});

test("eine leere Antwort wird nicht abgeschickt", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);

  await panel.getByRole("button", { name: "Antwort auswerten" }).click();

  await expect(
    panel.getByText("Bitte die Antwort des Kunden eingeben."),
  ).toBeVisible();
  await expect(panel).toBeVisible();
});

test("eine erfolgreiche Antwort verwendet die bestehende Analyze-Route und aktualisiert missingInformation", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  const request = await requestPromise;

  expect(request.method()).toBe("POST");
  const payload = request.postDataJSON();
  expect(payload.inquiry).toContain("Bitte unser Wohnzimmer streichen.");
  expect(payload.inquiry).toContain("Neu eingegangene Kundenantwort:");
  expect(payload.inquiry).toContain("Der Wunschtermin ist Ende des Monats.");

  await expect(panel).toHaveCount(0);
  await expect(page.getByText("Wunschtermin")).toBeVisible();
  await expect(page.getByText("Bilder", { exact: true })).toHaveCount(0);
});

test("die workflowId bleibt nach einer erfolgreichen Antwort unverändert", async ({ page }) => {
  await fillAndAnalyze(page);
  const initialAnalysis = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  expect(initialAnalysis.workflowId).toBeTruthy();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(page.getByRole("button", { name: "Kundenantwort ergänzen" })).toBeEnabled();

  const updatedAnalysis = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  expect(updatedAnalysis.workflowId).toBe(initialAnalysis.workflowId);
});

test("ein vorhandener ClarificationDraft verschwindet erst nach einer erfolgreichen Antwort", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();

  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
});

test("bei einem Analysefehler bleibt der ClarificationDraft unverändert erhalten", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  await page.unroute("**/api/analyze-inquiry");
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Auswertung vorübergehend nicht möglich." }),
    });
  });

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();

  await expect(panel.getByText("Auswertung vorübergehend nicht möglich.")).toBeVisible();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();
});

test("ein vorhandener OfferDraft bleibt inhaltlich unverändert und zeigt einen Review-Hinweis", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  const offerBefore = await readLocalStorageJson(page, "atlas-editable-offer");

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  const offerAfter = await readLocalStorageJson(page, "atlas-editable-offer");
  expect(offerAfter).toEqual(offerBefore);

  await expect(
    page.getByText("Neue Kundeninformationen wurden ergänzt. Bitte prüfe den Angebotsentwurf erneut."),
  ).toBeVisible();
});

test("der Review-Hinweis verschwindet nach dem nächsten regulären Speichern des Angebots", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);
  await expect(
    page.getByText("Neue Kundeninformationen wurden ergänzt. Bitte prüfe den Angebotsentwurf erneut."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await page.getByRole("button", { name: "Änderungen übernehmen" }).click();

  await expect(
    page.getByText("Neue Kundeninformationen wurden ergänzt. Bitte prüfe den Angebotsentwurf erneut."),
  ).toHaveCount(0);
});

test("ein zuvor geprüfter Offer-Workspace-Eintrag wird nach neuer Kundeninformation wieder review-pending", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  const analysis = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  await page.evaluate((workflowId) => {
    const workspace = JSON.parse(window.localStorage.getItem("atlas-offer-workspace"));
    workspace.offers[0].status = "reviewed";
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify(workspace));
    void workflowId;
  }, analysis.workflowId);

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  const workspaceAfter = await readLocalStorageJson(page, "atlas-offer-workspace");
  const entry = workspaceAfter.offers.find((item) => item.workflowId === analysis.workflowId);
  expect(entry.status).toBe("review-pending");
  expect(entry.offer).toEqual(inboxOfferFixture);
});

test("die Kundenantwort funktioniert nach einem Reload mit dem korrekt gebundenen Inquiry-Kontext", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const panel = await openReplyPanel(page);
  await expect(panel).toBeVisible();

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON().inquiry).toContain("Bitte unser Wohnzimmer streichen.");
  await expect(panel).toHaveCount(0);
});

test("ein Inquiry-Kontext mit fremder workflowId wird nicht verwendet", async ({ page }) => {
  await fillAndAnalyze(page);
  const analysis = await readLocalStorageJson(page, "atlas-inquiry-analysis");

  await page.evaluate(() => {
    window.localStorage.setItem(
      "atlas-inquiry-context",
      JSON.stringify({
        version: 1,
        workflowId: "stale-other-workflow",
        text: "Fremder, nicht zugehöriger Anfragekontext.",
      }),
    );
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Kundenantwort ergänzen" }),
  ).toBeDisabled();

  const contextAfterReload = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(contextAfterReload.workflowId).toBe("stale-other-workflow");
  expect(contextAfterReload.workflowId).not.toBe(analysis.workflowId);
});

test("eine zweite Kundenantwort enthält weiterhin den Kontext der ersten Antwort", async ({ page }) => {
  await fillAndAnalyze(page);

  const firstPanel = await openReplyPanel(page);
  await firstPanel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await firstPanel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(firstPanel).toHaveCount(0);
  await expect(page.getByText("Wunschtermin")).toBeVisible();

  const secondPanel = await openReplyPanel(page);
  const secondRequestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await secondPanel.getByLabel("Antwort des Kunden").fill("Die Wandfläche beträgt etwa 40 m².");
  await secondPanel.getByRole("button", { name: "Antwort auswerten" }).click();
  const secondRequest = await secondRequestPromise;

  const secondPayload = secondRequest.postDataJSON().inquiry;
  expect(secondPayload).toContain("Bitte unser Wohnzimmer streichen.");
  expect(secondPayload).toContain("Der Wunschtermin ist Ende des Monats.");
  expect(secondPayload).toContain("Die Wandfläche beträgt etwa 40 m².");
});

test("der vollständige Reset entfernt den gespeicherten Inquiry-Kontext", async ({ page }) => {
  await fillAndAnalyze(page);
  expect(await readLocalStorageJson(page, "atlas-inquiry-context")).not.toBeNull();

  await page
    .getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" })
    .click();

  await expect
    .poll(() => readLocalStorageJson(page, "atlas-inquiry-context"))
    .toBeNull();
});

test("die Kundenantwort löst keinen Versand oder externe Kommunikation aus", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);

  await expect(panel.getByRole("button", { name: /senden|versenden|verschicken/i })).toHaveCount(0);

  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  await expect(page.getByRole("button", { name: /senden|versenden|verschicken/i })).toHaveCount(0);
});

test("ein danach erstelltes Angebot basiert auf dem aktualisierten kumulativen Inquiry-Kontext", async ({ page }) => {
  await fillAndAnalyze(page);

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  const offerRequestPromise = page.waitForRequest("**/api/generate-offer");
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  const offerRequest = await offerRequestPromise;

  const offerPayload = offerRequest.postDataJSON();
  expect(offerPayload.inquiry).toContain("Bitte unser Wohnzimmer streichen.");
  expect(offerPayload.inquiry).toContain("Neu eingegangene Kundenantwort:");
  expect(offerPayload.inquiry).toContain("Der Wunschtermin ist Ende des Monats.");
});

test("nach Reload und erfolgreicher Kundenantwort basiert ein danach erstelltes Angebot ebenfalls auf dem aktualisierten Kontext", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  const offerRequestPromise = page.waitForRequest("**/api/generate-offer");
  await expect(page.getByRole("button", { name: "Angebotsentwurf erstellen" })).toBeEnabled();
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  const offerRequest = await offerRequestPromise;

  const offerPayload = offerRequest.postDataJSON();
  expect(offerPayload.inquiry).toContain("Bitte unser Wohnzimmer streichen.");
  expect(offerPayload.inquiry).toContain("Der Wunschtermin ist Ende des Monats.");
});

test("eine invalidierte Offer-Generierung ohne vorhandenen Entwurf bleibt nicht dauerhaft im Ladezustand", async ({ page }) => {
  await fillAndAnalyze(page);

  let releaseOfferResponse;
  await page.route("**/api/generate-offer", async (route) => {
    await new Promise((resolve) => {
      releaseOfferResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ offer: inboxOfferFixture }),
    });
  });

  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByRole("button", { name: "Angebot wird erstellt ..." })).toBeVisible();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  await expect(page.getByRole("button", { name: "Angebot wird erstellt ..." })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Angebotsentwurf erstellen" })).toBeEnabled();

  releaseOfferResponse();
  await expect(page.getByRole("button", { name: "Angebot wird erstellt ..." })).toHaveCount(0);
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toHaveCount(0);
});

test("eine invalidierte Offer-Regenerierung zeigt weiterhin den vorhandenen Entwurf statt im Ladezustand zu bleiben", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  let releaseOfferResponse;
  await page.route("**/api/generate-offer", async (route) => {
    await new Promise((resolve) => {
      releaseOfferResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        offer: { ...inboxOfferFixture, title: "Sollte nicht erscheinen" },
      }),
    });
  });

  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByRole("button", { name: "Angebot wird erstellt ..." })).toBeVisible();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  await expect(page.getByRole("button", { name: "Angebot wird erstellt ..." })).toHaveCount(0);
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  releaseOfferResponse();
  await expect(page.getByText("Sollte nicht erscheinen")).toHaveCount(0);
});

test("ein invalidierter Reply-Request blockiert das Panel im neuen Workflow nicht dauerhaft", async ({ page }) => {
  await fillAndAnalyze(page);

  let releaseReplyResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReplyResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: updatedAfterFirstReplyFixture }),
    });
  });

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(
    panel.getByRole("button", { name: "Antwort wird ausgewertet …" }),
  ).toBeDisabled();

  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: inboxAnalysisFixture }),
    });
  });

  await page.getByLabel("Kunde oder Kontakt").fill("Familie Weber");
  await page.getByLabel("Kundenanfrage").fill("Bitte die Fassade neu streichen.");
  await page.getByRole("button", { name: "Anfrage analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  await expect(page.getByLabel("Kundenantwort ergänzen")).toHaveCount(0);

  const newPanel = await openReplyPanel(page);
  await expect(newPanel.getByRole("button", { name: "Antwort auswerten" })).toBeEnabled();
  await expect(newPanel.getByLabel("Antwort des Kunden")).toBeEnabled();

  releaseReplyResponse?.();
});

test("Offer-Generierung ist während einer laufenden Kundenantwort-Auswertung nicht ausführbar", async ({ page }) => {
  await fillAndAnalyze(page);

  let releaseReplyResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReplyResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: updatedAfterFirstReplyFixture }),
    });
  });

  let generateOfferCalled = false;
  await page.route("**/api/generate-offer", async (route) => {
    generateOfferCalled = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ offer: inboxOfferFixture }),
    });
  });

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(
    panel.getByRole("button", { name: "Antwort wird ausgewertet …" }),
  ).toBeDisabled();

  const offerButton = page.getByRole("button", { name: "Angebotsentwurf erstellen" });
  await expect(offerButton).toBeDisabled();
  await offerButton.click({ force: true });
  expect(generateOfferCalled).toBe(false);

  releaseReplyResponse();
  await expect(panel).toHaveCount(0);

  await expect(offerButton).toBeEnabled();
  const offerRequestPromise = page.waitForRequest("**/api/generate-offer");
  await offerButton.click();
  await offerRequestPromise;
  expect(generateOfferCalled).toBe(true);
  await expect(
    page.getByText("Angebotsentwurf Familie Schneider", { exact: true }),
  ).toBeVisible();
});

test("nach einem fehlgeschlagenen Reply ist die Offer-Generierung wieder nutzbar", async ({ page }) => {
  await fillAndAnalyze(page);

  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Auswertung vorübergehend nicht möglich." }),
    });
  });

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel.getByText("Auswertung vorübergehend nicht möglich.")).toBeVisible();

  const offerButton = page.getByRole("button", { name: "Angebotsentwurf erstellen" });
  await expect(offerButton).toBeEnabled();
  await offerButton.click();
  await expect(
    page.getByText("Angebotsentwurf Familie Schneider", { exact: true }),
  ).toBeVisible();
});
