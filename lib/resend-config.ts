import { isConfiguredSecret } from "@/lib/env";

type Environment = NodeJS.ProcessEnv | Record<string, string | undefined>;

const mailboxPattern = /^[^\s@<>]+@([^\s@<>]+\.[^\s@<>]+)$/i;
const placeholderMailboxPattern = /@(?:example\.(?:com|net|org)|yourdomain\.com)$/i;

export function extractMailbox(value: string | undefined) {
  const trimmed = value?.trim() || "";
  const bracketed = trimmed.match(/<([^<>]+)>$/);
  const mailbox = (bracketed?.[1] || trimmed).trim().toLowerCase();
  return mailboxPattern.test(mailbox) ? mailbox : null;
}

export function resendSenderDomain(value: string | undefined) {
  return extractMailbox(value)?.split("@")[1] || null;
}

export function resendDomainIsConfirmed(env: Environment) {
  return env.RESEND_DOMAIN_VERIFIED?.trim().toLowerCase() === "true";
}

export function isRestrictedResendKeyError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return "name" in error && error.name === "restricted_api_key";
}

export function validateResendConfiguration(env: Environment) {
  const issues: string[] = [];
  const apiKey = env.RESEND_API_KEY;
  const sender = extractMailbox(env.RESEND_FROM_EMAIL);
  const notification = extractMailbox(env.STORE_NOTIFICATION_EMAIL);

  if (!isConfiguredSecret(apiKey) || !apiKey?.startsWith("re_")) issues.push("Provide a valid server-only RESEND_API_KEY.");
  if (!isConfiguredSecret(env.RESEND_FROM_EMAIL) || !sender || placeholderMailboxPattern.test(sender)) {
    issues.push("Set RESEND_FROM_EMAIL to a valid mailbox on the verified sending domain.");
  }
  if (!isConfiguredSecret(env.STORE_NOTIFICATION_EMAIL) || !notification || placeholderMailboxPattern.test(notification)) {
    issues.push("Set STORE_NOTIFICATION_EMAIL to a real monitored inbox.");
  }

  return {
    issues,
    sender,
    senderDomain: sender?.split("@")[1] || null,
    notification,
    domainConfirmed: resendDomainIsConfirmed(env),
  };
}
