import { redirect } from "next/navigation";
import Link from "next/link";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { OperationsLoginForm } from "@/components/operations-login-form";
import { hasOperatorSession } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

export default async function OperationsLoginPage() {
  if (await hasOperatorSession()) redirect("/operations");
  return (
    <div className="operations-login-page">
      <section className="operations-login-brand" aria-label="Aurum Privée operations">
        <div className="operations-login-wordmark">AURUM PRIVÉE</div>
        <p>Store operations</p>
      </section>
      <section className="operations-login-panel">
        <div className="operations-login-card">
          <LockKey size={30} weight="thin" />
          <h1>Welcome back.</h1>
          <p>Sign in to manage online orders, customer updates and Loyverse handoff.</p>
          <OperationsLoginForm />
          <Link href="/">Return to storefront</Link>
        </div>
      </section>
    </div>
  );
}
