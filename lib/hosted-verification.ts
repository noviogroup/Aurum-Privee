export function normalizeHostedBaseUrl(rawValue: string | undefined) {
  const raw = rawValue?.trim();
  if (!raw) {
    throw new Error("Set PLAYWRIGHT_BASE_URL to the HTTPS deploy-preview URL before running hosted verification.");
  }

  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("PLAYWRIGHT_BASE_URL must use HTTPS so edge security behavior is tested accurately.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("PLAYWRIGHT_BASE_URL must be a clean deployment origin without credentials, a path, query parameters or a fragment.");
  }

  return url.origin;
}
