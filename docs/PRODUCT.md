# Product

Replo è un assistente di ricerca e composizione, non un ESP. L'utente inserisce il proprio sito, descrive facoltativamente il buyer ideale e indica una volta il proprio nome/firma. Replo analizza il prodotto, trova contatti da fonti pubbliche e genera per ogni prospect una mail completa con:

- indirizzo del destinatario;
- nome e azienda del destinatario;
- oggetto personalizzato;
- corpo che cita nome, ruolo e contesto rilevante;
- nome e firma del mittente;
- link alla fonte pubblica;
- copia completa in un clic o apertura tramite `mailto:` nel client dell'utente.

La ricerca è progressiva: se il buyer è omesso viene inferito dal sito; fonti editoriali ed elenchi servono solo a raggiungere i domini ufficiali; persone e ruoli vengono letti dalle pagine aziendali. Replo elimina caselle generiche, contenuti demo, etichette scambiate per nomi, fonti directory e aziende senza prova del territorio richiesto. Gli indirizzi pubblicati sono distinti da quelli costruiti con un pattern, sempre marcati “da verificare”.

## Motore multi-canale

Il motore sceglie i canali in base a buyer, settore e territorio, senza chiedere all'utente dove cercare:

| Livello | Fonti | Uso nel motore |
| --- | --- | --- |
| Scoperta aziende | Europages, WLW per DACH, Netcomm, EU-Startups, ICE | Individuare profili aziendali e risalire al sito ufficiale |
| Segnali professionali | pagine azienda XING per DACH, pagine azienda Viadeo per Francia, Startup Europe | Confermare settore, presenza territoriale e maturità; mai estrarre profili personali |
| Community | Developers Italia per PA/open source, Codemotion per tech | Individuare ecosistemi, sponsor e aziende pertinenti; mai trasformare membri della community in una mailing list |
| Validazione | Unioncamere / Registro Imprese | Rafforzare la prova che l'azienda opera nel territorio richiesto |
| Contesto | Osservatori.net, mappa delle community tech italiane | Migliorare tassonomie e lettura del mercato; mai produrre contatti |

Italia, DACH e Francia hanno strategie e prove geografiche distinte. Una directory o un network non può diventare la fonte finale di un prospect: il risultato viene accettato solo dopo aver raggiunto il dominio aziendale e avervi trovato una persona pubblica con ruolo credibile. La risposta API espone i canali attivati, quelli che hanno prodotto risultati intermedi e la policy `official_company_sites_only`; la web app li mostra in italiano accanto ai risultati.

Free espone il flusso completo attuale. Pro è indicato come “in arrivo” e non è acquistabile finché liste salvate, template riutilizzabili, export e collaborazione non saranno effettivamente disponibili. Nessun piano richiede l'invio dalla piattaforma.
