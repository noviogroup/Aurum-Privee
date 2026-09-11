import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { productsV3, readOnlyVariantsV3 } from "@wix/stores";
import { isConfiguredSecret } from "@/lib/env";

export function createWixVisitorClient(tokens?: Tokens) {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  if (!isConfiguredSecret(clientId)) {
    throw new Error("Wix visitor OAuth is not configured");
  }

  return createClient({
    auth: OAuthStrategy({ clientId, tokens }),
    modules: {
      products: productsV3,
      variants: readOnlyVariantsV3,
      cart: currentCart,
      redirects,
    },
  });
}
