import { Resend } from "resend";
import {
  isRestrictedResendKeyError,
  validateResendConfiguration,
} from "../lib/resend-config";

async function main() {
  const configuration = validateResendConfiguration(process.env);
  process.stdout.write("Aurum Privée Resend preflight\nNo email will be sent.\n\n");

  process.stdout.write(`Sender: ${configuration.sender || "not configured"}\n`);
  process.stdout.write(`Notification inbox: ${configuration.notification || "not configured"}\n`);
  process.stdout.write(`Dashboard verification confirmed: ${configuration.domainConfirmed ? "yes" : "no"}\n`);

  if (configuration.issues.length) {
    for (const issue of configuration.issues) process.stderr.write(`FAIL: ${issue}\n`);
    process.exitCode = 1;
    return;
  }

  const response = await new Resend(process.env.RESEND_API_KEY).domains.list();
  if (response.error) {
    if (isRestrictedResendKeyError(response.error)) {
      process.stdout.write("PASS: Resend accepted a least-privilege Sending access key.\n");
      if (!configuration.domainConfirmed) {
        process.stderr.write("FAIL: Confirm the domain is verified in Resend, then set RESEND_DOMAIN_VERIFIED=true.\n");
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`PASS: ${configuration.senderDomain} is recorded as verified by the operator.\n`);
      return;
    }
    throw new Error(`${response.error.name}: ${response.error.message}`);
  }

  const domain = response.data?.data?.find((entry) => entry.name.toLowerCase() === configuration.senderDomain);
  if (!domain) {
    process.stderr.write(`FAIL: ${configuration.senderDomain} was not found in the connected Resend account.\n`);
    process.exitCode = 1;
    return;
  }
  if (domain.status !== "verified") {
    process.stderr.write(`FAIL: ${configuration.senderDomain} is ${domain.status}, not verified.\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write("PASS: Resend API is reachable.\n");
  process.stdout.write(`PASS: ${configuration.senderDomain} is verified for sending.\n`);
}

main().catch((error) => {
  process.stderr.write(`FAIL: ${error instanceof Error ? error.message : "Resend preflight could not complete"}\n`);
  process.exitCode = 1;
});
