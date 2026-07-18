import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return <main className="login"><a className="brand" href="/">replo<span>.eu</span></a><section className="card stack" style={{marginTop:24}}><div><div className="eyebrow">Replo Business</div><h1>Accedi al tuo account API</h1><p className="muted">Gestisci abbonamento, organizzazioni e chiavi di integrazione.</p></div><AuthForm /></section></main>;
}
