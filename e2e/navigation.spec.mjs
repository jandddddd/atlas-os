import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
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
        },
      }),
    });
  });

  await page.route("**/api/generate-offer", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        offer: {
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
        },
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
  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Angebotsentwurf Müller prüfen" })).toHaveCount(0);
});

test("Die zweite weitere Entscheidung wird zur Priorität, ohne die Queue zu verändern", async ({ page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Materialrückfrage vormerken" }).click();

  await expect(
    page.getByRole("heading", { name: "Materialrückfrage für den nächsten Einkauf vormerken" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Angebotsentwurf Müller prüfen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
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
    page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await page.getByRole("button", { name: "Besichtigung Weber einordnen" }).click();

  await expect(
    page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" }),
  ).toBeVisible();

  const decisionCookie = (await context.cookies(page.url())).find(
    (cookie) => cookie.name === "atlas-today-decisions",
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
  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Während der Freigabe bleiben alle Aktionen sichtbar, aber gesperrt", async ({ page }) => {
  await page.goto("/today");
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

  await page.getByRole("button", { name: "Angebot senden" }).click();
  await page.reload();

  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Später entscheiden verschiebt die Priorität ans Ende", async ({ page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Später entscheiden" }).click();

  await expect(page).toHaveURL("/today");
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Die Entscheidung wurde für später eingeordnet.",
  );
  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Angebotsentwurf Müller prüfen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Später entscheiden bleibt nach einem Reload am Ende der Queue", async ({ page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Später entscheiden" }).click();
  await page.reload();

  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Angebotsentwurf Müller prüfen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Beschädigte Cookie-Daten werden ignoriert", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "atlas-today-decisions",
      value: "not-json",
      url: "http://localhost:3000/today",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/today");

  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Ein gültiger Cookie-Zustand wird gelesen", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "atlas-today-decisions",
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

  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Doppelte decisionIds im Cookie behalten die erste gültige Aktion", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "atlas-today-decisions",
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

  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Angebotsentwurf Müller prüfen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Unbekannte IDs und ungültige Aktionen im Cookie werden ignoriert", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "atlas-today-decisions",
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

  await expect(page.getByRole("heading", { name: "Angebot für Familie Müller freigeben und senden" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 5 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Die Freigabe schreibt ausschließlich das kompakte Entscheidungsmodell", async ({ context, page }) => {
  await page.goto("/today");

  await page.getByRole("button", { name: "Angebot senden" }).click();
  await expect(page.getByLabel("Aktueller Abschluss")).toContainText(
    "Angebot für Familie Müller wurde freigegeben.",
  );

  const decisionCookie = (await context.cookies(page.url())).find(
    (cookie) => cookie.name === "atlas-today-decisions",
  );

  expect(decisionCookie).toBeDefined();
  expect(decisionCookie).toMatchObject({
    name: "atlas-today-decisions",
    httpOnly: true,
    sameSite: "Lax",
    path: "/today",
  });

  const persistedState = JSON.parse(decodeURIComponent(decisionCookie.value));

  expect(persistedState).toEqual({
    version: 2,
    decisions: [{ decisionId: "offer-mueller", action: "approve" }],
    decisionOrder: [],
  });
  expect(Object.keys(persistedState.decisions[0]).sort()).toEqual(["action", "decisionId"]);
});

test("Eine bereits erledigte Entscheidung entfernt bei einem stale Submit nicht die nächste", async ({
  context,
  page,
}) => {
  await page.goto("/today");
  await context.addCookies([
    {
      name: "atlas-today-decisions",
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

  await expect(page.getByRole("heading", { name: "Besichtigung Weber als nächsten Schritt einplanen" })).toBeVisible();
  await expect(page.getByText("Atlas hat heute 4 Entscheidungen vorbereitet.")).toBeVisible();
});

test("Details lassen sich öffnen und schließen", async ({ page }) => {
  await page.goto("/today");

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
  await expect(page.getByRole("button", { name: "Anfrage analysieren" })).toBeVisible();
});

test("Lieferantenangebot ist erreichbar und Zurück-Link funktioniert", async ({ page }) => {
  await page.goto("/today/tasks/select-supplier-offer");

  await expect(page.getByRole("heading", { name: "Lieferantenangebot auswählen" })).toBeVisible();

  await page.getByRole("link", { name: "← Zurück zur Tagesübersicht" }).click();

  await expect(page).toHaveURL("/today");
  await expect(page.getByRole("heading", { name: "Guten Morgen." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heute zuerst" })).toBeVisible();
});
