# ADR 0002 — Y.Doc in memoria come sorgente di verità per la UI

- **Data:** 2026-08-01
- **Stato:** Accettata

## Contesto

Abbiamo due rappresentazioni possibili dei dati sul dispositivo:

1. Il `Y.Doc` di Yjs, che è la struttura su cui avviene il merge.
2. Tabelle SQLite relazionali, interrogabili con SQL.

Tenerle entrambe sincronizzate significa scrivere e mantenere un livello di proiezione da CRDT a
tabelle, con il rischio classico della doppia sorgente di verità: le due divergono e si passa il tempo
a capire quale delle due ha ragione.

## Decisione

La UI legge **esclusivamente dal `Y.Doc` in memoria**. SQLite è il livello di _durabilità_: conserva
il log di update binari di Yjs, non tabelle interrogabili di spese.

Filtri, raggruppamenti e aggregazioni si fanno in JavaScript sui dati in memoria.

## Motivazione

Il volume è piccolo e conoscibile. Due persone che registrano spese generano nell'ordine di qualche
migliaio di record in anni d'uso. Alcune migliaia di oggetti in memoria e un `filter` in JavaScript
sono istantanei; la complessità di un livello di proiezione non comprerebbe nulla di percepibile.

In cambio otteniamo una sola sorgente di verità, reattività immediata (le osservazioni Yjs notificano
la UI senza query intermedie) e nessuna classe di bug da disallineamento.

## Conseguenze

**Positive**

- Una sola rappresentazione dei dati: niente sincronizzazione CRDT ↔ tabelle.
- Aggiornamenti UI reattivi tramite `ydoc.observe`.
- Meno codice, e il codice che non c'è non ha bug.

**Negative**

- L'intero dataset sta in RAM. Accettabile alla scala prevista, non a scale diverse.
- Nessuna query SQL ad hoc: le aggregazioni sono funzioni TypeScript.
- L'avvio richiede di caricare e applicare tutto il log di update. Mitigato dalla compattazione
  periodica in un singolo snapshot.

## Reversibilità

Questa è la ragione per cui la decisione è accettabile: è **reversibile senza toccare né il modello
dati né il protocollo di sync**.

Se il volume crescesse oltre il previsto, si aggiunge un livello di proiezione che osserva il `Y.Doc`
e materializza tabelle SQLite per le query. Il `Y.Doc` resta la sorgente di verità, le tabelle
diventano un indice derivato e ricostruibile.

Il segnale per rivalutare: tempo di avvio percepibile o consumo di memoria che cresce in modo
evidente. Da misurare, non da indovinare.
