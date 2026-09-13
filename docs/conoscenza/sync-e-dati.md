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

## Export e backup (Step 9)

Due schermate distinte, raggiungibili dalle impostazioni, che fanno cose diverse e non vanno
confuse:

| Schermata               | Cosa produce                                     | Cifrato?                     |
| ----------------------- | ------------------------------------------------ | ---------------------------- |
| **Esporta i dati**      | CSV delle spese, CSV dei pareggi, JSON integrale | **No.** Escono in chiaro     |
| **Backup della chiave** | Un blob `JTBK1.…` con dentro solo la chiave      | Sì, con la passphrase scelta |

- **Il CSV si legge, il JSON si conserva.** Il CSV perde struttura (le quote diventano colonne, i
  budget non ci sono) e non è reimportabile; il JSON è integrale, tombstone compresi.
- **CSV in RFC 4180 puro** (`,` separatore, `.` decimale) più una colonna `importo_centesimi`
  intera: è quella l'autorevole, e nessun locale può fraintenderla. In testa c'è il BOM UTF-8, senza
  il quale Excel su Windows sbaglia le accentate.
- **Le note sono disinnescate contro la CSV injection**: un `=` iniziale verrebbe valutato come
  formula da Excel e da Fogli Google.
- **Nessun file di export contiene la chiave del vault** — c'è un test che lo verifica.
- **La passphrase del backup è l'unico punto del progetto in cui la sicurezza dipende da una scelta
  umana.** Il campo dà un giudizio (minimo 12 caratteri, si consigliano quattro parole slegate), ma
  è dichiaratamente una euristica, non una misura di entropia.
