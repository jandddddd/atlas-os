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
