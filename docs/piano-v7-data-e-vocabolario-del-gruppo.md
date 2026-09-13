# JuTrack — Piano v7: la data si sceglie, tag e negozi diventano un elenco

> Punto d'ingresso del progetto: [STATO.md](STATO.md). Questo piano **non viene da un mockup**, a
> differenza del [v6](piano-v6-spesa-rapida-e-grafici-componibili.md): viene dall'app in mano, come
> gli Step 54–57. Tre richieste su «Nuova spesa» e sulla gestione del gruppo, più un check del
> codice fatto a freddo su tutto il repo.
>
> **Piano scritto il 13 settembre 2026, nessuno step ancora nel codice.** La numerazione prosegue
> da 57: **Step 58, 59 e 60**, uno per sessione.
>
> **Ogni misura e ogni riferimento qui sotto è stato letto nel codice**, non dedotto. È la regola
> operativa nata dagli errori del piano v6, che aveva sbagliato il perché e il quanto su tre
> decisioni su quindici.

## Contesto

Tre problemi, tutti in «Nuova spesa» e nella sua sezione «Dettagli».

1. **La data è ferma su «oggi» e non si può cambiare.** Una spesa che non si registra la sera
   stessa entra col giorno sbagliato, e non c'è modo di correggerla nemmeno riaprendola.
2. **I tag si riscrivono a mano ogni volta.** Non esiste un elenco: esiste un campo di testo con
   dei suggerimenti derivati da ciò che è già stato scritto.
3. **Il negozio è lo stesso campo di testo**, e i grafici per negozio ne dipendono. Una casella in
   cui si digita è il modo più rapido per trasformare «top negozi» in una classifica di refusi.

Il secondo e il terzo sono **lo stesso problema**, e questo piano li risolve con un meccanismo solo.

## La cosa che il codice sapeva già (decisione 0)

**Decisione.** Non entra alcun modulo nativo, e nessuno dei tre step chiede una build EAS.

**Perché.** Il commento in
[`ExpenseForm.tsx:565-569`](../apps/mobile/src/features/expenses/ExpenseForm.tsx#L565-L569) motiva
la data non modificabile così: _«un selettore vuole un modulo nativo
(`@react-native-community/datetimepicker`), quindi una build EAS nuova»_. **Quella motivazione non
è più vera, ed è il codice stesso a dirlo.** Lo Step 27 ha prodotto
[`DayGridPicker.tsx`](../apps/mobile/src/features/stats/filters/DayGridPicker.tsx), che nel proprio
commento (righe 22-33) scrive:

> «**Nessun modulo nativo, quindi nessuna build EAS.** […] Qui bastano quarantadue `Pressable` e
> l'aritmetica sui giorni che `calendar.ts` ha già — ed è per questo che **questo componente resta
> la base da cui rendere modificabile un giorno la data della spesa**.»

È la settima volta che il progetto rifiuta un modulo nativo per un gesto — dopo il foglio dei
gruppi, il selettore di date, la griglia dei giorni, il riordino della dashboard, il tastierino e i
capitoli dei grafici. Conseguenza pratica: **tutti e tre gli step arrivano al telefono in test
chiuso via etere**, senza consumare una delle quindici build del mese e senza passare dalla
revisione del Play Store.

Vale la regola di [versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md): **`version` in
`app.json` resta invariata**, perché entra nell'impronta della `runtimeVersion` e alzarla
impedirebbe all'aggiornamento di arrivare, in silenzio.

---

## Le decisioni

### 1 · La data si sceglie su una griglia, non su una tendina

**Decisione.** La riga di sola lettura dei «Dettagli» diventa premibile e apre una griglia del mese
**in linea**, dentro il gruppo già aperto. Sopra la griglia, due pillole «Oggi» e «Ieri».

**Perché.** Nove volte su dieci la risposta è una delle due pillole, e chi tocca «Ieri» non deve
attraversare un calendario per arrivarci. La griglia è per il decimo caso. In linea e non in un
`Modal` perché il gruppo apribile **è già** il contenitore che serve: un foglio dentro un gruppo
aperto sarebbe un secondo livello per la stessa domanda.

### 2 · La griglia è una sola, condivisa fra filtri e spesa

**Decisione.** Nasce `components/MonthGrid.tsx`: intestazione col mese e le due frecce, sette
colonne, i vuoti in testa, le celle. **Non sa cosa sia un intervallo** — delega l'aspetto a
`stateOf(date) => 'edge' | 'inside' | 'none'` e l'azione a `onPress`. `DayGridPicker` diventa un
involucro che tiene solo le regole dell'intervallo a due tocchi; `features/expenses/DayPicker.tsx`
è il secondo involucro, per un giorno solo.

**Perché.** Due griglie da quarantadue celle che si assomigliano divergono al primo che ne tocca
una: è esattamente ciò che è successo a `tidy()`, riscritto a mano in quattro punti, e ciò che
`mostUsedSpelling` è stata esportata per evitare (commento in `naming.ts:108-115`). Sta in
`components/` e non sotto `features/stats/` perché da questo passo ha due chiamanti in due
funzionalità diverse.

**Vincolo.** `DayGridPicker` non deve cambiare comportamento: i suoi test devono restare verdi
senza essere toccati. Se un test dei filtri va modificato, l'estrazione è andata storta.

### 3 · Il futuro resta escluso

**Decisione.** Oltre oggi non si sceglie, come già fa `DayGridPicker` (`disabled={future}`).

**Perché.** Una spesa è qualcosa che è successo. Una spesa di domani non è una spesa, è un
promemoria — e il progetto ne ha già uno, la notifica dello Step 31.

### 4 · `Expense.tags` e `Expense.store` **non cambiano**: restano testo

**Decisione.** Nessuna conversione a id, nessun riferimento. Si aggiunge **accanto** un catalogo di
nomi proponibili, e i due campi della spesa continuano a contenere la parola.

**Perché.** È la scelta che rende tutto il resto additivo: zero migrazione, zero riscrittura di
spese già registrate, e `insights/stores.ts`, `insights/query.ts`, i filtri e tutti i grafici
continuano a funzionare **senza una riga di modifica**. Convertire i tag in id significherebbe
riscrivere ogni spesa su entrambi i telefoni, e su un documento già sincronizzato non c'è modo di
distinguere «l'ho appena migrata io» da «l'ha modificata l'altro» — è la stessa ragione per cui le
emoji delle categorie non sono mai state migrate e si sostituiscono solo in lettura
(`state/seed.ts:37-51`).

E ha una conseguenza che serve proprio a ciò che è stato chiesto: **togliere una voce dall'elenco
non rende orfana nessuna spesa**, perché la spesa si porta dietro la parola. È la differenza con le
categorie, che infatti si archiviano e non si cancellano mai (`categories.tsx:54-55`).

### 5 · La chiave del catalogo è **derivata dal nome**, non casuale

**Decisione.** Una voce si indirizza con `<kind>:<key>`, dove `key` è esattamente `tagKey(name)` o
`storeKey(name)` — la stessa chiave normalizzata su cui grafici e filtri già raggruppano
(`naming.ts:25-39`). **Non** un `newId` casuale come per categorie, membri e spese.

**Perché**, due ragioni che valgono più della coerenza con le altre entità:

- **Due telefoni che toccano «Vacanza» nello stesso momento convergono su una voce sola.** Con un
  id casuale ne nascerebbero due, identiche a vedersi e impossibili da fondere. Il catalogo nasce
  proprio da un gesto che le due persone faranno separatamente, guardando lo stesso elenco di
  suggerimenti: è il caso peggiore per un id casuale.
- **La voce di catalogo e la barra del grafico sono la stessa identità per costruzione**, non per
  una tabella di corrispondenza da tenere allineata.

**Il prezzo, da scrivere nel commento:** rinominare una voce non è possibile — cambia il nome,
cambia la chiave, e le spese vecchie continuano a portare la parola vecchia. Non è una perdita: è
già il limite dichiarato in `model/types.ts:48-49` per i tag. Si toglie e si riaggiunge.

> ⚠️ **`parseVocabularyKey` deve tagliare al PRIMO `:`, non all'ultimo.** `parseBudgetKey`
> (`model/ids.ts`) usa `lastIndexOf` perché lì la parte variabile — il `categoryId` — sta davanti e
> il mese non contiene due punti. Qui è l'opposto: `kind` è un token fisso in testa e la parte
> variabile è un nome scritto da una persona, che i due punti può contenerli («Coop: centro»).
> **Copiare la riga esistente è il bug**, ed è il genere di bug che si manifesta su un dato solo.

### 6 · Rimuovere una voce è un tombstone, mai una `delete`

**Decisione.** `removeVocabularyEntry` scrive `deletedAt`. La chiave non si cancella mai.
Riaggiungere un nome tolto azzera il tombstone: è la stessa voce che torna, non una nuova.

**Perché.** È la regola normativa del progetto (`docs/architecture.md`): in un sistema distribuito
la rimozione fisica non si propaga in modo affidabile, e la voce ricomparirebbe dall'altro
dispositivo. Si è scelto `deletedAt` e non l'`archived` delle categorie perché qui il gesto è
«toglila dall'elenco», non «non proporla più ma resta riferita».

### 7 · I suggerimenti non si seminano: si toccano

**Decisione.** Gli elenchi di partenza compaiono nella schermata di gestione come pillole grigie da
toccare. **Nulla entra nel documento finché non lo si sceglie.**

**Perché.** `seedDefaults` (`state/seed.ts:60-72`) gira **una volta sola al primo avvio**, e sui
gruppi che esistono adesso è già passato: un seme non li raggiungerebbe mai, e servirebbe comunque
un pulsante «aggiungi i suggeriti» per loro. Due strade per la stessa cosa, di cui una che funziona
solo sui gruppi che nessuno ha ancora creato. Con i suggerimenti da toccare la strada è una sola, e
si comporta identica sui gruppi vecchi e su quelli nuovi.

Secondo effetto, non secondario: nessuna scrittura che l'utente non abbia chiesto, quindi nessun
update Yjs e nessuna riga nel log del relay per otto voci che magari non servivano.

### 8 · I tag hanno una lista suggerita, i negozi no

**Decisione.** Per i tag: `Buoni pasto · Vacanza · Regalo · Lavoro · Rimborsabile · Abbonamento ·
Contanti · Urgente`, tradotti in `it.ts` e `en.ts`. Per i negozi **nessuna lista suggerita**.

**Perché.** Un tag è una parola comune e la stessa in ogni casa; un negozio è un nome proprio e
locale. Spedire nel bundle una lista di catene italiane significherebbe proporre «Esselunga» a chi
apre l'app in inglese. Per i negozi il blocco «già usati» (decisione 9) fa tutto il lavoro con dati
veri invece che inventati.

### 9 · Il blocco «già usati, non in elenco» non è una comodità: è ciò che salva i dati esistenti

**Decisione.** Sia le due schermate di gestione sia il form mostrano, dopo le voci in elenco, le
parole che compaiono nelle spese ma non nel catalogo — da `knownTags`/`knownStores`, cioè il
vocabolario derivato che esiste già oggi (`naming.ts:68-75`).

**Perché.** Sui gruppi che esistono il catalogo nasce vuoto. Senza questo blocco, il giorno in cui
il catalogo entra **tutti i tag già scritti diventano irraggiungibili**: restano nelle spese e nei
grafici, ma non si possono più né scegliere né ritrovare, e l'elenco andrebbe ricostruito a memoria.
Nel form serve anche a un secondo caso: una spesa vecchia riaperta non deve perdere il proprio tag
solo perché nessuno l'ha ancora messo in elenco.

### 10 · Un componente solo per due schermate

**Decisione.** `features/vocabulary/VocabularyScreen.tsx` parametrico su `kind`, e due rotte sottili
`app/(gruppo)/tags.tsx` e `app/(gruppo)/stores.tsx`. Due righe `ListRow` in `manage.tsx` accanto a
«Categorie».

**Perché.** Due schermate identiche a meno di una parola sono una schermata. E le due righe stanno
nel gruppo e non nelle impostazioni dell'app per la decisione già presa allo Step 56: _ciò che è del
gruppo sta nel gruppo_, perché con due gruppi la stessa voce nelle impostazioni sarebbe una domanda
con due risposte.

---

## Step 58 — La data della spesa si sceglie

| File                                       | Cosa                                            |
| ------------------------------------------ | ----------------------------------------------- |
| `components/MonthGrid.tsx`                 | **nuovo** — il guscio condiviso (decisione 2)   |
| `features/stats/filters/DayGridPicker.tsx` | diventa un involucro; comportamento invariato   |
| `features/expenses/DayPicker.tsx`          | **nuovo** — un giorno solo, più «Oggi» e «Ieri» |
| `features/expenses/ExpenseForm.tsx`        | la data diventa stato; la riga si apre          |
| `app/(gruppo)/expense/[id].tsx`            | **la patch deve includere `date`**              |
| `packages/core/src/model/store.ts`         | `assertIsoDate` in scrittura                    |

**L'aritmetica esiste già e non si riscrive:** `dayOfWeek` e `daysOfMonth` da
`insights/calendar.ts`, `monthOf` e `shiftMonth` da `insights/period.ts`, `shortWeekdayLabel` da
`features/stats/charts/axis.ts`.

**In `ExpenseForm.tsx`:** la riga 237 passa da `const date = initial?.date ?? todayIso()` a uno
`useState`. Le righe 565-577 diventano una riga premibile che apre `DayPicker`. **Il commento
565-569 va riscritto**, perché dice il falso: al suo posto la ragione vera — niente modulo nativo,
la griglia è la stessa dei filtri, il futuro è escluso. `detailsSummary(date, store, tags)` non si
tocca: la riga chiusa dice già la data e si aggiorna da sola.

### Il punto che non va dimenticato

[`app/(gruppo)/expense/[id].tsx:30-43`](<../apps/mobile/src/app/(gruppo)/expense/%5Bid%5D.tsx#L30-L43>)
**omette `date` dalla patch**. Senza aggiungerlo, la data sarebbe scegliabile su una spesa nuova e
scartata in silenzio su una in modifica: il difetto peggiore, perché a schermo sembra funzionare.
`VaultStore.updateExpense` onora già `patch.date` (`store.ts:232`) — manca solo il chiamante.

Attenzione a **non** aggiungere `currency` per simmetria: l'omissione lì è deliberata e motivata nel
commento accanto (una spesa conserva la valuta con cui è nata).

### La guardia sul formato della data

`addExpense` e `updateExpense` non validano `input.date` in alcun modo. Finché la scriveva
`todayIso()` era una questione teorica; **da questo step la sceglie una persona**, e una data
malformata romperebbe in silenzio `monthOf` (uno `slice(0, 7)` cieco in `insights/period.ts`), i
bucket mensili e la heatmap. `assertIsoDate` accanto ad `assertCents`; il `MONTH_PATTERN` di
`export/import.ts` è il precedente di forma.

### Criterio di «fatto»

Sul telefono: nuova spesa → Dettagli → «Ieri» → salva → **la spesa compare sotto «Ieri»** nella
lista. Poi riaprirla, cambiare giorno, salvare e riaprirla ancora: il giorno è quello nuovo — è
questo passaggio, e non il primo, a verificare la patch di `[id].tsx`. Il mese avanti oltre quello
corrente resta spento.

---

## Step 59 — Il vocabolario del gruppo: tag e negozi

### Il modello

```ts
export type VocabularyKind = 'tag' | 'store';

export interface VocabularyEntry {
  kind: VocabularyKind;
  /** La chiave normalizzata: `tagKey`/`storeKey` del nome. È l'identità della voce. */
  key: string;
  /** La grafia da mostrare. */
  name: string;
  /** Tombstone: valorizzato quando la voce è tolta dall'elenco. */
  deletedAt: IsoTimestamp | null;
}
```

Più `vocabulary: VocabularyEntry[]` in `VaultSnapshot`.

**`doc.ts`** — `export const VOCABULARY = 'vocabulary'`, `vocabularyMap(doc)` e
`readVocabularyEntry`, con gli helper difensivi `str`/`nullableStr` già presenti: un record scritto
da una versione futura dell'app non deve far saltare la lettura.

**`model/ids.ts`** — `vocabularyKey(kind, key)` e `parseVocabularyKey(composite)`, con la guardia
sul **primo** `:` della decisione 5.

**`VaultStore`** — `addVocabularyEntry(kind, name)` (normalizza, deriva la chiave, azzera un
eventuale tombstone), `removeVocabularyEntry(kind, key)` (scrive `deletedAt`),
`listVocabulary(kind)`. Più `snapshot()`, `importSnapshot()` — **senza normalizzare**, come già si
fa per `store` e `tags` (commento in `store.ts:502-505`) — e **`assertEmpty()`**, la cui somma va
estesa alla mappa nuova: senza, un import su un gruppo che ha già un catalogo lo fonderebbe in
silenzio.

**Nessun `schema_version` da alzare.** È un meccanismo di azzeramento, non di migrazione, e
`doc.getMap(nome)` su un documento vecchio restituisce una mappa vuota.

### Export

`EXPORT_FORMAT_VERSION` passa a **3**, con la voce nel commento sul modello di quella della versione 2. `export/import.ts` legge `vocabulary` con `[]` come fallback, così i file v1 e v2 restano
leggibili; la regola «una versione futura si rifiuta» non si tocca. Il CSV non cambia: è per spesa.

### Le due schermate

Forma presa da `app/(gruppo)/categories.tsx`: `ModalScreen` + `FlatList` + riga di aggiunta in
testa. Tre blocchi:

1. **In elenco** — le voci, ognuna con una `✕` che la toglie.
2. **Suggeriti** — solo i tag (decisione 8). Pillole grigie da toccare.
3. **Già usati, non in elenco** — decisione 9.

### Il form

In «Dettagli», i due campi diventano la stessa cosa: pillole dal catalogo più un `+` che apre un
campo in linea; confermando, la voce **entra nel catalogo e viene scelta**. Il negozio è a scelta
singola, i tag a scelta multipla. Sparisce il `TextInput` libero del negozio (righe 581-589) e
spariscono `tagDraft`/`commitTagDraft`, sostituiti dal `+`.

`tagChoices` (`features/expenses/extra-fields.ts:53-63`) si generalizza in
`vocabularyChoices(catalog, chosen, used)`, che restituisce le voci marcate `inCatalog`: prima le
scelte, poi il catalogo, poi le orfane. Resta in `extra-fields.ts`, che esiste apposta per le regole
verificabili senza caricare `react-native`.

### Stato e traduzioni

`useVocabulary(kind)` in `state/hooks.ts` sulla forma esatta di `useCategories` — `useDocVersion` +
`dependsOnDocument` + `useMemo` — riesportata da `state/index.ts`. Blocchi nuovi in `it.ts` **e**
`en.ts`: `en.ts` è tipizzato su `it.ts`, quindi una chiave mancante è un errore di compilazione.

### Criterio di «fatto»

Test: il taglio al primo `:` con un nome che contiene due punti; l'aggiunta idempotente sulla
chiave; la rimozione che scrive un tombstone e la riaggiunta che lo resuscita; `vocabularyChoices`.
E un test in `model/convergence.test.ts`: **due `Y.Doc` che aggiungono «Vacanza» separatamente e poi
si fondono devono dare una voce sola** — è l'invariante che giustifica la decisione 5, e senza
quel test la decisione resta un'opinione.

Sul telefono: aggiungere due tag dai suggeriti; registrare una spesa scegliendoli; **togliere un tag
dall'elenco e verificare che la spesa lo conservi** e che ricompaia fra i «già usati»; poi il
grafico per negozio con due spese sullo stesso negozio scelto da tendina.

---

## Step 60 — Le correzioni dal check del codice

Il repo è in ottima forma: `typecheck`, `lint` e `format` puliti, **zero `any`, zero `!` in codice
di produzione, zero `@ts-ignore`, zero TODO/FIXME/HACK**. Quanto segue è ciò che vale la pena
correggere, in ordine di danno.

### 1 · Italiano scritto a mano nelle stringhe visibili

Il difetto più concreto: chi usa l'app in inglese trova l'italiano **proprio sui due dialoghi più
pericolosi che esistano**.

- `manage.tsx:85-152` — «Uscire da…» e «Rigenerare…», i pulsanti `'Annulla'`, `'Esci'`, `'Rigenera'`
  e i due titoli di errore, più `closeLabel="‹ Indietro"`. Lo Step 56 ha tradotto la schermata — è
  lì che è nato `manage.*` — e ha saltato gli `Alert`.
- `app/_layout.tsx:77, 97, 125` — i tre titoli di guasto fatale.
- `features/stats/charts/slices.ts:41` — `` `Altre ${rest.length} voci` ``; `DonutChart.tsx:62`.
- I corpi delle notifiche (`reminder.ts:84`, `budget.ts:283, 288`, `backup.ts:238`,
  `sync.ts:255, 276`) e i nomi dei canali Android (`schedule.ts:128, 201`).

### 2 · `isKnownCurrency` non è codice morto: è una guardia mai collegata

`model/currency.ts:68` è esportata dal barrel e **chiamata solo dal proprio test**. `addExpense` non
valida la valuta, e non valida nemmeno `paidBy` contro l'elenco dei membri — mentre i pareggi
rifiutano un membro sconosciuto. Da collegare entrambe. _(`assertIsoDate` è già nello Step 58.)_

### 3 · Nessun `maxLength` su negozio e nota

Il nome del gruppo (`MAX_GROUP_NAME`), quello del profilo (`MAX_PROFILE_NAME = 24`) e quello
nell'invito (`INVITE_NAME_MAX_CHARS = 64`) ce l'hanno tutti; i due campi della spesa no. Il
troncamento a valle esiste (`MAX_STORE_CHARS = 20` in `extra-fields.ts`) ma è solo di resa.

### 4 · `peak` calcolato su insiemi diversi in due classifiche gemelle

`CategoryBars.tsx:30` lo calcola su `totals`, cioè l'elenco **intero**; `TopList.tsx:37` su `shown`,
cioè l'elenco **già troncato**. Due classifiche dall'aspetto identico nella stessa schermata scalano
le barre in due modi. Allinearle sul primo.

### 5 · `tidy()` riscritto a mano in quattro punti

`naming.ts:15-17` non lo esporta, e la stessa riga ricompare in `stores.ts:77`,
`state/profile.ts:98` e `state/groups.ts:114`. `mostUsedSpelling` è stata esportata esattamente per
non far divergere una regola duplicata (commento in `naming.ts:108-115`): stesso trattamento.

### 6 · `console.error` dentro `packages/core`

`persistence/y-sqlite.ts:155` è l'unico punto in cui il core cerca un raccoglitore globale invece di
uno iniettato, contro la propria premessa dichiarata. Conseguenza reale: **una scrittura di
persistenza fallita non emerge da nessuna parte nell'app.** Da trasformare in un `onError`
opzionale fra le dipendenze.

### 7 · Codice morto

`averagePerMonth`, `netFor`, `weekStart`, `totalKept`, `secretsMatch` — invisibili a ESLint perché
`core/src/index.ts` riesporta con `export *`. E soprattutto **`app/dashboard.tsx`**, che STATO.md e
il suo stesso commento danno per «da cancellare al ciclo dopo» dallo Step 52. Questo è il ciclo
dopo.

### 8 · `parseHex` accetta `#00FF00zz`

`charts/ink.ts:69` verifica la regex esadecimale solo su `full.slice(0, 6)` e poi accetta una
lunghezza di 8: gli ultimi due caratteri non sono controllati da nulla.

---

## Cosa questo piano ha deciso di NON fare

Scritto qui perché non sparisca, come è successo a «Tu» nel piano v6.

- **Fondere `TopList` e `CategoryBars`.** `TopList.tsx:27` ammette già la duplicazione, e l'idioma
  `Math.max(2, x / peak * 100)` ricompare in `MonthlyBars`, `WeekdayBars` e `AmountHistogram`. Ma è
  un rifacimento di componenti visivi **senza copertura di test** — la scelta di non testare i
  `.tsx` è dichiarata in `apps/mobile/vitest.config.mts:8-14` — e merita un passo suo, col telefono
  in mano. Il difetto vero dentro la duplicazione è il punto 4 dello Step 60, che si corregge senza
  fondere niente.
- **Il ritaglio di date ISO** con `split('-')` e `slice(8, 10)` ripetuto in sei file fra i due
  pacchetti.
- **`ExpenseQuery.memberId` singolare** contro `categoryIds`/`stores`/`tags` plurali: il filtro
  persone è a scelta singola e i due helper condivisi `toggleValue`/`hasValue` non lo sanno
  esprimere.
- **Dare un colore o un'icona alle voci del vocabolario.** Sarebbe possibile ora che esiste un
  catalogo, ma nessuno l'ha chiesto e i grafici per tag e negozio non affidano l'identità al colore.
- **Offrire le voci del catalogo come faccette nei filtri dei Grafici.** Naturale seguito dello
  Step 59, fuori da questo piano.

**Non si tocca**, perché è già stato deciso altrove: l'assenza di test sui componenti, il misto di
identificatori italiani e inglesi, i grafici senza libreria di charting, e Sentry.

---

## Riepilogo

| Step | Cosa                           | Rischio                             | Build EAS             |
| ---- | ------------------------------ | ----------------------------------- | --------------------- |
| 58   | La data della spesa si sceglie | basso, additivo                     | **no** — `eas update` |
| 59   | Il vocabolario del gruppo      | medio: tocca modello, export e form | **no**                |
| 60   | Le correzioni dal check        | basso, ma tocca molti file          | **no**                |

Baseline da cui si parte: **1322 test verdi** (639 core + 629 app + 54 relay), `typecheck`, `lint` e
`format` puliti.

A fine di ogni step: test verdi, commit e push, `STATO.md` e `devlog.md` aggiornati.
