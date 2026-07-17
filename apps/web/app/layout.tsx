import "./globals.css";

export const metadata = {
  title: "Replo — Contatti e messaggi personalizzati dal tuo sito",
  description: "Analizza il tuo sito, trova contatti da fonti pubbliche e copia email complete con nomi e firma.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="shell">
          <nav className="nav">
            <a className="brand" href="/">replo.</a>
            <div className="navlinks"><a href="/#product">Come funziona</a><a href="/pricing">Piani</a><a href="/app">Apri app</a></div>
            <a className="btn" href="/app/campaigns/new">Inizia gratis</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
