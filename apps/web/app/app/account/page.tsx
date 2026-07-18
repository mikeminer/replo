import { getSupabaseAdmin } from "../../../lib/supabase/admin";
import { maskedApiCredential } from "../../../lib/api-credential";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { CredentialForm } from "./credential-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: credential } = await getSupabaseAdmin().from("user_api_credentials")
    .select("key_prefix, last_four, organization_name, organization_plan, verified_at")
    .eq("user_id", user.id).maybeSingle();

  return <main className="dash account-page">
    <aside className="side">
      <b>Area di lavoro</b>
      <a href="/app">Panoramica</a>
      <a href="/app/campaigns/new">Nuova ricerca</a>
      <a href="/app/account">Account e API</a>
    </aside>
    <section>
      <div className="eyebrow">Profilo Replo</div>
      <h2>Account e chiave API</h2>
      <p className="muted">Account: {user.email}. È lo stesso account usato su replo.eu.</p>
      <article className="card credential-card">
        <h2>Collega la tua API Replo</h2>
        <p className="muted">Genera la chiave nel portale business, incollala qui una sola volta e Replo la userà dal server. Nel database viene conservata cifrata con AES-256-GCM.</p>
        <p><a className="text-link" href="https://replo.eu/dashboard" target="_blank" rel="noreferrer">Genera o revoca una chiave su replo.eu ↗</a></p>
        <CredentialForm
          configured={Boolean(credential)}
          maskedKey={credential ? maskedApiCredential(credential.key_prefix, credential.last_four) : undefined}
          organizationName={credential?.organization_name}
          plan={credential?.organization_plan}
        />
      </article>
    </section>
  </main>;
}
