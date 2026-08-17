import { expect, test } from "@playwright/test";

const offerFixture = {
  customerName: "Familie Schneider",
  title: "Angebotsentwurf Innenarbeiten",
  projectSummary: "Wohnzimmer und Flur streichen.",
  positions: [],
  assumptions: [],
  missingInformation: ["Genaue Raummaße"],
  recommendedNextStep: "Maße fachlich prüfen.",
  status: "draft",
};

async function storeOffer(page, status) {
  await page.goto("/offers/workflow-project");
  await page.evaluate(({ offer, offerStatus }) => {
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify({
      version: 1,
      offers: [{
        id: "workflow-project",
        workflowId: "workflow-project",
        offer,
        status: offerStatus,
        updatedAt: "2026-08-17T10:00:00.000Z",
      }],
    }));
  }, { offer: offerFixture, offerStatus: status });
  await page.reload();
}

test("a reviewed offer explicitly creates one bound project preparation", async ({ page }) => {
  await storeOffer(page, "reviewed");

  await page.getByRole("button", { name: "Projektentwurf vorbereiten" }).click();
  await expect(page.getByRole("link", { name: "Projektentwurf ansehen" })).toBeVisible();

  const storedWorkspace = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("atlas-project-workspace")),
  );
  expect(storedWorkspace.version).toBe(1);
  expect(storedWorkspace.projects).toHaveLength(1);
  expect(storedWorkspace.projects[0]).toMatchObject({
    id: "workflow-project",
    sourceOfferWorkflowId: "workflow-project",
    customerName: "Familie Schneider",
    title: "Angebotsentwurf Innenarbeiten",
    summary: "Wohnzimmer und Flur streichen.",
    openPoints: ["Genaue Raummaße"],
    status: "preparation",
  });

  await page.reload();
  await expect(page.getByRole("button", { name: "Projektentwurf vorbereiten" })).toHaveCount(0);
  await page.getByRole("link", { name: "Projektentwurf ansehen" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  const project = page.getByRole("article");
  await expect(project).toContainText("Vorbereitung");
  await expect(project).toContainText("Familie Schneider");
  await expect(project).toContainText("1 offene Angabe aus dem Angebot");
  await expect(project).toContainText("Eine Angebotsannahme oder Beauftragung ist nicht erfasst.");
  await expect(project.getByRole("link", { name: "Ursprungsangebot" })).toHaveAttribute(
    "href",
    "/offers/workflow-project",
  );
});

test("an offer awaiting review cannot create a project preparation", async ({ page }) => {
  await storeOffer(page, "review-pending");

  await expect(page.getByText("Vor der Projektvorbereitung muss der Angebotsentwurf geprüft sein.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Projektentwurf vorbereiten" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("atlas-project-workspace"))).toBeNull();
});

test("project preparation revalidates a review changed in another tab", async ({ page }) => {
  await storeOffer(page, "reviewed");
  const prepareButton = page.getByRole("button", { name: "Projektentwurf vorbereiten" });
  await expect(prepareButton).toBeVisible();
  await page.evaluate(() => {
    const workspace = JSON.parse(window.localStorage.getItem("atlas-offer-workspace"));
    workspace.offers[0].status = "review-pending";
    window.localStorage.setItem("atlas-offer-workspace", JSON.stringify(workspace));
  });

  await prepareButton.click();
  await expect(page.getByText("Das Angebot hat sich zwischenzeitlich geändert.", { exact: false })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("atlas-project-workspace"))).toBeNull();
});

test("the projects workspace explains its safe empty state", async ({ page }) => {
  await page.goto("/projects");

  await expect(page.getByRole("heading", { name: "Noch keine Projektentwürfe" })).toBeVisible();
  await expect(page.getByText("Das erfasst noch keine Angebotsannahme und keinen Auftrag.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Zu den Angeboten" })).toHaveAttribute("href", "/offers");
});
