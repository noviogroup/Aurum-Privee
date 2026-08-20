import { redirect } from "next/navigation";
import { OperationsInquiriesConsole } from "@/components/operations-inquiries-console";
import { hasOperatorSession } from "@/lib/operator-session";
import { getOperationsInquiries } from "@/lib/operations-inquiries";

export const dynamic = "force-dynamic";

export default async function OperationsInquiriesPage() {
  if (!await hasOperatorSession()) redirect("/operations/login");
  return <OperationsInquiriesConsole initialInquiries={await getOperationsInquiries()} />;
}
