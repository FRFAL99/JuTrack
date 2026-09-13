# Sync e dati

Come i dati viaggiano fra i telefoni e come escono dall'app. Sezioni estratte da
[STATO.md](../STATO.md), dove erano cresciute insieme alla cronaca.

## Come funziona il sync (Step 10)

Ciclo pull → applica → push, in quest'ordine: al contrario, un dispositivo rimasto offline a lungo
caricherebbe la propria storia prima di conoscere quella dell'altro.

- **Il motore ricorda cosa ha già pubblicato**, come state vector Yjs, e all'avvio manda il delta. È
  la correzione del bug principale: osservare gli update dal vivo cattura solo ciò che si scrive a
  motore acceso, e la persistenza carica il documento prima.
- Lo state vector si registra **solo a coda vuota**. Salvarlo con update ancora in attesa li
  cancellerebbe dal catch-up del prossimo avvio, e sparirebbero senza che nulla lo segnali.
- **Il cursore avanza all'ultimo `seq` visto**, non all'ultimo applicato e mai a `head`: un blob
  illeggibile non deve essere riletto in eterno, ma nemmeno far saltare quelli validi che seguono.
- **Il sonno è interrompibile.** Una modifica locale sveglia il ciclo dopo 400 ms di debounce, così
  una raffica di scritture produce una richiesta sola. In background è sospeso via `AppState`.
- **Il poll è una scala** (Step 16), non un gradino: 2 s subito, 5 s dopo 15 s di inattività, 15 s
  dopo un minuto, 60 s dopo cinque. `markActive()` riporta al gradino stretto **e** sveglia l'attesa
  in corso; lo chiama `useEngineActivity()` dalle sole schermate che mostrano dati condivisi. Le
  vecchie `activePollMs`/`idlePollMs`/`activeWindowMs` restano accettate e vincono se passate. Stima:
  ~400 richieste al giorno contro le ~1.500 di prima.
- **Tre esiti distinti, non uno solo.** `offline` (il relay non è stato raggiunto), `error` (il relay
  ha risposto male, si riprova col backoff), `blocked` (403: la chiave non apre quel vault — il ciclo
  si ferma, perché ritentare darebbe lo stesso esito per sempre).
- **Offline non è un errore del relay** (Step 17). Senza rete la richiesta fallisce **localmente**:
  si riprova dopo `offlineRetryMs` (15 s, mai meno del poll corrente) e **`backoffMs` non si tocca**,
  così una galleria non fa ripartire da capo la progressione maturata contro un relay in difficoltà.
  È anche il sostituto del listener di connettività, che sarebbe un modulo nativo.
- **Lo state vector si riscrive solo se è cambiato** (Step 17), e la cache in memoria si aggiorna
  **dopo** la scrittura riuscita: prima, una scrittura fallita farebbe credere di aver pubblicato ciò
  che non è stato pubblicato, e il catch-up del riavvio salterebbe quel delta.
- **Le scritture della coda sono serializzate** (Step 17), per **connessione** e non per vault: la
  transazione appartiene alla connessione, e cambiando gruppo due `setPending` si sovrappongono.

Un ciclo che riporta `synced` non dimostra che i due lati siano allineati: era vero anche con
entrambi i bug. La prova è vedere il dato comparire sull'altro telefono, in entrambi i versi.

## Saldo, budget e grafici (Step 8)

I calcoli stanno in `packages/core/src/insights/`, mai nei componenti: sono la parte che vale la
pena verificare, e un totale sbagliato non si nota guardando un grafico.

- **Il saldo è cumulativo**, non mensile: un debito non si azzera cambiando pagina del calendario.
  Tutto il resto della schermata Statistiche è invece per mese.
- **I pareggi non toccano le spese**: spostano solo il saldo. `/settle` li registra, anche parziali.
- `simplifyDebts` è greedy ma **stabile**: a parità di importo decide l'id, così i due telefoni
  propongono lo stesso pagamento.
- **Nessun grafico affida l'identità al colore**: ogni barra porta icona, nome e importo. La palette
  delle categorie è stata comunque rivista e validata su entrambi i temi (i due teal originali erano
  indistinguibili). Il seed gira una volta sola: cambiarli dopo il primo avvio reale non sarebbe più
  gratis.
- Nessuna libreria di charting: le barre sono `View`, il QR è l'unico uso di `react-native-svg`.

## Export e backup (Step 9, formato tabellare rifatto allo Step 61)

Due schermate distinte, raggiungibili dalle impostazioni, che fanno cose diverse e non vanno
confuse:

| Schermata               | Cosa produce                                | Cifrato?                     |
| ----------------------- | ------------------------------------------- | ---------------------------- |
| **Esporta i dati**      | Un `.xlsx` a sette fogli, un JSON integrale | **No.** Escono in chiaro     |
| **Backup della chiave** | Un blob `JTBK1.…` con dentro solo la chiave | Sì, con la passphrase scelta |

- **Il foglio di calcolo si legge, il JSON si conserva.** Il `.xlsx` perde struttura (le quote
  diventano colonne) e non è reimportabile; il JSON è integrale, tombstone compresi.
- **Il `.xlsx` è scritto a mano, a zero dipendenze** (`packages/core/src/export/xlsx/`): è uno ZIP
  di XML con le voci **non compresse**, il che evita di dover impacchettare un deflate. Pesa circa
  **980 byte a riga** — misurato, non stimato.
- **Le celle sono tipate**, ed è tutto il punto: le date sono seriali Excel, gli importi numeri col
  formato `#,##0.00`. Non c'è nessuna convenzione di locale da indovinare, quindi sono sparite le
  tre difese che il CSV richiedeva: il BOM UTF-8, la colonna `importo_centesimi` di scorta e il
  disinnesco delle formule. Il perché è nell'[ADR 0004](../adr/0004-l-xlsx-al-posto-del-csv.md), che
  supera la [0003](../adr/0003-formati-di-export.md).
- **Le formule NON si disinnescano, ed è deliberato.** Una cella `t="inlineStr"` non è mai una
  formula per Excel: anteporle un apice, come faceva il CSV, corromperebbe un testo che una persona
  ha scritto. C'è un test che afferma che una nota `=SOMMA(A1:A9)` esce intatta.
- **Sette fogli**: Spese, Pareggi, Categorie, Budget, Persone, Vocabolario e un **Riepilogo** con i
  totali per mese e per categoria, i saldi e i pagamenti minimi. Il Riepilogo **non calcola niente
  per conto proprio** — usa `totalsByMonth`, `totalsByCategory`, `computeBalances` e `simplifyDebts`,
  le stesse funzioni dei grafici, e il foglio Budget chiama `budgetStatuses`. È l'unico modo perché i
  numeri del file e quelli dell'app non possano divergere, e c'è un test che afferma l'invariante:
  **la somma della colonna `importo` di Spese è uguale al totale per mese del Riepilogo**.
- **Il Riepilogo è l'unico foglio senza intestazione**, quindi senza riga congelata e senza filtro:
  le sue colonne non hanno un significato unico per tutta l'altezza (la A è un mese, poi una
  categoria, poi una persona), e un'intestazione mentirebbe su tre quarti del foglio.
- **Le spese cancellate restano fuori** dal `.xlsx`, così selezionare la colonna «importo» dà una
  somma che corrisponde a ciò che l'app mostra. Nel JSON invece ci sono tutte.
- **I timestamp restano testo, le date no.** `createdAt` e compagni sono UTC ed Excel non ha fuso:
  convertirli sposterebbe in silenzio il giorno di una spesa creata dopo le 22:00.
- **Il JSON è alla versione 4** (`EXPORT_FORMAT_VERSION` in `export/json.ts`), e la storia delle
  versioni è scritta lì sopra: la **4** ha `groupName` e `app`, la 3 il `vocabulary`, la 2 `store` e
  `tags`. La regola dello Step 42 non cambia: **le versioni vecchie si leggono, quelle future no** —
  un client vecchio che leggesse a metà un formato nuovo scriverebbe nel documento una versione
  mutilata dei dati, e la sincronizzerebbe.
- **`groupName` e `app` sono metadati, non record**: un valore illeggibile vale `null` e non produce
  né un rifiuto né uno scarto, perché nessuno dei due entra nel documento e il nome si può correggere
  prima di confermare l'import.
- **Dallo Step 64 il file si sceglie**, in `/importa` come in `/backup`: `File.pickFileAsync` di
  `expo-file-system`, che è già nella build. Gli appunti restano come ripiego, perché la build
  nativa installata può essere più vecchia del JavaScript che le arriva via etere — e in quel caso
  il bottone non compare affatto invece di fallire al tocco.
- **Nessun file di export contiene la chiave del vault** — c'è un test che lo verifica.
- **La passphrase del backup è l'unico punto del progetto in cui la sicurezza dipende da una scelta
  umana.** Il campo dà un giudizio (minimo 12 caratteri, si consigliano quattro parole slegate), ma
  è dichiaratamente una euristica, non una misura di entropia.
