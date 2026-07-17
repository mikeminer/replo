"use client";

import { useState, type FormEvent } from "react";
import { ReploClient, type DiscoveryResult } from "@replo/sdk";
import { buildEmailDraft } from "./email-draft";

type DiscoveryState = { discovery?: DiscoveryResult; error?: string };
type SenderProfile = { name: string; signature: string; audience: string };

const initialState: DiscoveryState = {};
const initialSender: SenderProfile = { name: "", signature: "", audience: "" };

export function CampaignBuilder() {
  const [state, setState] = useState<DiscoveryState>(initialState);
  const [sender, setSender] = useState<SenderProfile>(initialSender);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  async function runDiscovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState(initialState);
    setCopied(null);
    setCopyError(false);

    const form = new FormData(event.currentTarget);
    const profile = {
      name: String(form.get("senderName") ?? "").trim(),
      signature: String(form.get("senderSignature") ?? "").trim(),
      audience: String(form.get("audience") ?? "").trim(),
    };
    setSender(profile);

    try {
      const discovery = await new ReploClient({ baseUrl: "/api" }).discoverProspects({
        url: String(form.get("url") ?? ""),
        audience: profile.audience || undefined,
        territory: String(form.get("territory") ?? "") || undefined,
        limit: Number(form.get("limit") ?? 12),
      });
      setState({ discovery });
    } catch {
      setState({ error: "Non siamo riusciti a completare la ricerca. Riprova tra poco." });
    } finally {
      setPending(false);
    }
  }

  async function copyText(value: string, key: string) {
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const didCopy = document.execCommand("copy");
      textarea.remove();
      if (didCopy) setCopied(key);
      else setCopyError(true);
    }
  }

  return (
    <>
      <form onSubmit={runDiscovery} className="card">
        <div className="eyebrow">1 · Analizza e trova</div>
        <h2>Parti dal tuo sito, non da una lista di indirizzi.</h2>
        <p className="muted">
          Replo legge il posizionamento, cerca aziende compatibili sul web pubblico e prepara un&apos;email completa per ogni contatto. L&apos;invio resta nella tua casella aziendale.
        </p>
        <label>
          URL del prodotto
          <input name="url" type="url" required placeholder="https://tuosito.it" />
        </label>
        <div className="form-grid">
          <label>
            Cliente ideale (opzionale)
            <input name="audience" placeholder="es. responsabili commerciali in aziende di software B2B" />
          </label>
          <label>
            Territorio
            <input name="territory" defaultValue="Italia" />
          </label>
          <label>
            Contatti
            <select name="limit" defaultValue="12">
              <option>6</option>
              <option>12</option>
              <option>20</option>
              <option>30</option>
            </select>
          </label>
        </div>
        <div className="sender-grid">
          <label>
            Il tuo nome
            <input name="senderName" required placeholder="es. Michele Rossi" />
          </label>
          <label>
            Ruolo e azienda per la firma (opzionale)
            <input name="senderSignature" placeholder="es. Fondatore · Replo" />
          </label>
        </div>
        {state.error && <p className="notice error">{state.error}</p>}
        <button className="btn mint" disabled={pending}>
          {pending ? "Analisi e ricerca in corso…" : "Trova contatti e prepara le email"}
        </button>
      </form>

      {state.discovery && (
        <section className="card discovery-card">
          <div className="row">
            <div>
              <div className="eyebrow">2 · Copia e invia dalla tua casella</div>
              <h2>{state.discovery.prospects.length} email pronte</h2>
            </div>
            <span className="badge">{state.discovery.sourcesScanned} fonti analizzate</span>
          </div>
          <div className="analysis">
            <strong>{state.discovery.analysis.name}</strong>
            <span>{state.discovery.analysis.summary}</span>
            <small>Ricerca: {state.discovery.query}</small>
          </div>

          {state.discovery.prospects.length === 0 ? (
            <p className="notice error">
              {state.discovery.partial
                ? "Una parte delle fonti pubbliche non ha risposto. Replo ha già ampliato automaticamente la ricerca senza chiederti una lista: riprova tra poco."
                : "Replo ha già ampliato automaticamente la ricerca, ma non ha trovato prove pubbliche sufficienti. Non ha inventato nomi o indirizzi."}
            </p>
          ) : (
            <div className="email-list">
              {state.discovery.prospects.map((prospect) => {
                const draft = buildEmailDraft(
                  prospect,
                  state.discovery!.analysis,
                  sender.name,
                  sender.signature,
                  sender.audience,
                );
                const mailto = `mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;

                return (
                  <article className="email-draft" key={`${prospect.email}-${prospect.sourceUrl}`}>
                    <div className="email-draft-head">
                      <div>
                        <strong>{draft.recipientName}</strong>
                        <small>{prospect.role || prospect.companyName} · {prospect.companyName}</small>
                      </div>
                      <span className={`confidence ${prospect.verification}`}>
                        {Math.round(prospect.confidence * 100)}% · {prospect.verification === "valid" ? "pubblicata" : "da verificare"}
                      </span>
                    </div>
                    <dl className="email-fields">
                      <div>
                        <dt>A</dt>
                        <dd>{draft.to}</dd>
                      </div>
                      <div>
                        <dt>Oggetto</dt>
                        <dd>{draft.subject}</dd>
                      </div>
                    </dl>
                    <pre className="email-body">{draft.body}</pre>
                    <div className="draft-actions">
                      <button className="btn mint" type="button" onClick={() => copyText(draft.complete, prospect.email)}>
                        {copied === prospect.email ? "Email copiata ✓" : "Copia email completa"}
                      </button>
                      <button className="btn secondary" type="button" onClick={() => copyText(draft.to, `${prospect.email}:address`)}>
                        {copied === `${prospect.email}:address` ? "Indirizzo copiato ✓" : "Copia indirizzo"}
                      </button>
                      <a className="text-link" href={mailto}>Apri nella mia email ↗</a>
                      <a className="text-link source-link" href={prospect.sourceUrl} target="_blank" rel="noreferrer">Fonte pubblica ↗</a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="clipboard-status" aria-live="polite">
            {copyError
              ? "Il browser ha bloccato gli appunti. Seleziona il testo visibile e copialo manualmente."
              : copied
                ? "Copiato negli appunti. Puoi incollare tutto nella tua casella email."
                : ""}
          </p>
        </section>
      )}
    </>
  );
}
