const plans = [
  { name: "Startup", price: "7,90", eyebrow: "Per chi lancia un prodotto", features: ["1 API key", "300 chiamate API al mese", "Dashboard, metering e revoca immediata"] },
  { name: "Partner", price: "49,90", eyebrow: "Per prodotti e white label", features: ["1 API key", "Chiamate API illimitate", "White label powered by replo.eu"] },
  { name: "Enterprise", price: "247,90", eyebrow: "Per business acquisition", features: ["API key illimitate", "Etichette personalizzate per ogni chiave", "Chiamate API illimitate"] },
] as const;

export default function PricingPage() {
  return <>
    <header className="shell nav"><a className="brand" href="/">replo<span>.eu</span></a><nav className="navlinks"><a href="/login">Accedi</a></nav></header>
    <main className="shell section">
      <div className="eyebrow">Prezzi API</div>
      <h1>Il motore GTM europeo, dentro il tuo prodotto.</h1>
      <p className="lead pricing-lead">API proprietarie per startup, partner e aziende di business acquisition. Il motore Replo ricerca sul web pubblico senza dipendere da email finder americani.</p>
      <div className="notice sandbox-notice"><strong>Accesso anticipato.</strong> Replo è in testing e viene migliorato ogni giorno. I pagamenti restano in modalità sandbox: nessun addebito reale finché il prodotto non sarà pronto.</div>
      <div className="grid pricing-plans">
        {plans.map((plan) => <article className="card stack" key={plan.name}>
          <div className="eyebrow">{plan.eyebrow}</div><h2>{plan.name}</h2>
          <div className="price">€{plan.price}<small className="muted">/mese</small></div>
          <ul className="muted feature-list">{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <a className="btn" href="/login">Prova {plan.name}</a>
        </article>)}
      </div>
    </main>
  </>;
}
