# Blocker operativo

## Incassi Stripe live

- **Stato:** la fatturazione è implementata e verificata end-to-end in Stripe sandbox, ma l'account disponibile non è ancora abilitato/configurato per incassi live.
- **Evidenza:** il precedente Checkout sandbox, la carta di test, il webhook firmato e il passaggio al piano ora migrato come Partner hanno funzionato; nessun addebito reale è stato effettuato.
- **Sblocco:** completare l'attivazione commerciale/verifica dell'account Stripe live e fornire le credenziali live. Prodotto, prezzo, webhook e variabili dovranno poi essere replicati in modalità live.
- **Impatto:** login, organizzazioni, chiavi, quote e API sono operativi; fino allo sblocco non è possibile monetizzare con addebiti reali.

## Secondo progetto Supabase per replo.it

- **Stato:** bloccato esclusivamente dal limite commerciale del piano gratuito Supabase.
- **Evidenza:** l'account ha già raggiunto il massimo di due progetti gratuiti (`devroulotte` e `Replo Business`). Supabase impedisce la creazione di `Replo App`.
- **Sblocco:** passare l'organizzazione Supabase `Replo` a un piano a pagamento oppure autorizzare esplicitamente la pausa/eliminazione del progetto estraneo `devroulotte`.
- **Impatto:** nessun impatto sul portale business `replo.eu`, sul login condiviso di `replo.it`, sugli abbonamenti Stripe o sulle API `api.replo.eu`. `replo.it` usa lo stesso progetto Auth e una propria organizzazione/chiave server-side; soltanto la separazione in un secondo database Supabase resta sospesa.
