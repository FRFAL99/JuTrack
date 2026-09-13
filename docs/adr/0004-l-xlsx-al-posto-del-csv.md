# ADR 0004 — Un `.xlsx` scritto a mano al posto del CSV

- **Data:** 2026-09-13
- **Stato:** Accettata
- **Supera:** [ADR 0003](0003-formati-di-export.md), nella parte sul formato tabellare

## Contesto

L'[ADR 0003](0003-formati-di-export.md) ha stabilito due formati di export con due scopi distinti —
**leggere i dati altrove** (CSV) e **conservarli** (JSON) — e ha scelto per il CSV l'RFC 4180 puro:
separatore `,`, decimale `.`, BOM UTF-8 in testa, e una colonna `importo_centesimi` in più come
copia intera e non fraintendibile dell'importo.

Quella decisione aveva già scritto la propria conseguenza negativa:

> Un utente italiano che apra il CSV in Excel con doppio clic vedrà probabilmente tutto in una
> colonna sola, e dovrà usare l'importazione guidata. È il prezzo esplicito della portabilità.

E aveva lasciato aperta una porta, con una condizione:

> Aggiungere in futuro una variante «CSV per Excel italiano» come seconda opzione è un cambiamento
> additivo: cambia il separatore e il decimale, non la struttura. Il segnale per farlo è che aprire
> il file diventi un fastidio ricorrente nell'uso reale — da osservare, non da anticipare.

Il fastidio è stato osservato. Ma la variante italiana non lo toglie: lo **sposta**. Un CSV con `;` e
la virgola decimale si apre bene in un Excel italiano e male in Fogli Google, in `pandas` e in
qualunque strumento non italiano — cioè rompe esattamente ciò che l'ADR 0003 voleva proteggere.
Qualunque CSV costringe a scegliere un lato, perché un CSV non sa dire di che **tipo** è una cella.

## Decisione

Il formato per leggere i dati altrove diventa un **`.xlsx`**, e il CSV **esce dal repo**:
`packages/core/src/export/csv.ts` e il suo test sono cancellati.

Il file ha un foglio per famiglia di record. Le date sono **date** (seriali Excel, `numFmtId="14"`),
gli importi sono **numeri** con formato `#,##0.00`, i testi sono testi.

Il generatore è **scritto a mano, a zero dipendenze**, in `packages/core/src/export/xlsx/`: un
`.xlsx` è uno ZIP di file XML, e le voci dell'archivio usano il metodo **STORE** (compressione 0),
che elimina il bisogno di un compressore.

L'impianto dell'ADR 0003 resta in piedi: **due formati, due scopi, e la schermata lo dice**. Cambia
il formato tabellare, non il fatto che ce ne siano due e che il backup sia uno solo.

## Motivazione

**Perché la cella tipata risolve il problema alla radice.** Il conflitto fra convenzioni di locale
esiste solo finché un numero è scritto come testo e qualcuno deve indovinare dove cade la virgola.
In un `.xlsx` il numero è un numero: `25.00` sta nel file come `<v>25.00</v>` e viene **mostrato**
secondo il locale di chi apre. Non c'è niente da indovinare, quindi non c'è un lato da scegliere.

**Tre difese del CSV cadono, e una sarebbe stata dannosa tenerla.**

- Il **BOM UTF-8** serviva a convincere Excel su Windows della codifica. Qui la codifica è dichiarata
  dentro l'XML, come il formato prescrive.
- La colonna **`importo_centesimi`** era la copia intera dell'importo, da usare se il foglio di
  calcolo avesse frainteso il decimale. Non c'è più niente da fraintendere.
- Il **disinnesco delle formule** (`neutralizeFormula`) anteponeva un apice a una cella che
  cominciasse per `=`, `+`, `-` o `@`, perché il CSV le avrebbe fatte valutare. **In un `.xlsx` una
  cella `t="inlineStr"` non è mai una formula**: lo è solo un elemento `<f>`, e il generatore non ne
  scrive nessuno. Portarsi dietro l'abitudine avrebbe voluto dire anteporre un apice a un testo che
  una persona ha scritto davvero — cioè **corrompere il dato** per difendersi da un rischio che il
  formato ha già chiuso. C'è un test che afferma che una nota `=SOMMA(A1:A9)` esce intatta.

**Perché scritto a mano invece di una libreria.** `packages/core` ha tre dipendenze in tutto
(`@noble/ciphers`, `@noble/hashes`, `yjs`) e `eslint.config.mjs` gli vieta di importare da
`react-native` o da `expo`: è un package puro, e va tenuto tale. Le due candidate costano più di
quanto valgano. **SheetJS** su npm è fermo alla 0.18.5 con una CVE nota — le versioni correnti sono
distribuite solo dal CDN del progetto. **`exceljs`** tira dentro gli stream e `zlib` di Node: è la
stessa famiglia della trappola `lib0`→`isomorphic-webcrypto` dello Step 9, che né `typecheck` né i
test vedevano e che solo `expo export` ha intercettato. Il codice scritto a mano sono ~150 righe
deterministiche, confrontabili byte per byte in un test.

**Perché le voci ZIP non compresse.** DEFLATE richiederebbe un compressore, cioè la dipendenza che si
stava evitando. STORE è un metodo legittimo dello stesso formato: un lettore che apre gli ZIP apre
anche questi. Il prezzo è la dimensione, ed è stato **misurato**, non stimato: circa **980 byte a
riga**, cioè 0,9 MB per mille spese e 4,6 MB per cinquemila.

**Perché le date sono date e i timestamp no.** `date` è un `IsoDate` (`YYYY-MM-DD`) e diventa un
seriale, calcolato con aritmetica intera sui tre campi della stringa — mai costruendo un `Date`, che
in UTC sposterebbe il giorno la notte del cambio d'ora. `createdAt`, `updatedAt` e `deletedAt` sono
invece `IsoTimestamp`, cioè UTC con l'ora: Excel non ha il concetto di fuso, e convertirli
sposterebbe in silenzio il giorno di una spesa creata dopo le 22:00. Restano testo esatto.

**Perché le cancellate restano fuori per default.** Come nel CSV, e qui la ragione è più forte: il
file esiste perché si possa selezionare la colonna «importo» e leggere una somma. Righe cancellate
dentro quella colonna darebbero un totale che non corrisponde a niente che l'app mostri. Il formato
che conserva tutto, tombstone compresi, è il JSON — ed è quello il backup.

## Conseguenze

**Positive**

- Il file si apre con un doppio clic e si somma, in qualunque locale. È ciò che l'export tabellare
  doveva fare fin dallo Step 9.
- **Un file invece di due.** I pareggi erano un file separato perché un CSV è una tabella sola; qui
  sono un foglio, e la ragione per tenerli distinti dalle spese resta soddisfatta senza un secondo
  allegato da non perdere.
- Niente CSV injection da mitigare, quindi nessun testo alterato in uscita.

**Negative**

- **Il file è grande**: ~980 byte a riga contro i ~150 del CSV, perché non è compresso. Si condivide
  lo stesso, ma su decine di migliaia di spese diventerebbe scomodo.
- **Non è più leggibile con `cat`.** Un CSV si ispezionava da terminale; un `.xlsx` va aperto o
  scompattato. Per guardare i dati a occhio resta il JSON, che è indentato apposta.
- **Il generatore è codice nostro**, quindi è nostro anche il compito di stare dentro le pretese di
  Excel — per esempio i due `fill` obbligatori in `styles.xml`, che nessun test di byte scopre.
- Come il CSV prima di lui, **non è reimportabile**. Non è un difetto da correggere: è la conseguenza
  del suo essere appiattito, ed è la stessa conclusione dell'ADR 0003.

## Reversibilità

**La compressione è additiva.** Passare le voci da STORE a DEFLATE cambia due campi
nell'intestazione di ciascuna voce e non tocca il formato del file: chi lo apre non se ne accorge.
Il segnale per farlo è che la dimensione dia fastidio in un caso reale — ora che il numero è
misurato, è una soglia e non un'impressione.

**I fogli sono additivi.** Aggiungerne uno non cambia quelli che ci sono: il file non viene mai
riletto dall'app, quindi non serve versionarlo.

**Il CSV è recuperabile da git** se un giorno servisse per uno strumento che legge solo quello — ma
la condizione per riaprire la questione non è «qualcuno preferisce il CSV»: è «esiste uno strumento
necessario che il `.xlsx` non sa alimentare, e il JSON nemmeno».
