"use client";

import { useState, type FormEvent } from "react";

type Props = { configured: boolean; maskedKey?: string; organizationName?: string; plan?: string };
const planLabel = (plan?: string) => ({ startup: "Startup", partner: "Partner", enterprise: "Enterprise", free: "Testing" })[plan ?? ""] ?? "Testing";

export function CredentialForm({ configured, maskedKey, organizationName, plan }: Props) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const apiKey = String(new FormData(event.currentTarget).get("apiKey") ?? "").trim();
    const response = await fetch("/api/account/api-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setMessage(body.error ?? "Non è stato possibile salvare la chiave.");
    else { setMessage("Chiave verificata e salvata."); location.reload(); }
    setPending(false);
  }

  async function remove() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/account/api-key", { method: "DELETE" });
    if (!response.ok) setMessage("Non è stato possibile rimuovere la chiave.");
    else { setMessage("Chiave rimossa."); location.reload(); }
    setPending(false);
  }

  return <div className="credential-stack">
    {configured && <div className="saved-credential">
      <div><div className="eyebrow">Chiave attiva</div><strong className="credential-mask">{maskedKey}</strong></div>
      <div><strong>{organizationName}</strong><div className="muted">Piano {planLabel(plan)}</div></div>
    </div>}
    <form className="account-form" onSubmit={save}>
      <label>{configured ? "Sostituisci la chiave" : "Inserisci la tua API key"}<input required name="apiKey" type="password" autoComplete="off" placeholder="rk_…" /></label>
      <div className="credential-actions">
        <button className="btn mint" disabled={pending}>{pending ? "Verifica…" : "Verifica e salva"}</button>
        {configured && <button className="btn secondary" type="button" disabled={pending} onClick={remove}>Rimuovi</button>}
      </div>
    </form>
    {message && <p className={message.includes("salvata") || message.includes("rimossa") ? "notice" : "notice error"}>{message}</p>}
  </div>;
}
