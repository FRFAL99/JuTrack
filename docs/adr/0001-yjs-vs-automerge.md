# ADR 0001 — Yjs invece di Automerge come motore CRDT

- **Data:** 2026-08-01
- **Stato:** Accettata

## Contesto

L'app deve funzionare offline su due dispositivi e riconciliare le modifiche al ritorno online senza
perdere dati e senza chiedere all'utente di risolvere conflitti. Serve un CRDT.

I due candidati maturi in ambito JavaScript sono Automerge e Yjs.

Automerge sarebbe preferibile sul piano della semantica: è progettato attorno a documenti JSON
strutturati, che è esattamente la forma dei nostri record, e offre uno storico delle modifiche più
ricco.

## Decisione

**Yjs.**

## Motivazione

Automerge 2 è implementato in Rust e distribuito come **WebAssembly**. React Native con il motore
Hermes non esegue WASM: servirebbe un binding nativo custom verso `automerge-rs`, da mantenere per
Android e iOS.

Sarebbe una dipendenza nativa fatta in casa sul componente più centrale dell'applicazione — quello da
cui dipende l'integrità dei dati. Il costo di manutenzione e il rischio di rottura a ogni upgrade di
RN non sono giustificati dal vantaggio semantico.

Yjs è **JavaScript puro**. Nessun modulo nativo, nessun WASM, funziona in React Native, in Expo Go e
nel browser con lo stesso codice. È anche documentato da Expo tra le opzioni local-first supportate.

Le proprietà che ci servono davvero le abbiamo comunque: gli update Yjs sono binari, idempotenti e
commutativi, il che rende il protocollo di sync un semplice log append-only con un cursore.

## Conseguenze

**Positive**

- Nessun modulo nativo da mantenere; il progetto resta compatibile con Expo Go in sviluppo.
- Lo stesso `packages/core` girerà sul web senza modifiche.
- Update binari compatti, adatti a essere cifrati e spediti come blob opachi.

**Negative**

- La granularità di merge è quella che modelliamo noi: per ottenere il merge per-campo dobbiamo
  rappresentare ogni record come `Y.Map` annidata, non come oggetto JS piatto. È una disciplina da
  mantenere nello schema.
- Nessuno storico delle revisioni pronto all'uso. Non ci serve in v1.

## Alternative scartate

**Automerge** — semantica migliore, ma il vincolo WASM/Hermes è un blocco reale, non teorico.

**Nessun CRDT, solo last-write-wins su oplog** — considerata seriamente: per due utenti che inseriscono
spese i conflitti veri sono rarissimi, e sarebbe stato più leggero e ispezionabile. Scartata perché
LWW perde silenziosamente dati nel caso di modifica concorrente dello stesso record, ed è esattamente
il caso che si verifica quando entrambi registrano la stessa spesa condivisa.
