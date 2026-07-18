import Image from "next/image";
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
            <a className="brand" href="/" aria-label="Replo — pagina iniziale">
              <span className="brand-mark" aria-hidden="true"><Image src="/brand/replo-light.jpg" alt="" width={768} height={1152} priority /></span>
              <span>Replo</span>
            </a>
            <div className="navlinks"><a href="/#product">Come funziona</a><a href="/pricing">Piani</a><a href="/app">Apri app</a></div>
            <a className="btn" href="/login">Accedi</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
