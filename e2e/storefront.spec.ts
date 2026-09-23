import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectNoWcagViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
}

async function expectMinimumTapTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, "tap target should be rendered").not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function expectNoDraftOrFillerCopy(page: Page) {
  const copy = await page.locator("body").innerText();
  expect(copy).not.toMatch(/\b(?:demo|sample|placeholder|lorem ipsum)\b/i);
  expect(copy).not.toMatch(/(?:considered edit|built with intention|created with intention|a thoughtful answer)/i);
}

async function navigate(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator('html[data-hydrated="true"]').waitFor({ state: "attached", timeout: 20_000 });
  return response;
}

test("homepage presents the primary action without layout overflow", async ({ page }) => {
  await navigate(page, "/");

  await expect(page.getByRole("heading", { level: 1, name: "Wholesale fragrance for professional buyers." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse trade catalogue" })).toBeInViewport();
  await expect(page.getByRole("button", { name: /Open bag/ })).toHaveCount(0);
  await expect(page.getByText(/Nassau|The Bahamas|Harbour Island|New Providence/i)).toHaveCount(0);
  if (page.viewportSize()!.width >= 981) {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
  }

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

  await expectNoWcagViolations(page);
  await expectNoDraftOrFillerCopy(page);
});

test("catalog search returns useful results and preserves a stable layout", async ({ page }) => {
  await navigate(page, "/shop");
  const main = page.getByRole("main");
  const shopEditorialImage = main.locator(".shop-stage-picture img");
  await expect(shopEditorialImage).toBeVisible();
  const expectedEditorialSource = page.viewportSize()!.width <= 900
    ? "shop-editorial-popular-v4-mobile.webp"
    : "shop-editorial-popular-v4.webp";
  await expect.poll(
    () => shopEditorialImage.evaluate((image) => (image as HTMLImageElement).currentSrc),
    { timeout: 20_000 },
  ).toContain(expectedEditorialSource);
  await expect(main.getByRole("button", { name: "All fragrances" })).toBeVisible();
  await expect(main.getByRole("button", { name: "Unisex" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Azlan Oud Amber", exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "Azlan Oud Amber Extrait De", exact: true })).toHaveCount(0);
  await expect(main.locator(".product-price")).toHaveCount(0);
  await expect(main.getByRole("option", { name: /Price,/ })).toHaveCount(0);
  if (page.viewportSize()!.width >= 981) {
    const firstProduct = await main.locator(".product-card").first().boundingBox();
    expect(firstProduct, "first product row should be rendered").not.toBeNull();
    expect(firstProduct!.y).toBeLessThan(page.viewportSize()!.height);
  }
  await page.getByLabel("Search the collection").fill("Dior Sauvage");

  const status = main.locator(".catalog-status");
  await expect(status).toContainText("3 fragrances matching “Dior Sauvage”", { timeout: 20_000 });
  await expect(main.getByRole("link", { name: "View Sauvage", exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "View Eau Sauvage", exact: true })).toBeVisible();

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);

  if (page.viewportSize()!.width <= 430) {
    const menuToggle = page.getByRole("button", { name: "Open menu" });
    await expectMinimumTapTarget(menuToggle);
    await expectMinimumTapTarget(page.getByRole("button", { name: "Search fragrances" }));
    await expectMinimumTapTarget(main.locator(".wish-button").first());
    await menuToggle.click();
    const fragranceMenu = page.locator("#fragrance-menu");
    await expect(fragranceMenu).toHaveAttribute("aria-hidden", "false");
    await expectMinimumTapTarget(fragranceMenu.getByRole("link", { name: "Quote list" }));
    await page.getByRole("button", { name: "Close menu" }).click();
  }
});

test("catalog controls recover immediately when pagination is cancelled", async ({ page }) => {
  let markPaginationStarted = () => {};
  let releasePagination = () => {};
  const paginationStarted = new Promise<void>((resolve) => { markPaginationStarted = resolve; });
  const paginationReleased = new Promise<void>((resolve) => { releasePagination = resolve; });

  await page.route("**/api/catalog?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("offset") !== "24") {
      await route.continue();
      return;
    }
    markPaginationStarted();
    await paginationReleased;
    await route.abort("aborted").catch(() => {});
  });

  await navigate(page, "/shop");
  const showMore = page.getByRole("button", { name: "Show more fragrances" });
  await showMore.click();
  await paginationStarted;
  await page.getByRole("group", { name: "Filter by scent family" }).getByRole("button", { name: "All", exact: true }).click();
  await expect(showMore).toBeEnabled();
  await expect(showMore).toHaveText("Show more fragrances");
  releasePagination();
});

test("reviewed retail corrections survive the live Wix catalogue overlay", async ({ page }) => {
  await navigate(page, "/shop/maison-francis-kurkdjian-baccarat-rouge-540-edp-2-4-540-a5076e");
  await expect(page.getByRole("heading", { level: 1, name: "Baccarat Rouge 540" })).toBeVisible();
  await expect(page.getByRole("main").locator(".product-format")).toContainText("Extrait de Parfum");
  await expect(page.getByRole("main").locator(".product-format")).toContainText("2.4 oz");

  await navigate(page, "/shop/paco-robanne-phantom-men-17-edt-sp-ce91b4");
  await expect(page.getByRole("heading", { level: 1, name: "Phantom" })).toBeVisible();
  await expect(page.getByRole("main").locator(".product-format")).toContainText("Eau de Toilette");
  await expect(page.getByRole("main").locator(".product-format")).toContainText("1.7 oz");
});

test("trade catalogue and quote-list product flow behave coherently", async ({ page }) => {
  await navigate(page, "/shop/christian-dior-sauvage-edp-6-8-oz-bb4bf3");

  await expect(page.getByRole("heading", { level: 1, name: "Sauvage" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Choose your edition" })).toContainText("6 options");
  await expect.poll(
    () => page.locator(".product-gallery img").first().evaluate((image) => (image as HTMLImageElement).currentSrc),
    { timeout: 20_000 },
  ).toContain("dior-sauvage");
  await expect(page.locator(".detail-price")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Add Sauvage to bag/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open bag/ })).toHaveCount(0);
  const quoteAction = page.getByRole("button", { name: "Add Sauvage to quote list", exact: true });
  await expect(quoteAction).toBeVisible();
  if (page.viewportSize()!.width >= 981) await expect(quoteAction).toBeInViewport();
  await expect(page.getByRole("region", { name: "Choose your edition" })).not.toContainText("$");

  await quoteAction.click();
  await expect(page.getByRole("button", { name: "Remove Sauvage from quote list" })).toHaveAttribute("aria-pressed", "true");
  await navigate(page, "/quote-list");
  await expect(page.getByRole("heading", { level: 1, name: "Quote list" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Sauvage" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Quantity" })).toHaveValue("1");

  await navigate(page, "/checkout");
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1, name: "Trade fragrance catalogue." })).toBeVisible();
});

test("buyer can submit a structured quote request without price data", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  let submissionAttempts = 0;
  let releaseRequest = () => {};
  const heldRequest = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route("**/api/quote-requests", async (route) => {
    submissionAttempts += 1;
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await heldRequest;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Received", reference: "APQ-DEMO12345" }) });
  });
  await navigate(page, "/shop/christian-dior-sauvage-edp-6-8-oz-bb4bf3");
  await page.getByRole("button", { name: "Add Sauvage to quote list", exact: true }).click();
  await navigate(page, "/quote-list");
  await page.getByRole("spinbutton", { name: "Quantity" }).fill("24");
  await page.getByLabel("Buyer note").fill("Please quote by the case.");
  await page.getByLabel("Company name").fill("Maison Retail Ltd");
  await page.getByLabel("Contact name").fill("Amara Clarke");
  await page.getByLabel("Business email").fill("amara@example.com");
  await page.getByLabel("I agree that Aurum Privée may use these details to prepare and respond to this trade enquiry.").check();
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>(".quote-request-form");
    form?.requestSubmit();
    form?.requestSubmit();
  });
  await expect.poll(() => submissionAttempts).toBe(1);
  releaseRequest();
  await expect(page.getByRole("heading", { level: 1, name: "Your request is with us." })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Your request is with us." })).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByText("Reference APQ-DEMO12345")).toBeVisible();
  expect(submitted).not.toBeNull();
  expect(JSON.stringify(submitted)).not.toContain("price");
  expect((submitted!.lines as Array<{ productId: string; quantity: number; note?: string }>)[0]).toMatchObject({ quantity: 24, note: "Please quote by the case." });
});

test("search dialog rejects malformed catalogue data and restores focus when dismissed", async ({ page }) => {
  await page.route("**/api/catalog?query=*&limit=5&offset=0", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: "invalid", total: 1 }) });
  });
  await navigate(page, "/");
  const trigger = page.getByRole("button", { name: "Search fragrances" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Search Aurum Privée fragrances" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Search by fragrance, brand, note or type")).toBeFocused();
  await page.getByLabel("Search by fragrance, brand, note or type").fill("Dior");
  await expect(dialog.getByRole("alert")).toContainText("Search is temporarily unavailable");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("reduced-motion mode keeps state feedback without spatial animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigate(page, "/");
  const primaryAction = page.getByRole("link", { name: "Browse trade catalogue" });
  const primaryActionMotion = await primaryAction.evaluate((element) => {
    const style = getComputedStyle(element);
    return { animationName: style.animationName, transitionProperty: style.transitionProperty, transitionDuration: style.transitionDuration };
  });
  expect(primaryActionMotion.animationName).toBe("none");
  expect(primaryActionMotion.transitionProperty).toContain("background-color");
  expect(primaryActionMotion.transitionDuration).not.toContain("0.01ms");

  await page.getByRole("button", { name: "Search fragrances" }).click();
  await expect(page.getByRole("dialog", { name: "Search Aurum Privée fragrances" })).toBeVisible();
  await expect(page.locator(".store-search-panel")).toHaveCSS("animation-name", "none");
});

test("an unverified Wix return cannot confirm an order in browse-only mode", async ({ page }) => {
  await navigate(page, "/order/success?provider=wix&orderId=123e4567-e89b-42d3-a456-426614174000");
  await expect(page.getByRole("heading", { level: 1, name: "We are confirming your order." })).toBeVisible();
  await expect(page.getByText("Your fragrance is reserved.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open bag/ })).toHaveCount(0);
});

test("core public pages pass automated WCAG A and AA checks", async ({ page }) => {
  test.slow();
  for (const path of [
    "/shop",
    "/shop/christian-dior-sauvage-edp-6-8-oz-bb4bf3",
    "/contact",
    "/quote-list",
  ]) {
    await navigate(page, path);
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
    await expectNoWcagViolations(page);
    await expectNoDraftOrFillerCopy(page);
  }
});

test("public support routes, redirects and private-page metadata are coherent", async ({ page }) => {
  test.slow();
  for (const path of [
    "/about",
    "/pages/aurum-room",
    "/pages/trade-program",
    "/quote-list",
    "/account",
    "/pages/shipping-returns",
    "/pages/authenticity",
    "/pages/privacy",
    "/pages/terms",
  ]) {
    await navigate(page, path);
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasOverflow).toBe(false);
    await expectNoWcagViolations(page);
    await expectNoDraftOrFillerCopy(page);
  }

  await navigate(page, "/pages/aurum-room");
  const consultationCta = page.getByRole("link", { name: "Request a consultation" }).first();
  await expect(consultationCta).toBeVisible();
  const consultationBox = await consultationCta.boundingBox();
  expect(consultationBox, "consultation action should be rendered").not.toBeNull();
  expect(consultationBox!.y + consultationBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

  await navigate(page, "/pages/about");
  await expect(page).toHaveURL(/\/about$/);
  await navigate(page, "/pages/contact");
  await expect(page).toHaveURL(/\/contact$/);

  await navigate(page, "/account");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await navigate(page, "/checkout");
  await expect(page).toHaveURL(/\/shop$/);

  for (const path of ["/pages/shipping-returns", "/pages/privacy", "/pages/terms"]) {
    await navigate(page, path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("unexpected routes keep a branded and accessible recovery path", async ({ page }) => {
  const response = await navigate(page, "/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse fragrance" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
  await expectNoWcagViolations(page);
});

test("contact and newsletter forms complete their browser-side workflows", async ({ page }) => {
  let contactAttempts = 0;
  let releaseFirstContact = () => {};
  const holdFirstContact = new Promise<void>((resolve) => { releaseFirstContact = resolve; });
  await page.route("**/api/contact", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.postDataJSON()).toMatchObject({
      name: "Amara Clarke",
      email: "amara@example.com",
      topic: "Trade quote help",
    });
    contactAttempts += 1;
    if (contactAttempts === 1) {
      await holdFirstContact;
      await route.fulfill({ status: 504, contentType: "text/html", body: "Gateway timeout" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Your note has been received.", reference: "AP-TEST1234" }) });
  });
  await navigate(page, "/contact");
  await page.getByLabel("Name").fill("Amara Clarke");
  await page.getByLabel("Email", { exact: true }).fill("amara@example.com");
  await page.getByLabel("Your note").fill("I would like help choosing a fresh evening fragrance.");
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>(".contact-form");
    form?.requestSubmit();
    form?.requestSubmit();
  });
  await expect.poll(() => contactAttempts).toBe(1);
  await page.waitForTimeout(50);
  const sameTickContactAttempts = contactAttempts;
  releaseFirstContact();
  expect(sameTickContactAttempts).toBe(1);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your note is still here");
  await expect(page.getByLabel("Your note")).toHaveValue("I would like help choosing a fresh evening fragrance.");
  await expect(page.getByRole("button", { name: "Send your note" })).toBeEnabled();
  await page.getByRole("button", { name: "Send your note" }).click();
  await expect(page.getByRole("status")).toContainText("Reference AP-TEST1234");

  let newsletterAttempts = 0;
  await page.route("**/api/newsletter", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: "amara@example.com" });
    newsletterAttempts += 1;
    if (newsletterAttempts === 1) {
      await route.fulfill({ status: 502, contentType: "text/html", body: "Bad gateway" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Check your inbox to confirm your subscription." }) });
  });
  await navigate(page, "/");
  await page.getByLabel("Email address").fill("amara@example.com");
  await page.getByRole("button", { name: "Join the list" }).click();
  await expect(page.locator(".newsletter-form").getByRole("alert")).toContainText("Your email is still here");
  await expect(page.getByLabel("Email address")).toHaveValue("amara@example.com");
  await expect(page.getByRole("button", { name: "Join the list" })).toBeEnabled();
  await page.getByRole("button", { name: "Join the list" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
});

test("Wix mode safely acknowledges retired commerce webhooks", async ({ request }) => {
  for (const path of ["/api/stripe/webhook", "/api/loyverse/webhook"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: "wix-commerce-active" });
  }
});

test("hosted releases apply the production security policy", async ({ request }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Security headers are added by the Netlify edge on hosted releases.");
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect.soft(headers["x-frame-options"], "X-Frame-Options").toBe("DENY");
  expect.soft(headers["x-content-type-options"], "X-Content-Type-Options").toBe("nosniff");
  expect.soft(headers["referrer-policy"], "Referrer-Policy").toBe("strict-origin-when-cross-origin");
  expect.soft(headers["permissions-policy"], "Permissions-Policy").toContain("camera=()");
  expect.soft(headers["permissions-policy"], "Permissions-Policy").toContain("microphone=()");
  expect.soft(headers["permissions-policy"], "Permissions-Policy").toContain("geolocation=()");
  expect.soft(headers["strict-transport-security"], "Strict-Transport-Security").toContain("max-age=31536000");

  const contentSecurityPolicy = headers["content-security-policy"];
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]) {
    expect.soft(contentSecurityPolicy, `Content-Security-Policy: ${directive}`).toContain(directive);
  }

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  expect.soft(health.headers()["cache-control"], "Public health cache policy").toContain("max-age=30");
  expect.soft(health.headers()["x-robots-tag"], "Public health indexing policy").toContain("noindex");
  expect.soft(health.headers()["x-robots-tag"], "Public health indexing policy").toContain("nofollow");
});
