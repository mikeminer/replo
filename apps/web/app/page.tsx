export default function Home() {
  return (
    <main>
      <section className="hero">
        <div>
          <div className="eyebrow">Ricerca pubblica · email pronte da copiare</div>
          <h1>Trova chi contattare. Scrivi con un nome.</h1>
          <p className="lead">
            Inserisci il tuo sito: Replo capisce cosa vendi, trova contatti rilevanti sul web pubblico e prepara per ciascuno un messaggio completo e personalizzato. Poi lo copi o lo apri nella casella aziendale che usi già.
          </p>
          <p><a className="btn mint" href="/app/campaigns/new">Trova i primi contatti →</a></p>
          <p className="trust-line">Nessuna lista di indirizzi richiesta · Nessun invio dalla piattaforma · Nessun servizio esterno per trovare email</p>
        </div>
        <div className="panel email-preview">
          <div className="row"><span className="badge">Email pronta</span><span className="muted">fonte pubblica verificabile</span></div>
          <dl className="email-fields">
            <div><dt>A</dt><dd>giulia@azienda.it</dd></div>
            <div><dt>Oggetto</dt><dd>Un&apos;idea per Azienda</dd></div>
          </dl>
          <pre className="email-body">{`Ciao Giulia,

ho dato un'occhiata ad Azienda e al tuo lavoro come Responsabile commerciale.

Credo possa esserci un punto d'incontro concreto. Ti va uno scambio di 15 minuti?

Un saluto,
Michele Rossi
Fondatore · Replo`}</pre>
          <div className="draft-actions"><span className="demo-action">Copia email completa</span><span className="text-link">Apri nella mia posta ↗</span></div>
        </div>
      </section>
      <section id="product" className="grid">
        <article className="card"><div className="eyebrow">01 Analizza</div><h2>Capisce il tuo prodotto</h2><p className="muted">Dal sito ricava posizionamento, cliente ideale e angoli di conversazione.</p></article>
        <article className="card"><div className="eyebrow">02 Trova</div><h2>Cerca fonti pubbliche</h2><p className="muted">Individua aziende e contatti pertinenti senza chiederti una lista e senza intermediari di indirizzi email.</p></article>
        <article className="card"><div className="eyebrow">03 Prepara</div><h2>Scrive tutto, nomi inclusi</h2><p className="muted">Destinatario, oggetto, testo personalizzato e la tua firma: un clic per copiare tutto.</p></article>
      </section>
    </main>
  );
}
