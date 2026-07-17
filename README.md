# Replo

Replo trasforma il sito di un prodotto in una lista di prospect motivata e in email personalizzate pronte da copiare. `apps/api` serve `api.replo.eu`; `apps/web` serve `replo.it` e comunica con l'API esclusivamente tramite `@replo/sdk` su HTTP.

Il prodotto non chiede una mailing list e non invia email. Analizza il sito, inferisce il buyer quando serve e sceglie automaticamente una strategia di ricerca per territorio e settore: Europages/Netcomm/ICE in Italia, WLW/XING aziende nel DACH, Viadeo aziende in Francia, più ecosistemi startup, community e fonti istituzionali quando pertinenti. Directory e network servono solo a raggiungere i siti ufficiali, dove Replo seleziona decisori coerenti con ruolo e territorio. Mostra strategia e fonte finale e prepara per ogni prospect destinatario, nome, azienda, oggetto, corpo e firma del mittente. L'utente copia tutto oppure apre una bozza nel client email aziendale già in uso.

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
- Network professionali e community non vengono usati per raccogliere profili personali o creare mailing list.
- La fonte pubblica resta visibile accanto a ogni bozza.
- I vecchi adapter provider rimangono nel backend come codice non esposto dal flusso prodotto e non sono una dipendenza per usare Replo.
