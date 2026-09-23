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
  if (path.startsWith("/shop") && await page.getByRole("button", { name: "Filter & sort", exact: true }).isVisible()) {
    await page.getByRole("button", { name: "Filter & sort", exact: true }).click();
  }
  return response;
}

test("homepage presents the primary action without layout overflow", async ({ page }) => {
  await navigate(page, "/");

  await expect(page.getByRole("heading", { level: 1, name: "Wholesale fragrance for your business." })).toBeVisible();
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
  await page.getByLabel("Search the catalogue").fill("Dior Sauvage");

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

test("the quote-list limit warns without dropping an existing selection", async ({ page }) => {
  await navigate(page, "/shop");
  const addButtons = page.getByRole("button", { name: /^Add .+ to quote list$/ });
  const removeButtons = page.getByRole("button", { name: /^Remove .+ from quote list$/ });
  for (let i = 0; i < 20; i += 1) await addButtons.first().click();
  await expect(removeButtons).toHaveCount(20);
  const before = await page.evaluate(() => localStorage.getItem("aurum-privee-quote-list-v1"));
  await addButtons.first().click();
  await expect(page.getByRole("status").filter({ hasText: "Your list holds up to 20 fragrances" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("aurum-privee-quote-list-v1"))).toBe(before);
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await removeButtons.first().click();
  await expect(removeButtons).toHaveCount(19);
  await addButtons.first().click();
  await expect(removeButtons).toHaveCount(20);
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
  const buyerNote = page.getByLabel("Buyer note");
  await buyerNote.pressSequentially("Please quote by the case.", { delay: 40 });
  await expect(buyerNote).toBeFocused();
  await expect(buyerNote).toHaveValue("Please quote by the case.");
  await page.reload();
  await expect(page.getByRole("spinbutton", { name: "Quantity" })).toHaveValue("24");
  await expect(buyerNote).toHaveValue("Please quote by the case.");
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
  await expect(page.getByText(/Your quote request has been saved/)).toBeVisible();
  await expect(page.getByText(/We have sent an acknowledgement/)).toHaveCount(0);
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
    "/brands",
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
  await expect(page.getByRole("link", { name: "Browse catalogue" })).toBeVisible();
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
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Your message has been received.", reference: "AP-TEST1234" }) });
  });
  await navigate(page, "/contact");
  await page.getByLabel("Name").fill("Amara Clarke");
  await page.getByLabel("Email", { exact: true }).fill("amara@example.com");
  await page.getByLabel("Your message").fill("I would like help selecting fresh fragrances for a retail opening order.");
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
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your message is still here");
  await expect(page.getByLabel("Your message")).toHaveValue("I would like help selecting fresh fragrances for a retail opening order.");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Send message" }).click();
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

test("brand directory links to an exact filter that survives search and refresh", async ({ page }) => {
  await navigate(page, "/brands");
  await page.getByLabel("Find a brand").fill("Tom Ford");
  await expect(page.getByRole("status")).toHaveText("1 brand");
  await page.getByRole("main").getByRole("link", { name: "Tom Ford" }).click();
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("Tom Ford");
  await expect(page.locator(".product-card")).toHaveCount(5);
  await expect(page.locator(".product-card").filter({ hasText: "Noir Extreme by" })).toHaveCount(0);
  await page.getByLabel("Search the catalogue").fill("Noir Extreme");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "View Noir Extreme", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/brand=Tom\+Ford/);
  await page.reload();
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("Tom Ford");
  await expect(page.getByLabel("Search the catalogue")).toHaveValue("Noir Extreme");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("");
  await expect(page.locator(".product-card")).toHaveCount(24);
});

test("brand filtering applies before pagination and combines with audience", async ({ page, request }) => {
  await navigate(page, "/shop?brand=Armaf");
  const cards = page.locator(".product-card");
  await expect(cards).toHaveCount(24);
  await page.getByRole("button", { name: "Show more fragrances" }).click();
  await expect.poll(() => cards.count()).toBeGreaterThan(24);
  const response = await request.get("/api/catalog?brand=Armaf&offset=24&limit=24");
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  expect(result.products.length).toBeGreaterThan(0);
  expect(result.products.every((product: { brand: string }) => product.brand === "Armaf")).toBeTruthy();
  const combined = await request.get("/api/catalog?brand=Tom%20Ford&audience=Unisex&query=Oud");
  const selection = await combined.json();
  expect(selection.products.length).toBeGreaterThan(0);
  expect(selection.products.every((product: { brand: string; audience: string }) => product.brand === "Tom Ford" && product.audience === "Unisex")).toBeTruthy();
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("Armaf");
});

test("quote notes keep spaces across tabs and removing lines never crashes", async ({ page, context }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await navigate(page, "/shop?brand=Tom%20Ford");
  await page.getByRole("button", { name: /^Add .+ to quote list$/ }).first().click();
  await page.getByRole("button", { name: /^Add .+ to quote list$/ }).first().click();
  await navigate(page, "/quote-list");
  await expect(page.locator(".quote-line")).toHaveCount(2);
  const secondTab = await context.newPage();
  secondTab.on("pageerror", (error) => pageErrors.push(error.message));
  await navigate(secondTab, "/quote-list");
  await expect(secondTab.locator(".quote-line")).toHaveCount(2);
  const note = page.getByLabel("Buyer note").first();
  await note.pressSequentially("Please quote by the case. ", { delay: 60 });
  await expect(note).toHaveValue("Please quote by the case. ");
  await expect(note).toBeFocused();
  await expect(secondTab.getByLabel("Buyer note").first()).toHaveValue("Please quote by the case. ");
  await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  await expect(page.locator(".quote-line")).toHaveCount(1);
  await expect(secondTab.locator(".quote-line")).toHaveCount(1);
  await secondTab.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your quote list is empty." })).toBeVisible();
  await expect(secondTab.getByRole("heading", { name: "Your quote list is empty." })).toBeVisible();
  expect(pageErrors).toEqual([]);
  await secondTab.close();
});

test("compact list view preserves filters, paging and quote actions", async ({ page }) => {
  await navigate(page, "/shop?brand=Armaf");
  const cards = page.locator(".product-card");
  await expect(cards).toHaveCount(24);
  await expect(page.getByRole("button", { name: "Grid view", exact: true })).toHaveAttribute("aria-pressed", "true");
  const gridCard = await cards.first().boundingBox();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".product-list .product-card")).toHaveCount(24);
  const listCard = await cards.first().boundingBox();
  expect(listCard!.height).toBeLessThan(gridCard!.height / 2);
  expect(listCard!.height).toBeLessThan(140);
  await expectMinimumTapTarget(page.getByRole("button", { name: "List view", exact: true }));
  await expectMinimumTapTarget(cards.first().getByRole("button"));
  await cards.first().getByRole("button").click();
  await expect(cards.first().getByRole("button")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Show more fragrances" }).click();
  await expect.poll(() => cards.count()).toBeGreaterThan(24);
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("Armaf");
  await page.reload();
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".product-list .product-card")).toHaveCount(24);
  await expect(cards.first().getByRole("button")).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Search the catalogue").fill("Club de Nuit");
  await expect(page.locator(".catalog-status")).toContainText("matching “Club de Nuit”");
  await expect(page.locator(".catalog-status")).not.toContainText("Updating…");
  await expect(page.locator(".product-list")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  await expectNoWcagViolations(page);
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  await expect(page.locator(".product-list")).toHaveCount(0);
  await expect(page.getByLabel("Search the catalogue")).toHaveValue("Club de Nuit");
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("Armaf");
});

test("trade buyers filter editions and set quantities before reviewing a quote", async ({ page }) => {
  await navigate(page, "/shop?brand=Armaf");
  await page.getByLabel("Find a brand", { exact: true }).fill("Armaf");
  await expect(page.getByLabel("Brand", { exact: true }).locator("option")).toHaveCount(2);
  await page.getByLabel("Concentration", { exact: true }).selectOption("Eau de Parfum", { timeout: 10_000 });
  await page.getByLabel("Size", { exact: true }).selectOption("3.4 oz", { timeout: 10_000 });
  await expect(page).toHaveURL(/size=3.4/);
  await expect.poll(async () => page.locator(".catalog-status").textContent()).not.toContain("Updating");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await expect.poll(async () => page.locator(".product-card-info").allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining("3.4 oz · Eau de Parfum")]));
  await page.getByRole("button", { name: "List view", exact: true }).click();
  const first = page.locator(".product-card").first();
  await first.getByRole("spinbutton").fill("12");
  await first.getByRole("button").click();
  const summary = page.getByRole("complementary", { name: "Your quote selection" });
  await expect(summary).toContainText("12 units requested");
  await first.getByRole("spinbutton").fill("24");
  await first.getByRole("spinbutton").press("Tab");
  await expect(summary).toContainText("24 units requested");
  await page.getByRole("button", { name: "Remove Size filter: 3.4 oz", exact: true }).click();
  await expect(page).not.toHaveURL(/size=/);
  await expect(page).toHaveURL(/concentration=Eau/);
  if (page.viewportSize()!.width <= 600) {
    await page.getByRole("button", { name: "Filter & sort", exact: true }).click();
    await expect(page.getByLabel("Size", { exact: true })).toBeHidden();
  }
  await expect(summary).toContainText("24 units requested");
  await expectNoWcagViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  await summary.getByRole("link", { name: "Review quote" }).click();
  await expect(page.locator(".quote-line input[type=number]")).toHaveValue("24");
  await expect(summary).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".quote-line input[type=number]")).toHaveValue("24");
});
