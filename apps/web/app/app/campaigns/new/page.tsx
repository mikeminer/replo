import { CampaignBuilder } from "./campaign-builder";

export default function NewCampaign() {
  return <main className="dash"><aside className="side"><b>Campaign builder</b><a href="/app">← Overview</a><span>1. Analisi sito</span><span>2. Discovery pubblica</span><span>3. Review</span><span>4. Launch</span></aside><section><div className="eyebrow">Autonomous go-to-market</div><h1 style={{ fontSize: 52 }}>Dal tuo sito ai prospect.</h1><CampaignBuilder /></section></main>;
}
