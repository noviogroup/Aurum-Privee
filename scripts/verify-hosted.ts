import { spawnSync } from "node:child_process";
import { normalizeHostedBaseUrl } from "@/lib/hosted-verification";

try {
  const baseUrl = normalizeHostedBaseUrl(process.env.PLAYWRIGHT_BASE_URL);
  console.log(`Running hosted release verification against ${baseUrl}`);

  const result = spawnSync("playwright", ["test"], {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
