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

async function goToTodayAndApprove(page, decisionTitle) {
  await page.getByRole("link", { name: "In Heute weiterprüfen" }).click();
  await expect(page).toHaveURL("/today");
  await page.getByRole("button", { name: decisionTitle }).click();
  await expect(page.getByRole("heading", { name: decisionTitle })).toBeVisible();
  await page.getByRole("button", { name: "Als geprüft vormerken" }).click();
  await expect(page.getByRole("region", { name: "Aktueller Abschluss" })).toBeVisible();
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

test("das Panel kann während einer laufenden Auswertung nicht über den äußeren Toggle geschlossen werden, und der eingegebene Text bleibt bei einem Fehler erhalten", async ({ page }) => {
  await fillAndAnalyze(page);

  let releaseReplyResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReplyResponse = resolve;
    });
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Auswertung vorübergehend nicht möglich." }),
    });
  });

  const toggleButton = page.getByRole("button", { name: "Kundenantwort ergänzen" });
  const panel = await openReplyPanel(page);
  const replyText = "Der Wunschtermin ist Ende des Monats.";
  await panel.getByLabel("Antwort des Kunden").fill(replyText);
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(
    panel.getByRole("button", { name: "Antwort wird ausgewertet …" }),
  ).toBeDisabled();

  await expect(toggleButton).toBeDisabled();
  await toggleButton.click({ force: true }).catch(() => {});

  // A disabled native toggle cannot unmount the panel, so the entered text
  // must still be there even after the forced click attempt.
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Antwort des Kunden")).toHaveValue(replyText);

  releaseReplyResponse();
  await expect(panel.getByText("Auswertung vorübergehend nicht möglich.")).toBeVisible();
  await expect(panel.getByLabel("Antwort des Kunden")).toHaveValue(replyText);

  await expect(toggleButton).toBeEnabled();
  await panel.getByRole("button", { name: "Abbrechen" }).click();
  await expect(panel).toHaveCount(0);
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

test("eine laufende Kundenantwort-Auswertung verhindert das Starten eines neuen vollständigen Analyze-Workflows", async ({ page }) => {
  await fillAndAnalyze(page);

  let releaseReplyResponse;
  let newAnalysisRequested = false;
  await page.route("**/api/analyze-inquiry", async (route) => {
    if (route.request().postDataJSON()?.inquiry?.includes("Fassade")) {
      newAnalysisRequested = true;
    }
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

  const restartButton = page.getByRole("button", { name: "Analyse erneut starten" });
  await expect(restartButton).toBeDisabled();
  const submitButton = page.getByRole("button", { name: "Anfrage analysieren" });
  await expect(submitButton).toBeDisabled();
  await expect(page.getByLabel("Kunde oder Kontakt")).toBeDisabled();
  await expect(page.getByLabel("Kundenanfrage")).toBeDisabled();

  // Both controls are genuinely disabled (not just visually), so a forced
  // click cannot dispatch a click event to a disabled native button either.
  await restartButton.click({ force: true }).catch(() => {});
  await submitButton.click({ force: true }).catch(() => {});

  // The blocked attempts must not have reached the analyze route at all;
  // the reply's own in-flight request is the only one that resolves it.
  expect(newAnalysisRequested).toBe(false);
  await expect(panel).toBeVisible();

  releaseReplyResponse();
  await expect(panel).toHaveCount(0);
  await expect(page.getByText("Wunschtermin")).toBeVisible();

  // Once the reply has settled, restarting the analysis works normally again.
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: inboxAnalysisFixture }),
    });
  });

  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByLabel("Kundenantwort ergänzen")).toHaveCount(0);

  const newPanel = await openReplyPanel(page);
  await expect(newPanel.getByRole("button", { name: "Antwort auswerten" })).toBeEnabled();
  await expect(newPanel.getByLabel("Antwort des Kunden")).toBeEnabled();
});

test("eine laufende Kundenantwort-Auswertung verhindert den vollständigen Reset", async ({ page }) => {
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

  const resetButton = page.getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" });
  await expect(resetButton).toBeDisabled();
  await resetButton.click({ force: true });

  // The reset must not have run: the analysis and panel are still there.
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(panel).toBeVisible();

  releaseReplyResponse();
  await expect(panel).toHaveCount(0);
  await expect(resetButton).toBeEnabled();
});

test("der Today-Handoff ist während einer laufenden Kundenantwort-Auswertung nicht verfügbar", async ({ page }) => {
  await fillAndAnalyze(page);
  const handoffLink = page.getByRole("link", { name: "In Heute weiterprüfen" });
  await expect(handoffLink).toBeVisible();

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
  await expect(handoffLink).toHaveCount(0);

  releaseReplyResponse();
  await expect(panel).toHaveCount(0);
  await expect(handoffLink).toBeVisible();
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

test("Analyse erneut starten nutzt nach einem Today-Rundlauf weiterhin den kumulativen Kontext und dieselbe workflowId", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByText("Wunschtermin")).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(workflowIdBefore).toBeTruthy();
  expect(contextBefore.text).toContain("Der Wunschtermin ist Ende des Monats.");

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);

  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toBeVisible();
  const offerButton = page.getByRole("button", { name: "Angebotsentwurf erstellen" });
  await expect(offerButton).toBeDisabled();

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();

  expect(payload.inquiry).toContain("Bitte unser Wohnzimmer streichen.");
  expect(payload.inquiry).toContain("Neu eingegangene Kundenantwort:");
  expect(payload.inquiry).toContain("Der Wunschtermin ist Ende des Monats.");

  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);
  await expect(offerButton).toBeEnabled();

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(analysisAfter.workflowId).toBe(workflowIdBefore);
  expect(contextAfter).toEqual(contextBefore);
});

test("ein Fehler bei der sicheren Reanalyse erhält Analysis, Kontext und workflowId", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const analysisBefore = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");

  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Die Analyse ist vorübergehend nicht verfügbar." }),
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText("Die Analyse ist vorübergehend nicht verfügbar."),
  ).toBeVisible();

  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Angebotsentwurf erstellen" })).toBeDisabled();

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(analysisAfter).toEqual(analysisBefore);
  expect(contextAfter).toEqual(contextBefore);
});

test("Analyse erneut starten ohne gültigen gespeicherten Kontext zeigt eine sichere Meldung statt leerer Intake-Validierung", async ({ page }) => {
  await page.addInitScript((analysis) => {
    window.localStorage.setItem("atlas-inquiry-analysis", JSON.stringify(analysis));
  }, inboxAnalysisFixture);
  await page.goto("/inbox");

  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toBeVisible();

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
  await expect(page.getByLabel("Kundenanfrage")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angebotsentwurf erstellen" })).toBeDisabled();
});

test("Analyse erneut starten bei einer aktuellen Analyse verwendet weiterhin das normale Intake-Verhalten", async ({ page }) => {
  await fillAndAnalyze(page);
  await expect(page.getByLabel("Kunde oder Kontakt")).toHaveValue("Familie Berger");

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON().inquiry).toContain("Familie Berger");
  expect(request.postDataJSON().inquiry).not.toContain("Neu eingegangene Kundenantwort:");

  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  const workflowIdAfter = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  expect(workflowIdAfter).not.toBe(workflowIdBefore);
});

test("eine laufende sichere Reanalyse verhindert Reset, Kundenantwort und eine neue Intake-Analyse", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  let releaseReanalysisResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReanalysisResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: updatedAfterSecondReplyFixture }),
    });
  });

  const restartButton = page.getByRole("button", { name: "Analyse erneut starten" });
  await restartButton.click();
  await expect(page.getByRole("button", { name: "Wird erneut ausgewertet …" })).toBeDisabled();

  const resetButton = page.getByRole("button", { name: "Gespeicherten Vorgang zurücksetzen" });
  await expect(resetButton).toBeDisabled();
  const replyToggle = page.getByRole("button", { name: "Kundenantwort ergänzen" });
  await expect(replyToggle).toBeDisabled();
  const submitButton = page.getByRole("button", { name: "Anfrage analysieren" });
  await expect(submitButton).toBeDisabled();

  await resetButton.click({ force: true }).catch(() => {});
  await replyToggle.click({ force: true }).catch(() => {});
  await submitButton.click({ force: true }).catch(() => {});

  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByLabel("Kundenantwort ergänzen")).toHaveCount(0);

  releaseReanalysisResponse();
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);
});

test("eine erfolgreiche restored Reanalyse entfernt einen bestehenden Rückfrageentwurf", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);

  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
  expect(await readLocalStorageJson(page, "atlas-clarification-draft")).toBeNull();
  expect(
    await readLocalStorageJson(page, "atlas-clarification-draft-analysis-binding"),
  ).toBeNull();

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(analysisAfter.workflowId).toBe(workflowIdBefore);
  expect(contextAfter).toEqual(contextBefore);
});

test("ein bereits geöffnetes Reply-Panel bleibt während einer restored Reanalyse sichtbar, aber nicht interaktiv", async ({ page }) => {
  await fillAndAnalyze(page);
  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Noch nicht abgeschickter Text.");

  let releaseReanalysisResponse;
  let mergeReplyRequested = false;
  await page.route("**/api/analyze-inquiry", async (route) => {
    if (route.request().postDataJSON()?.inquiry?.includes("Neu eingegangene Kundenantwort:")) {
      mergeReplyRequested = true;
    }
    await new Promise((resolve) => {
      releaseReanalysisResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: updatedAfterFirstReplyFixture }),
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByRole("button", { name: "Wird erneut ausgewertet …" }),
  ).toBeDisabled();

  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Antwort des Kunden")).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Antwort auswerten" })).toBeDisabled();
  await expect(panel.getByLabel("Antwort des Kunden")).toHaveValue(
    "Noch nicht abgeschickter Text.",
  );

  // A genuinely disabled native button cannot dispatch a click even when
  // forced, so this proves the submit path is truly blocked, not just
  // visually discouraged.
  await panel
    .getByRole("button", { name: "Antwort auswerten" })
    .click({ force: true })
    .catch(() => {});
  expect(mergeReplyRequested).toBe(false);

  releaseReanalysisResponse();
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);

  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Antwort des Kunden")).toBeEnabled();
  await expect(panel.getByLabel("Antwort des Kunden")).toHaveValue(
    "Noch nicht abgeschickter Text.",
  );
  await expect(panel.getByRole("button", { name: "Antwort auswerten" })).toBeEnabled();
});

test("ein nicht-JSON-Fehler bei der restored Reanalyse zeigt nur die kontrollierte Fallback-Meldung", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const analysisBefore = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");

  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<html>Bad Gateway</html>",
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText("Die Analyse konnte nicht erneut ausgewertet werden."),
  ).toBeVisible();
  await expect(
    page.getByText(/Unexpected token|JSON\.parse|Unexpected end of JSON/i),
  ).toHaveCount(0);

  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toBeVisible();
  await expect(page.getByLabel("Rückfrageentwurf")).toBeVisible();

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(analysisAfter).toEqual(analysisBefore);
  expect(contextAfter).toEqual(contextBefore);
});

test("eine erfolgreiche restored Reanalyse setzt ein bereits geprüftes Angebot wieder auf Re-Review", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");
  const offerBefore = await readLocalStorageJson(page, "atlas-editable-offer");
  let workspace = await readLocalStorageJson(page, "atlas-offer-workspace");
  expect(workspace.offers.find((entry) => entry.workflowId === workflowIdBefore).status).toBe(
    "reviewed",
  );

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);

  await expect(
    page.getByText("Neue Kundeninformationen wurden ergänzt. Bitte prüfe den Angebotsentwurf erneut."),
  ).toBeVisible();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  const offerAfter = await readLocalStorageJson(page, "atlas-editable-offer");
  const binding = await readLocalStorageJson(page, "atlas-editable-offer-analysis-binding");
  workspace = await readLocalStorageJson(page, "atlas-offer-workspace");

  expect(analysisAfter.workflowId).toBe(workflowIdBefore);
  expect(contextAfter).toEqual(contextBefore);
  expect(offerAfter).toEqual(offerBefore);
  expect(binding.needsReview).toBe(true);
  expect(workspace.offers.find((entry) => entry.workflowId === workflowIdBefore).status).toBe(
    "review-pending",
  );

  await page.goto(`/offers/${workflowIdBefore}`);
  await expect(page.getByText("Prüfung offen", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angebotstext kopieren" })).toHaveCount(0);
});

test("eine fehlgeschlagene restored Reanalyse lässt ein bereits geprüftes Angebot vollständig reviewed", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const analysisBefore = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");
  const offerBefore = await readLocalStorageJson(page, "atlas-editable-offer");
  const workspaceBefore = await readLocalStorageJson(page, "atlas-offer-workspace");

  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<html>Bad Gateway</html>",
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText("Die Analyse konnte nicht erneut ausgewertet werden."),
  ).toBeVisible();

  await expect(
    page.getByText("Neue Kundeninformationen wurden ergänzt. Bitte prüfe den Angebotsentwurf erneut."),
  ).toHaveCount(0);

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  const offerAfter = await readLocalStorageJson(page, "atlas-editable-offer");
  const bindingAfter = await readLocalStorageJson(page, "atlas-editable-offer-analysis-binding");
  const workspaceAfter = await readLocalStorageJson(page, "atlas-offer-workspace");

  expect(analysisAfter).toEqual(analysisBefore);
  expect(contextAfter).toEqual(contextBefore);
  expect(offerAfter).toEqual(offerBefore);
  expect(bindingAfter?.needsReview).not.toBe(true);
  expect(workspaceAfter).toEqual(workspaceBefore);

  await page.goto(`/offers/${workflowIdBefore}`);
  await expect(page.getByText("Geprüft", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angebotstext kopieren" })).toBeVisible();
});

test("ein zweiter Klick auf Analyse erneut starten nach erfolgreicher restored Reanalyse verwendet weiterhin den persistierten Kontext", async ({ page }) => {
  await fillAndAnalyze(page);
  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");

  const firstRequestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  const firstRequest = await firstRequestPromise;
  expect(firstRequest.postDataJSON().inquiry).toBe(contextBefore.text);
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);

  const secondRequestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  const secondRequest = await secondRequestPromise;
  expect(secondRequest.postDataJSON().inquiry).toBe(contextBefore.text);

  await expect(
    page.getByText("Bitte einen Kunden oder Kontakt angeben."),
  ).toHaveCount(0);

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(analysisAfter.workflowId).toBe(workflowIdBefore);
  expect(contextAfter).toEqual(contextBefore);
});

test("Analyse erneut starten nach einer Kundenantwort (ohne Navigation über Today) verwendet weiterhin den kumulativen Kontext", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByText("Wunschtermin")).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(contextBefore.text).toContain("Bitte unser Wohnzimmer streichen.");
  expect(contextBefore.text).toContain("Der Wunschtermin ist Ende des Monats.");

  const requestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON();

  expect(payload.inquiry).toBe(contextBefore.text);
  expect(payload.inquiry).toContain("Neu eingegangene Kundenantwort:");

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  expect(analysisAfter.workflowId).toBe(workflowIdBefore);
});

test("Rückfrage vorbereiten ist während einer laufenden persisted-context Reanalyse ohne vorhandenen Entwurf gesperrt und erzeugt keinen Entwurf", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByText("Wunschtermin")).toBeVisible();

  const prepareButton = page.getByRole("button", { name: "Rückfrage vorbereiten" });
  await expect(prepareButton).toBeEnabled();

  let releaseReanalysisResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReanalysisResponse = resolve;
    });
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Die Analyse ist vorübergehend nicht verfügbar." }),
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByRole("button", { name: "Wird erneut ausgewertet …" }),
  ).toBeDisabled();

  await expect(prepareButton).toBeDisabled();

  // A genuinely disabled native button cannot dispatch a click even when
  // forced, so this proves the draft-creation path is truly blocked, not
  // just visually discouraged.
  await prepareButton.click({ force: true }).catch(() => {});
  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
  expect(await readLocalStorageJson(page, "atlas-clarification-draft")).toBeNull();

  releaseReanalysisResponse();
  await expect(
    page.getByText("Die Analyse ist vorübergehend nicht verfügbar."),
  ).toBeVisible();

  await expect(prepareButton).toBeEnabled();
  await expect(page.getByLabel("Rückfrageentwurf")).toHaveCount(0);
});

test("ein bereits editierter, ungespeicherter Rückfrageentwurf blockiert Analyse erneut starten", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");
  await expect(draft).toBeVisible();

  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft.getByLabel("Nachricht").fill("Geänderter, noch nicht gespeicherter Text.");

  let analyzeRequested = false;
  await page.route("**/api/analyze-inquiry", async (route) => {
    analyzeRequested = true;
    await route.continue();
  });

  const restartButton = page.getByRole("button", { name: "Analyse erneut starten" });
  await expect(restartButton).toBeDisabled();
  await restartButton.click({ force: true }).catch(() => {});
  expect(analyzeRequested).toBe(false);
  await expect(draft.getByLabel("Nachricht")).toHaveValue(
    "Geänderter, noch nicht gespeicherter Text.",
  );

  await draft.getByRole("button", { name: "Änderungen übernehmen" }).click();
  await expect(restartButton).toBeEnabled();
});

test("ein vorhandener Rückfrageentwurf ist während einer laufenden restored Reanalyse nicht editierbar, Kopieren bleibt möglich", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");
  await expect(draft).toBeVisible();

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(draft).toBeVisible();

  let releaseReanalysisResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReanalysisResponse = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: updatedAfterFirstReplyFixture }),
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByRole("button", { name: "Wird erneut ausgewertet …" }),
  ).toBeDisabled();

  await expect(draft).toBeVisible();
  await expect(draft.getByRole("button", { name: "Entwurf bearbeiten" })).toBeDisabled();
  await expect(draft.getByRole("button", { name: "Nachricht kopieren" })).toBeEnabled();

  releaseReanalysisResponse();
  await expect(draft).toHaveCount(0);
});

test("nach fehlgeschlagener restored Reanalyse bleibt der Rückfrageentwurf unverändert und wieder editierbar", async ({ page }) => {
  await fillAndAnalyze(page);
  await page.getByRole("button", { name: "Rückfrage vorbereiten" }).click();
  const draft = page.getByLabel("Rückfrageentwurf");
  await expect(draft).toBeVisible();

  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  const workflowIdBefore = (await readLocalStorageJson(page, "atlas-inquiry-analysis")).workflowId;
  const contextBefore = await readLocalStorageJson(page, "atlas-inquiry-context");

  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<html>Bad Gateway</html>",
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByText("Die Analyse konnte nicht erneut ausgewertet werden."),
  ).toBeVisible();

  await expect(draft).toBeVisible();
  await expect(draft.getByRole("button", { name: "Entwurf bearbeiten" })).toBeEnabled();
  await draft.getByRole("button", { name: "Entwurf bearbeiten" }).click();
  await draft.getByLabel("Nachricht").fill("Weiterhin editierbar.");
  await draft.getByRole("button", { name: "Änderungen übernehmen" }).click();
  await expect(draft.getByText("Weiterhin editierbar.")).toBeVisible();

  const analysisAfter = await readLocalStorageJson(page, "atlas-inquiry-analysis");
  const contextAfter = await readLocalStorageJson(page, "atlas-inquiry-context");
  expect(analysisAfter.workflowId).toBe(workflowIdBefore);
  expect(contextAfter).toEqual(contextBefore);
});

test("Analyse erneut starten ist während einer laufenden Angebotserstellung gesperrt", async ({ page }) => {
  await fillAndAnalyze(page);
  await goToTodayAndApprove(page, inboxAnalysisFixture.recommendedTask.title);
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();

  // Bring the workflow to "current" via a successful restored reanalysis,
  // so restartUsesPersistedContext is true and a later restart would again
  // route through reanalyzePersistedInquiryContext().
  const firstRestartRequestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await firstRestartRequestPromise;
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);

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

  const restartButton = page.getByRole("button", { name: "Analyse erneut starten" });
  await expect(restartButton).toBeDisabled();

  let secondAnalyzeRequested = false;
  await page.route("**/api/analyze-inquiry", async (route) => {
    secondAnalyzeRequested = true;
    await route.continue();
  });
  await restartButton.click({ force: true }).catch(() => {});
  expect(secondAnalyzeRequested).toBe(false);

  releaseOfferResponse();
  await expect(page.getByRole("button", { name: "Angebot wird erstellt ..." })).toHaveCount(0);
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toBeVisible();
  await expect(restartButton).toBeEnabled();

  // Restore a normal fulfilling mock (the route above only proved no
  // request escaped while generation was in flight) before confirming the
  // restart works normally again.
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: updatedAfterSecondReplyFixture }),
    });
  });

  const finalRequestPromise = page.waitForRequest("**/api/analyze-inquiry");
  await restartButton.click();
  await finalRequestPromise;
  await expect(
    page.getByText("Diese Analyse wurde aus dem letzten Vorgang wiederhergestellt."),
  ).toHaveCount(0);
});

test("Erneut versuchen (Angebot) ist während einer laufenden persisted-context Reanalyse gesperrt und löst keinen Request aus", async ({ page }) => {
  await fillAndAnalyze(page);
  const panel = await openReplyPanel(page);
  await panel.getByLabel("Antwort des Kunden").fill("Der Wunschtermin ist Ende des Monats.");
  await panel.getByRole("button", { name: "Antwort auswerten" }).click();
  await expect(panel).toHaveCount(0);

  let generateOfferCallCount = 0;
  await page.route("**/api/generate-offer", async (route) => {
    generateOfferCallCount += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Der Angebotsdienst ist vorübergehend nicht verfügbar.",
      }),
    });
  });

  await page.getByRole("button", { name: "Angebotsentwurf erstellen" }).click();
  await expect(
    page.getByText("Der Angebotsdienst ist vorübergehend nicht verfügbar."),
  ).toBeVisible();
  expect(generateOfferCallCount).toBe(1);

  const retryButton = page.getByRole("button", { name: "Erneut versuchen" });
  await expect(retryButton).toBeEnabled();

  let releaseReanalysisResponse;
  await page.route("**/api/analyze-inquiry", async (route) => {
    await new Promise((resolve) => {
      releaseReanalysisResponse = resolve;
    });
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Die Analyse ist vorübergehend nicht verfügbar." }),
    });
  });

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(
    page.getByRole("button", { name: "Wird erneut ausgewertet …" }),
  ).toBeDisabled();

  await expect(retryButton).toBeDisabled();

  // A genuinely disabled native button cannot dispatch a click even when
  // forced, so this proves the retry path is truly blocked, not just
  // visually discouraged.
  await retryButton.click({ force: true }).catch(() => {});
  expect(generateOfferCallCount).toBe(1);

  releaseReanalysisResponse();
  await expect(
    page.getByText("Die Analyse ist vorübergehend nicht verfügbar."),
  ).toBeVisible();

  await expect(retryButton).toBeEnabled();
  await expect(
    page.getByText("Der Angebotsdienst ist vorübergehend nicht verfügbar."),
  ).toBeVisible();
});
