import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analyze-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
          customer: "Familie Schneider",
          location: "Mannheim",
          workSummary: "Wohnzimmer, Esszimmer und Flur streichen",
          urgency: "normal",
          missingInformation: ["Bilder", "genaue Raummaße"],
          nextSteps: ["Besichtigung abstimmen"],
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
          title: "Angebotsentwurf Familie Schneider",
          intro: "Vielen Dank für Ihre Anfrage.",
          positions: [
            {
              title: "Malerarbeiten",
              description: "Streichen der angefragten Räume als Entwurf.",
              quantity: "1",
              unitPrice: "0,00 €",
              total: "0,00 €",
            },
          ],
          total: "0,00 €",
          notes: ["Testdaten ohne API-Kosten."],
        },
      }),
    });
  });
});

test("Startseite ist erreichbar", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ATLAS" })).toBeVisible();
  await expect(page.getByText("Atlas erstellt Angebotsentwürfe")).toBeVisible();
});

test("Today-Seite ist erreichbar", async ({ page }) => {
  await page.goto("/today");

  await expect(page.getByRole("heading", { name: /Guten Morgen, Jan/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heute zuerst" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /Guten Morgen, Jan/ })).toBeVisible();
});
