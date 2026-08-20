import { getOperationsReadiness } from "../lib/operations-integrations";
import { evaluateProductionPreflight } from "../lib/production-preflight";

async function main() {
  process.stdout.write("Aurum Privée production preflight\nRunning secret-safe live integration checks...\n");
  const readiness = await getOperationsReadiness({ live: true });
  const result = evaluateProductionPreflight(readiness);

  for (const service of readiness.services) {
    const marker = service.state === "ready" ? "PASS" : "FAIL";
    process.stdout.write(`\n[${marker}] ${service.name}: ${service.status}\n`);
    for (const fact of service.facts) process.stdout.write(`  ${fact.label}: ${fact.value}\n`);
    for (const requirement of service.requirements) process.stdout.write(`  Required: ${requirement}\n`);
  }

  process.stdout.write(`\nChecked: ${result.checkedAt}\n`);
  if (result.passed) {
    process.stdout.write("PASS: all production integrations are live-verified and checkout is open.\n");
    return;
  }

  process.stderr.write(`FAIL: ${result.failures.length} production readiness area${result.failures.length === 1 ? "" : "s"} remain.\n`);
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`FAIL: production preflight could not complete: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
