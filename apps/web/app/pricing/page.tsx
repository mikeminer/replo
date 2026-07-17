export default function Pricing() {
  return (
    <main>
      <section className="hero pricing-hero">
        <div><div className="eyebrow">Piani semplici</div><h1>La ricerca parte gratis.</h1><p className="lead">Nessun costo per caselle, riscaldamento o invii: usi l&apos;email aziendale che hai già.</p></div>
      </section>
      <div className="grid pricing-grid">
        <article className="card">
          <h2>Gratis</h2><div className="stat">€0</div>
          <p>Analisi del sito</p><p>Ricerca da fonti pubbliche</p><p>Email complete con nomi e firma</p><p>Copia o apertura nel tuo programma di posta</p>
          <a className="btn mint" href="/app/campaigns/new">Inizia gratis</a>
        </article>
        <article className="card future-plan">
          <span className="badge">In arrivo</span><h2>Professionale</h2><div className="stat">Per gruppi di lavoro</div>
          <p>Più ricerche e liste salvate</p><p>Modelli e tono riutilizzabili</p><p>Esportazione e collaborazione</p><p>Mai invio obbligatorio dalla piattaforma</p>
          <span className="muted">Non ancora acquistabile</span>
        </article>
      </div>
    </main>
  );
}
