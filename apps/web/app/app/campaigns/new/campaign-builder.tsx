"use client";

import { useState, type FormEvent } from "react";
import { ReploClient, type DiscoveryResult } from "@replo/sdk";
import { buildEmailDraft } from "./email-draft";

type DiscoveryState = { discovery?: DiscoveryResult; error?: string };
type SenderProfile = { name: string; signature: string; audience: string };

const initialState: DiscoveryState = {};
const initialSender: SenderProfile = { name: "", signature: "", audience: "" };
const channelCategoryLabels = { marketplace: "marketplace", ecosystem: "ecosistema", network: "network aziende", community: "community", institutional: "fonte istituzionale" } as const;

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
          Replo capisce chi dovrebbe comprare il prodotto, cerca quelle aziende e i relativi decision-maker sul web pubblico, ed esclude chi vende una soluzione concorrente. Prepara poi un&apos;email completa; l&apos;invio resta nella tua casella aziendale.
        </p>
        <label>
          URL del prodotto
          <input name="url" type="url" required placeholder="https://tuosito.it" />
        </label>
        <div className="form-grid">
          <label>
            Cliente ideale (opzionale: Replo lo deduce dal sito)
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
          {pending ? "Ricerca approfondita in corso…" : "Trova contatti e prepara le email"}
        </button>
        <p className="muted search-timing-note">La ricerca approfondita può richiedere fino a circa un minuto e mezzo: Replo amplia fonti e settori finché trova prove affidabili, senza riempire i risultati con consulenti o concorrenti.</p>
      </form>

      {state.discovery && (
        <section className="card discovery-card">
          <div className="row">
            <div>
              <div className="eyebrow">2 · Copia e invia dalla tua casella</div>
              <h2>{state.discovery.prospects.length} aziende compatibili</h2>
            </div>
            <span className="badge">{state.discovery.sourcesScanned} siti aziendali analizzati</span>
          </div>
          <div className="analysis">
            <strong>{state.discovery.analysis.name}</strong>
            <span>{state.discovery.analysis.summary}</span>
            <small>Buyer cercato: {state.discovery.strategy.buyerProfile.target}</small>
            <small>Decision-maker: {state.discovery.strategy.buyerProfile.decisionMakers}</small>
            <small>Copertura: una persona primaria per azienda, senza account duplicati.</small>
            <small>{state.discovery.strategy.competitorPolicy === "buyer_override" ? "Il target indicato include quel tipo di fornitore: la tua scelta ha la precedenza." : state.discovery.strategy.competitorPolicy === "exclude_competing_vendors" ? "Aziende concorrenti escluse automaticamente." : "Ricerca orientata ai potenziali clienti, non alle aziende simili al prodotto."}</small>
          </div>
          <div className="source-strategy">
            <div className="source-strategy-head">
              <strong>Canali scelti automaticamente</strong>
              <small>Servono a scoprire e qualificare aziende; nome ed email arrivano sempre dal sito ufficiale.</small>
            </div>
            <div className="source-chips">
              {state.discovery.strategy.channels.map((channel) => (
                <span
                  className={`source-chip ${channel.resultsFound ? "hit" : ""}`}
                  key={channel.id}
                  title={channel.resultsFound ? "Ha prodotto risultati intermedi utili" : "Interrogato senza prove sufficienti in questa ricerca"}
                >
                  {channel.label} · {channelCategoryLabels[channel.category]}
                </span>
              ))}
            </div>
            {state.discovery.strategy.contextSources.length > 0 && (
              <small>
                Contesto e tassonomie, mai usati per estrarre contatti: {state.discovery.strategy.contextSources.map((source) => source.label).join(" · ")}.
              </small>
            )}
          </div>

          {state.discovery.prospects.length === 0 ? (
            <p className="notice error">
              {state.discovery.partial
                ? `Una parte delle fonti pubbliche non ha risposto. Replo ha già interrogato ${state.discovery.strategy.channels.map((channel) => channel.label).join(", ") || "i motori pubblici generalisti"} e ampliato la ricerca senza chiederti una lista: riprova tra poco.`
                : `Replo ha già cercato su ${state.discovery.strategy.channels.map((channel) => channel.label).join(", ") || "i motori pubblici generalisti"} e verificato i siti aziendali raggiungibili, ma non ha trovato prove pubbliche sufficienti. Non ha inventato nomi o indirizzi.`}
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
