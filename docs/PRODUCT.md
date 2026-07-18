# Product

Replo è un assistente di ricerca e composizione, non un ESP. L'utente inserisce il proprio sito, descrive facoltativamente il buyer ideale e indica una volta il proprio nome/firma. Replo analizza il prodotto, trova contatti da fonti pubbliche e genera per ogni prospect una mail completa con:

- indirizzo del destinatario;
- nome e azienda del destinatario;
- oggetto personalizzato;
- corpo che cita nome, ruolo e contesto rilevante;
- nome e firma del mittente;
- link alla fonte pubblica;
- copia completa in un clic o apertura tramite `mailto:` nel client dell'utente.

La ricerca è progressiva: se il buyer è omesso viene inferito dal sito; fonti editoriali ed elenchi servono solo a raggiungere i domini ufficiali; persone e ruoli vengono letti dalle pagine aziendali. Replo separa sempre ciò che il sito vende da chi potrebbe comprarlo: per un prodotto di outbound, per esempio, cerca aziende B2B in crescita o in espansione e i loro responsabili commerciali, non piattaforme di lead generation, consulenti commerciali o fornitori di sales training/coaching. Replo elimina caselle generiche, titoli di reparto scambiati per persone, contenuti demo, testimonial/clienti scambiati per dipendenti, pagine team indovinate che in realtà duplicano la home, fonti directory, aziende concorrenti e aziende senza prova forte del territorio richiesto. Una voce “Italy” in un selettore globale non basta: servono dominio coerente, sede operativa, prefisso telefonico o identità legale locale. Un indirizzo costruito per pattern è ammesso soltanto quando la persona compare su una vera pagina identitaria/team del dominio; altrove serve un indirizzo realmente pubblicato e coerente con il dominio.

## Buyer, non competitor

L'inferenza produce tre elementi distinti: profilo dell'azienda cliente, ruoli dei decision-maker e segnali di bisogno (crescita, nuovi mercati, assunzioni, digitalizzazione o altri trigger coerenti con il prodotto). Le query usano questi elementi lato buyer invece delle keyword che descrivono la categoria del venditore. Prima di estrarre persone ed email dal sito ufficiale, il motore applica inoltre un fingerprint di offerta: un'azienda che si presenta come fornitore della stessa soluzione o come agenzia/consulenza che vende lo stesso risultato viene esclusa. Se l'utente dichiara esplicitamente che quella categoria di fornitori è il proprio cliente ideale, l'indicazione ha la precedenza e il filtro viene disattivato per quel caso.

La risposta API e la web app rendono visibili il buyer cercato, i ruoli decisionali e la policy applicata (`exclude_competing_vendors`, `buyer_override` o `not_applicable`), così l'interpretazione del sito è verificabile prima di usare le email.

## Aziende prima delle email

Il risultato è account-first: Replo continua la scansione in base al numero di aziende qualificate, non al numero grezzo di indirizzi trovati. Dopo il ranking dei ruoli seleziona una sola persona primaria per dominio aziendale. Se trova due aziende affidabili mostra due aziende, anche quando il limite richiesto è sei; non completa artificialmente la lista con altre quattro persone degli stessi account. Eventuali stakeholder secondari richiederanno un flusso separato di account mapping e non vengono mescolati alla lista go-to-market.

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

Il budget di ricerca è adattivo: cresce da circa 63.5 a 90 secondi in base al numero di aziende richiesto. Il motore può espandere fino a 36 fonti-ponte; le fonti lente hanno un limite individuale, mentre i siti aziendali vengono verificati in gruppi controllati fino a un massimo di 54 domini. Query dirette su pagine `/team`, `/chi-siamo` e `/azienda` cercano ruoli commerciali dentro aziende operative; termini negativi riducono agenzie e consulenze già nella fase di reperimento, mentre il fingerprint le ricontrolla sul sito ufficiale. Il client attende fino a 95 secondi, così una singola fonte bloccata non tronca la ricerca.

Free espone il flusso completo attuale. Pro è indicato come “in arrivo” e non è acquistabile finché liste salvate, template riutilizzabili, export e collaborazione non saranno effettivamente disponibili. Nessun piano richiede l'invio dalla piattaforma.
