"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAID_BUSINESS_PLANS, PLAN_DETAILS, type BusinessPlan, type PaidBusinessPlan } from "../../lib/plans";

type Props = { plan: BusinessPlan; hasCustomer: boolean; activeKeyCount: number; keyId?: string; compact?: boolean };

export function DashboardActions({ plan, hasCustomer, activeKeyCount, keyId, compact = false }: Props) {
  const router = useRouter();
  const [rawKey, setRawKey] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function request(path: string, init?: RequestInit) {
    setPending(true); setError("");
    const response = await fetch(path, init), body = await response.json();
    setPending(false);
    if (!response.ok) { setError(body.error ?? "Operazione non riuscita"); return; }
    if (body.url) location.href = body.url;
    if (body.apiKey) setRawKey(body.apiKey);
    router.refresh();
  }
  function checkout(selectedPlan: PaidBusinessPlan) { return request("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: selectedPlan }) }); }
  function createKey() { return request("/api/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: label }) }); }
  if (keyId) return <div className="stack"><button className="btn danger" disabled={pending} onClick={() => request(`/api/keys/${keyId}`, { method: "DELETE" })}>Revoca</button>{error && <small className="notice error">{error}</small>}</div>;
  const details = PLAN_DETAILS[plan];
  const canCreateKey = plan !== "free" && (details.maxActiveKeys === null || activeKeyCount < details.maxActiveKeys);
  return <div className={compact ? "stack" : "stack plan-actions"}>
    {plan === "free" && <div className="actions">{PAID_BUSINESS_PLANS.map((candidate) => <button className="btn" disabled={pending} key={candidate} onClick={() => checkout(candidate)}>Scegli {PLAN_DETAILS[candidate].label}</button>)}</div>}
    {plan !== "free" && canCreateKey && <div className="actions">{details.customKeyLabels && <input aria-label="Etichetta API key" maxLength={60} onChange={(event) => setLabel(event.target.value)} placeholder="Etichetta, es. Cliente Nord" value={label}/>}<button className="btn" disabled={pending || (details.customKeyLabels && !label.trim())} onClick={createKey}>Genera API key</button></div>}
    {plan !== "free" && !canCreateKey && <div className="notice">Il piano {details.label} consente {details.maxActiveKeys} chiave attiva. Revocala per generarne una nuova.</div>}
    {hasCustomer && <button className="btn secondary" disabled={pending} onClick={() => request("/api/stripe/portal", { method: "POST" })}>Gestisci abbonamento</button>}
    {rawKey && <div className="notice key-reveal"><strong>Copiala ora: non verrà mostrata di nuovo.</strong><div className="raw-key">{rawKey}</div><button className="btn secondary" onClick={() => navigator.clipboard.writeText(rawKey)}>Copia chiave</button></div>}
    {error && <div className="notice error">{error}</div>}
  </div>;
}
