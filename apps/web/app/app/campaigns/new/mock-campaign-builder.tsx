"use client";

import { useEffect, useState, type FormEvent } from "react";

type MockProspect = {
  company: string;
  person: string;
  role: string;
  email: string;
  reason: string;
};

const mockProspects: MockProspect[] = [
  {
    company: "Nordica Retail Group",
    person: "Elena Ferri",
    role: "Direttrice Commerciale",
    email: "elena.ferri@nordica.example",
    reason: "Sta ampliando la rete di partner B2B in Italia.",
  },
  {
    company: "FormaLab Industrie",
    person: "Marco De Santis",
    role: "Responsabile Innovazione",
    email: "marco.desantis@formalab.example",
    reason: "Ha pubblicato un progetto di digitalizzazione commerciale.",
  },
  {
    company: "Ventura Growth Partners",
    person: "Sara Conti",
    role: "Investment Manager",
    email: "sara.conti@ventura.example",
    reason: "Investe in società B2B con espansione sul mercato europeo.",
  },
];

const searchStages = [
  "Analisi del posizionamento e del cliente ideale…",
  "Esplorazione di marketplace, ecosistemi e fonti pubbliche…",
  "Verifica dei siti ufficiali e dei decision-maker…",
  "Preparazione delle email personalizzate…",
];

export function MockCampaignBuilder() {
  const [stage, setStage] = useState(-1);
  const [complete, setComplete] = useState(false);
  const [selected, setSelected] = useState(0);
  const [senderName, setSenderName] = useState("Giulia");
  const [productUrl, setProductUrl] = useState("https://acme-software.it");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (stage < 0) return;
    if (stage === searchStages.length) {
      setComplete(true);
      return;
    }
    const timer = window.setTimeout(() => setStage((current) => current + 1), 520);
    return () => window.clearTimeout(timer);
  }, [stage]);

  function runMock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComplete(false);
    setCopied(false);
    setSelected(0);
    setStage(0);
  }

  const prospect = mockProspects[selected];
  const productName = productUrl.replace(/^https?:\/\//, "").split(/[./]/)[0] || "la tua azienda";
  const emailBody = `Ciao ${prospect.person.split(" ")[0]},\n\nho visto che ${prospect.company} ${prospect.reason.toLowerCase()}\n\nCon ${productName} aiutiamo team come il vostro a trasformare il posizionamento online in opportunità commerciali concrete, senza acquistare liste di contatti.\n\nTi andrebbe un confronto di 15 minuti la prossima settimana?\n\nA presto,\n${senderName || "Il tuo nome"}`;

  async function copyMockEmail() {
    await navigator.clipboard?.writeText(`A: ${prospect.email}\nOggetto: Un'idea per ${prospect.company}\n\n${emailBody}`);
    setCopied(true);
  }

  return (
    <>
      <div className="demo-banner" role="status">
        <div>
          <strong>Demo interattiva</strong>
          <span>Prova il flusso senza account. I risultati sono esempi e non viene effettuata alcuna ricerca reale.</span>
        </div>
        <a href="/login">Accedi per risultati reali →</a>
      </div>

      <form onSubmit={runMock} className="card mock-form">
        <div className="eyebrow">1 · Simula analisi e ricerca</div>
        <h2>Scopri come Replo costruisce il tuo go-to-market.</h2>
        <p className="muted">Inserisci dati di prova: la demo simula l&apos;analisi del sito, la ricerca di aziende diverse e la preparazione di un&apos;email completa per ogni decision-maker.</p>
        <label>
          URL del prodotto
          <input value={productUrl} onChange={(event) => setProductUrl(event.target.value)} type="url" required />
        </label>
        <div className="sender-grid">
          <label>
            Il tuo nome
            <input value={senderName} onChange={(event) => setSenderName(event.target.value)} required />
          </label>
          <label>
            Cliente ideale
            <input defaultValue="Direttori commerciali, innovation manager e investitori B2B in Italia" />
          </label>
        </div>
        <button className="btn mint" disabled={stage >= 0 && !complete}>
          {stage >= 0 && !complete ? "Simulazione in corso…" : complete ? "Ripeti la simulazione" : "Avvia la demo"}
        </button>

        {stage >= 0 && (
          <ol className="mock-progress" aria-live="polite">
            {searchStages.map((label, index) => (
              <li className={index < stage || complete ? "done" : index === stage ? "active" : ""} key={label}>
                <span>{index < stage || complete ? "✓" : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}
      </form>

      {complete && (
        <section className="card discovery-card mock-results">
          <div className="row">
            <div>
              <div className="eyebrow">2 · Risultato dimostrativo</div>
              <h2>3 aziende compatibili, una persona per azienda</h2>
            </div>
            <span className="badge">Nessun duplicato</span>
          </div>
          <div className="mock-company-tabs" role="tablist" aria-label="Contatti simulati">
            {mockProspects.map((item, index) => (
              <button
                className={selected === index ? "active" : ""}
                key={item.company}
                onClick={() => { setSelected(index); setCopied(false); }}
                role="tab"
                type="button"
                aria-selected={selected === index}
              >
                <strong>{item.company}</strong>
                <span>{item.person} · {item.role}</span>
              </button>
            ))}
          </div>
          <article className="email-draft mock-email">
            <div className="email-draft-head">
              <div><strong>{prospect.person}</strong><small>{prospect.role} · {prospect.company}</small></div>
              <span className="confidence valid">94% · esempio</span>
            </div>
            <p className="mock-reason"><strong>Perché è compatibile:</strong> {prospect.reason}</p>
            <dl className="email-fields">
              <div><dt>A</dt><dd>{prospect.email}</dd></div>
              <div><dt>Oggetto</dt><dd>Un&apos;idea per {prospect.company}</dd></div>
            </dl>
            <pre className="email-body">{emailBody}</pre>
            <div className="draft-actions">
              <button className="btn secondary" type="button" onClick={copyMockEmail}>{copied ? "Email demo copiata ✓" : "Copia email demo"}</button>
              <a className="btn mint" href="/login">Accedi e cerca contatti reali</a>
            </div>
          </article>
          <p className="demo-disclaimer">Società, persone e indirizzi con dominio <code>.example</code> sono fittizi. Dopo il login Replo usa esclusivamente fonti web pubbliche e siti aziendali ufficiali.</p>
        </section>
      )}
    </>
  );
}
