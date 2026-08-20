function getConfiguration() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const syncSecret = process.env.SYNC_SECRET;
  if (!siteUrl || !syncSecret) throw new Error("NEXT_PUBLIC_SITE_URL and SYNC_SECRET are required for transactional email retries");
  return { siteUrl: new URL(siteUrl).origin, syncSecret };
}

async function handler() {
  const { siteUrl, syncSecret } = getConfiguration();
  const response = await fetch(`${siteUrl}/api/sync/email`, {
    method: "POST",
    headers: { authorization: `Bearer ${syncSecret}`, "content-type": "application/json" },
    body: JSON.stringify({ limit: 25 }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Transactional email retry failed (${response.status}): ${body.slice(0, 500)}`);
  console.log("Transactional email retry completed", body.slice(0, 1_000));
  return { statusCode: 200 };
}

module.exports = { handler };
