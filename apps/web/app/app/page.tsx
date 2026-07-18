export default function App() {
  return (
    <main className="dash">
      <aside className="side">
        <b>Area di lavoro</b>
        <a href="/app">Panoramica</a>
        <a href="/app/campaigns/new">Nuova ricerca</a>
        <a href="/app/account">Account e API</a>
        <a href="/pricing">Piani</a>
      </aside>
      <section>
        <div className="row">
          <div><div className="eyebrow">Ricerca contatti</div><h2>Da un sito a una conversazione.</h2></div>
          <a className="btn mint" href="/app/campaigns/new">Nuova ricerca</a>
        </div>
        <div className="grid workspace-grid">
          <article className="card"><span className="muted">Dati iniziali</span><div className="stat">1 URL</div><p>Il tuo sito e, se vuoi, il cliente ideale.</p></article>
          <article className="card"><span className="muted">Risultato</span><div className="stat">Contatti</div><p>Nomi, ruoli, email e fonte pubblica consultabile.</p></article>
          <article className="card"><span className="muted">Invio</span><div className="stat">La tua casella</div><p>Copia l&apos;email completa o aprila nel programma di posta aziendale.</p></article>
        </div>
        <div className="card callout-card">
          <h2>Replo non ti chiede una lista di indirizzi.</h2>
          <p className="muted">Analizza il sito, trova contatti rilevanti e compone messaggi con il nome del destinatario e la tua firma. Non serve configurare alcun servizio di invio.</p>
          <a className="btn" href="/app/campaigns/new">Inizia dal sito →</a>
        </div>
      </section>
    </main>
  );
}
