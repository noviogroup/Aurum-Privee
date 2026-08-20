function getConfiguration() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const monitorSecret = process.env.HEALTH_MONITOR_SECRET;
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is required for the store health monitor");
  if (!monitorSecret || monitorSecret.length < 32) throw new Error("HEALTH_MONITOR_SECRET must contain at least 32 characters");
  return { siteUrl: new URL(siteUrl).origin, monitorSecret };
}

async function handler() {
  const { siteUrl, monitorSecret } = getConfiguration();
  const response = await fetch(`${siteUrl}/api/health`, {
    headers: { accept: "application/json", authorization: `Bearer ${monitorSecret}` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Store health check unavailable (${response.status}): ${body.slice(0, 500)}`);
  const health = JSON.parse(body);
  if (health.status !== "ok") throw new Error(`Store health degraded: ${body.slice(0, 1_000)}`);
  console.log("Store health check completed", body.slice(0, 1_000));
  return { statusCode: 200 };
}

module.exports = { handler };
