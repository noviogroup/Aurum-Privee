import { evaluateWixReadiness } from "../lib/wix-config";

const result = evaluateWixReadiness(process.env);

console.log(JSON.stringify({
  provider: result.provider,
  configured: result.configured,
  checkoutReady: result.checkoutReady,
  catalogVersion: result.catalogVersion,
  expectedSkuCount: result.expectedSkuCount,
  mappedSkuCount: result.mappedSkuCount,
  checkoutEnabled: result.checkoutEnabled,
  requirements: result.requirements,
}, null, 2));

if (!result.configured) process.exitCode = 1;
