import { redirect } from "next/navigation";
import { OperationsQuotesConsole } from "@/components/operations-quotes-console";
import { hasOperatorSession } from "@/lib/operator-session";
import { getOperationsQuoteRequests } from "@/lib/operations-quotes";

export const dynamic = "force-dynamic";

export default async function OperationsQuotesPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  return <OperationsQuotesConsole initialData={await getOperationsQuoteRequests()} />;
}
