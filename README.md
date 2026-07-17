# Replo

Replo trasforma il sito di un prodotto in una lista di prospect motivata e in email personalizzate pronte da copiare. `apps/api` serve `api.replo.eu`; `apps/web` serve `replo.it` e comunica con l'API esclusivamente tramite `@replo/sdk` su HTTP.

Il prodotto non chiede una mailing list e non invia email. Analizza il sito, inferisce il buyer quando serve, amplia in autonomia la ricerca pubblica, risale ai siti ufficiali e seleziona decisori coerenti con ruolo e territorio. Mostra la fonte e prepara per ogni prospect destinatario, nome, azienda, oggetto, corpo e firma del mittente. L'utente copia tutto oppure apre una bozza nel client email aziendale già in uso.

## Local

```bash
corepack pnpm install
docker compose up -d
copy .env.example .env.local
pnpm test
pnpm build
```

## Product boundaries

- Nessun broker o finder email di terze parti.
- Nessun upload obbligatorio di mailing list.
- Nessun invio, warmup, inbox o configurazione ESP nella web app.
- Gli indirizzi derivano da fonti pubbliche o da pattern proprietari esplicitamente marcati come da verificare.
- La fonte pubblica resta visibile accanto a ogni bozza.
- I vecchi adapter provider rimangono nel backend come codice non esposto dal flusso prodotto e non sono una dipendenza per usare Replo.
