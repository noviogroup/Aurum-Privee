import { getCommerceProvider, type CommerceProvider } from "@/lib/wix-config";

type ProviderEnvironment = {
  [key: string]: string | undefined;
  COMMERCE_PROVIDER?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  OPERATIONS_DEMO_MODE?: string;
};

export function legacyOperationsWritesEnabled(env: ProviderEnvironment = process.env) {
  return legacyCommerceEnabled(env);
}

export function legacyCommerceEnabled(env: ProviderEnvironment = process.env) {
  return getCommerceProvider(env.COMMERCE_PROVIDER) === "legacy";
}

export function localOperationsDemoEnabled(env: ProviderEnvironment = process.env) {
  if (env.OPERATIONS_DEMO_MODE !== "true") return false;
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(env.NEXT_PUBLIC_SITE_URL || "").hostname);
  } catch {
    return false;
  }
}

export function activeCommerceProvider(env: ProviderEnvironment = process.env): CommerceProvider {
  return getCommerceProvider(env.COMMERCE_PROVIDER);
}
