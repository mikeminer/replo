"use client";

import { useState, type FormEvent } from "react";
import { ReploClient } from "@replo/sdk";
import { launch, type DiscoveryState } from "./actions";

const initialState: DiscoveryState = {};

export function CampaignBuilder() {
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  async function runDiscovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setState({});
    const form = new FormData(event.currentTarget);
    try {
      const discovery = await new ReploClient({ baseUrl: "/api" }).discoverProspects({ url: String(form.get("url") ?? ""), audience: String(form.get("audience") ?? "") || undefined, territory: String(form.get("territory") ?? "") || undefined, limit: Number(form.get("limit") ?? 12) });
      setState({ discovery });
    } catch (error) { setState({ error: error instanceof Error ? error.message : "Discovery failed" }); }
    finally { setPending(false); }
  }
  return <>
    <form onSubmit={runDiscovery} className="card">
      <div className="eyebrow">1 · Analyze & source</div>
      <h2>Dimmi solo qual è il tuo sito.</h2>
      <p className="muted">Replo legge il posizionamento, cerca aziende compatibili sul web pubblico e visita le loro pagine team e contatti. Nessuna mailing list richiesta.</p>
      <label>URL del prodotto<input name="url" type="url" required placeholder="https://tuosito.it" /></label>
      <div className="form-grid">
        <label>Buyer ideale (opzionale)<input name="audience" placeholder="es. Head of Sales in SaaS B2B" /></label>
        <label>Territorio<input name="territory" defaultValue="Italia" /></label>
        <label>Numero prospect<select name="limit" defaultValue="12"><option>6</option><option>12</option><option>20</option><option>30</option></select></label>
      </div>
      {state.error && <p className="notice error">{state.error}</p>}
      <button className="btn mint" disabled={pending}>{pending ? "Analisi e ricerca in corso…" : "Trova i prospect"}</button>
    </form>

    {state.discovery && <form action={launch} className="card discovery-card">
      <div className="row"><div><div className="eyebrow">2 · Review & launch</div><h2>{state.discovery.prospects.length} prospect trovati</h2></div><span className="badge">{state.discovery.sourcesScanned} fonti analizzate</span></div>
      <div className="analysis"><strong>{state.discovery.analysis.name}</strong><span>{state.discovery.analysis.summary}</span><small>Ricerca: {state.discovery.query}</small></div>
      {state.discovery.prospects.length === 0 ? <p className="notice error">{state.discovery.partial ? "La discovery pubblica è temporaneamente indisponibile: non serve caricare una mailing list. Riprova tra poco." : "Nessun contatto pubblico affidabile trovato. Specifica meglio il buyer ideale o amplia il territorio."}</p> : <div className="prospects">
        {state.discovery.prospects.map((prospect) => <label className="prospect" key={`${prospect.email}-${prospect.sourceUrl}`}>
          <input type="checkbox" name="prospects" value={JSON.stringify(prospect)} defaultChecked={prospect.verification === "valid"} />
          <span><strong>{prospect.firstName} {prospect.lastName}</strong><small>{prospect.role || prospect.companyName} · {prospect.email}</small><a href={prospect.sourceUrl} target="_blank" rel="noreferrer">Fonte pubblica ↗</a></span>
          <span className={`confidence ${prospect.verification}`}>{Math.round(prospect.confidence * 100)}% · {prospect.verification === "valid" ? "pubblicata" : "risolta"}</span>
        </label>)}
      </div>}
      {state.discovery.prospects.length > 0 && <>
        <label>Nome campagna<input name="name" required defaultValue={`${state.discovery.analysis.name} · ${state.discovery.query.slice(0, 45)}`} /></label>
        <label>Oggetto<input name="subject" required defaultValue="Un'idea concreta per {{company_name}}" /></label>
        <label>Messaggio<textarea name="body" required rows={7} defaultValue={"Ciao {{first_name}},\n\nho visto il lavoro di {{company_name}} e, guardando il vostro posizionamento pubblico, ho pensato a un'idea concreta che potrebbe essere rilevante. Ti va uno scambio rapido?\n\nSe non è pertinente, rispondi unsubscribe."} /></label>
        <label className="consent"><input name="replyLock" value="accepted" type="checkbox" required /> <span>Ho capito che nel piano Free il contenuto delle risposte è bloccato; conteggio e sentiment restano visibili.</span></label>
        <button className="btn mint">Lancia sui prospect selezionati</button>
      </>}
    </form>}
  </>;
}
