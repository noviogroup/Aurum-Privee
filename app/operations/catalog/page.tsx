import { redirect } from "next/navigation";
import { OperationsCatalogConsole } from "@/components/operations-catalog-console";
import { getOperationsCatalog } from "@/lib/operations-catalog";
import { hasOperatorSession } from "@/lib/operator-session";
import { getCommerceProvider } from "@/lib/wix-config";

export const dynamic = "force-dynamic";

export default async function OperationsCatalogPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  return <OperationsCatalogConsole commerceProvider={getCommerceProvider(process.env.COMMERCE_PROVIDER)} initialCatalog={await getOperationsCatalog()} />;
}
