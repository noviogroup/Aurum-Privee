"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

export function AccountSignOut({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const [working, setWorking] = useState(false);
  async function signOut() {
    setWorking(true);
    const supabase = createBrowserClient(supabaseUrl, publishableKey);
    await supabase.auth.signOut();
    window.location.assign("/account");
  }
  return <button className="text-button" type="button" onClick={signOut} disabled={working}>{working ? "Signing out" : "Sign out"}</button>;
}
