function getConfiguration() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const syncSecret = process.env.SYNC_SECRET;
  if (!siteUrl || !syncSecret) throw new Error("NEXT_PUBLIC_SITE_URL and SYNC_SECRET are required for inventory cleanup");
  return { siteUrl: new URL(siteUrl).origin, syncSecret };
}

async function handler() {
  const { siteUrl, syncSecret } = getConfiguration();
  const response = await fetch(`${siteUrl}/api/sync/reservations`, {
    method: "POST",
    headers: { authorization: `Bearer ${syncSecret}` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Inventory reservation cleanup failed (${response.status}): ${body.slice(0, 500)}`);
  console.log("Inventory reservation cleanup completed", body.slice(0, 1_000));
  return { statusCode: 200 };
}

module.exports = { handler };
