import { redirect } from "next/navigation";
import { OperationsImagesConsole } from "@/components/operations-images-console";
import { getOperationsImageCatalog } from "@/lib/operations-images";
import { hasOperatorSession } from "@/lib/operator-session";
import { getCommerceProvider } from "@/lib/wix-config";

export const dynamic = "force-dynamic";

export default async function OperationsImagesPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  const catalog = await getOperationsImageCatalog();
  return <OperationsImagesConsole commerceProvider={getCommerceProvider(process.env.COMMERCE_PROVIDER)} initialCatalog={catalog} />;
}
