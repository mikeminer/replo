"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardActions({ plan, hasCustomer, keyId, compact = false }: { plan: "free" | "pro"; hasCustomer: boolean; keyId?: string; compact?: boolean }) {
  const router = useRouter(), [rawKey, setRawKey] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function request(path: string, init?: RequestInit) { setPending(true); setError(""); const response = await fetch(path, init); const body = await response.json(); setPending(false); if (!response.ok) { setError(body.error ?? "Operazione non riuscita"); return; } if (body.url) location.href = body.url; if (body.apiKey) setRawKey(body.apiKey); router.refresh(); }
  if (keyId) return <div className="stack"><button className="btn danger" disabled={pending} onClick={() => request(`/api/keys/${keyId}`, { method: "DELETE" })}>Revoca</button>{error && <small className="notice error">{error}</small>}</div>;
  return <div className={compact ? "stack" : "actions"}>{plan === "pro" ? <button className="btn" disabled={pending} onClick={() => request("/api/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Production" }) })}>Genera API key</button> : <button className="btn" disabled={pending} onClick={() => request("/api/stripe/checkout", { method: "POST" })}>Passa ad API Pro</button>}{hasCustomer && <button className="btn secondary" disabled={pending} onClick={() => request("/api/stripe/portal", { method: "POST" })}>Gestisci abbonamento</button>}{rawKey && <div className="notice"><strong>Copiala ora: non verrà mostrata di nuovo.</strong><div className="raw-key">{rawKey}</div><button className="btn secondary" onClick={() => navigator.clipboard.writeText(rawKey)}>Copia chiave</button></div>}{error && <div className="notice error">{error}</div>}</div>;
}
