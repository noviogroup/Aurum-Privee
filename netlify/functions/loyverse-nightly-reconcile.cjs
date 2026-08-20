function getConfiguration() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const syncSecret = process.env.SYNC_SECRET;
  if (!siteUrl || !syncSecret) throw new Error("NEXT_PUBLIC_SITE_URL and SYNC_SECRET are required for Loyverse reconciliation");
  return { siteUrl: new URL(siteUrl).origin, syncSecret };
}

async function handler() {
  const { siteUrl, syncSecret } = getConfiguration();
  const response = await fetch(`${siteUrl}/api/sync/loyverse`, {
    method: "POST",
    headers: { authorization: `Bearer ${syncSecret}` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Nightly Loyverse reconciliation failed (${response.status}): ${body.slice(0, 500)}`);
  console.log("Loyverse nightly reconciliation completed", body.slice(0, 1_000));
  return { statusCode: 200 };
}

module.exports = { handler };
