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
  await expect(
    page.getByRole("heading", { name: "Analyse abgeschlossen" }),
  ).toBeVisible();

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

  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
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

test("Eine erfolgreiche Ersatzanalyse entfernt den alten Angebotsentwurf dauerhaft", async ({ page }) => {
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
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toHaveCount(0);
  await expect.poll(
    () => page.evaluate(() => window.localStorage.getItem("atlas-editable-offer")),
  ).toBeNull();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Analyse abgeschlossen" })).toBeVisible();
  await expect(page.getByText("Angebotsentwurf Familie Schneider", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Angebotsentwurf erstellen" })).toBeDisabled();
});

test("Eine fehlgeschlagene Ersatzanalyse erhält den vorherigen persistenten Vorgang", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(({ analysis, offer }) => {
    window.localStorage.setItem("atlas-inquiry-analysis", JSON.stringify(analysis));
    window.localStorage.setItem("atlas-editable-offer", JSON.stringify(offer));
  }, { analysis: inboxAnalysisFixture, offer: inboxOfferFixture });
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Analyse B fehlgeschlagen." }),
    });
  });
  await page.goto("/inbox");
  await fillInboxInquiry(page, {
    customer: "Familie B",
    message: "Bitte das Schlafzimmer streichen.",
  });
  await page.getByRole("button", { name: "Analyse erneut starten" }).click();
  await expect(page.getByText("Analyse B fehlgeschlagen.")).toBeVisible();

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
