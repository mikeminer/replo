import { maskedApiKey } from "../../lib/api-keys";
import { getSupabaseAdmin } from "../../lib/supabase/admin";
import { requireBusinessContext } from "../../lib/supabase/membership";
import { DashboardActions } from "./dashboard-actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, organization, organizations } = await requireBusinessContext();
  const admin = getSupabaseAdmin();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data: keys }, { count: usage }] = await Promise.all([
    admin.from("api_keys").select("id, name, prefix, last_four, last_used_at, created_at, revoked_at").eq("organization_id", organization.id).is("revoked_at", null).order("created_at", { ascending: false }),
    admin.from("usage_events").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).gte("created_at", monthStart),
  ]);

  return <>
    <header className="shell nav">
      <a className="brand" href="/">replo<span>.eu</span></a>
      <div className="navlinks">
        {organizations.length > 1 && <form action="/api/organizations/select" method="post">
          <select name="organizationId" defaultValue={organization.id}>
            {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="btn secondary" type="submit">Cambia</button>
        </form>}
        <span className="muted">{user.email}</span>
        <form action="/api/auth/signout" method="post"><button className="btn secondary">Esci</button></form>
      </div>
    </header>
    <main className="shell dashboard">
      <div className="dashboard-head">
        <div><div className="eyebrow">Workspace API</div><h1>{organization.name}</h1><p className="muted">{organizations.length} organizzazion{organizations.length === 1 ? "e" : "i"} associate all&apos;account.</p></div>
        <DashboardActions plan={organization.plan} hasCustomer={Boolean(organization.stripe_customer_id)} />
      </div>
      <section className="stats">
        <article className="card stat"><span className="muted">Piano</span><strong>{organization.plan === "pro" ? "API Pro" : "Free"}</strong></article>
        <article className="card stat"><span className="muted">Chiamate questo mese</span><strong>{usage ?? 0}</strong></article>
        <article className="card stat"><span className="muted">Chiavi attive</span><strong>{keys?.length ?? 0}</strong></article>
      </section>
      <section className="two">
        <article className="card">
          <div className="eyebrow">API key</div><h2>Chiavi attive</h2>
          {organization.plan !== "pro" && <p className="notice">L&apos;abbonamento API Pro abilita la creazione di chiavi live.</p>}
          {keys?.length ? keys.map((key) => <div className="key-row" key={key.id}>
            <div><strong>{key.name}</strong><div className="key">{maskedApiKey(key.prefix, key.last_four)}</div><small className="muted">Ultimo uso: {key.last_used_at ? new Date(key.last_used_at).toLocaleString("it-IT") : "mai"}</small></div>
            <DashboardActions compact keyId={key.id} plan={organization.plan} hasCustomer={Boolean(organization.stripe_customer_id)} />
          </div>) : <p className="muted">Nessuna chiave attiva.</p>}
        </article>
        <article className="card stack">
          <div className="eyebrow">Integrazione</div><h2>Endpoint</h2>
          <div className="raw-key">https://api.replo.eu/v1</div>
          <p className="muted">Invia la chiave nell&apos;header <code>Authorization: Bearer …</code>. La revoca è immediata e ogni chiamata genera un evento di utilizzo.</p>
          <a className="btn secondary" href="https://api.replo.eu/v1/openapi.json">Apri OpenAPI</a>
        </article>
      </section>
    </main>
  </>;
}
