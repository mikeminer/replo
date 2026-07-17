import { CampaignBuilder } from "./campaign-builder";

export default function NewCampaign() {
  return (
    <main className="dash">
      <aside className="side">
        <b>Ricerca contatti</b>
        <a href="/app">← Panoramica</a>
        <span>1. Analisi sito</span>
        <span>2. Ricerca pubblica</span>
        <span>3. Email personalizzate</span>
        <span>4. Copia o apri</span>
      </aside>
      <section>
        <div className="eyebrow">Acquisizione commerciale assistita</div>
        <h1 className="page-title">Dal tuo sito a email già pronte.</h1>
        <p className="lead compact">Replo trova i contatti. Tu mantieni il controllo dell&apos;invio dalla casella che la tua azienda usa già.</p>
        <CampaignBuilder />
      </section>
    </main>
  );
}
