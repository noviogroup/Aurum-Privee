import { redirect } from "next/navigation";
import { OperationsImagesConsole } from "@/components/operations-images-console";
import { getOperationsImageCatalog } from "@/lib/operations-images";
import { hasOperatorSession } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

export default async function OperationsImagesPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  const catalog = await getOperationsImageCatalog();
  return <OperationsImagesConsole initialCatalog={catalog} />;
}

