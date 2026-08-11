# JuTrack — Piano v4: grafici, filtri e dashboard componibile

> **Avanzamento al 2026-08-11.**
> Completati: **Step 0–9** (piano originale), **Step 10–14** ([piano v2](piano-v2-profili-gruppi-sync.md)),
> **Step 15–22** ([piano v3](piano-v3-tab-gruppi-azzeramento-sync.md)), i sette passi del
> [redesign visivo](visualdesign.md) e gli **Step 23–27** di questo piano. Da fare: **Step 28**,
> l'ultimo.
>
> Nasce da una richiesta di prodotto, non da un difetto: i Grafici sono corretti ma poveri, e non c'è
> modo di chiedere loro qualcosa di diverso da quello che mostrano.
>
> Punto d'ingresso del progetto: [STATO.md](STATO.md). Piano approvato:
> `~/.claude/plans/vorrei-fare-delle-modifiche-goofy-grove.md`.

## Contesto

Il tab **Grafici** (`app/(tabs)/stats.tsx`) è una sequenza fissa: totale del mese, sei barre mensili,
barre per categoria, saldo fra i membri, budget. È scritto bene e i numeri sono giusti — i calcoli
stanno tutti in `packages/core/src/insights/`, dove si possono verificare. Ma è **una schermata sola,
senza filtri e senza scelta**: chi la apre vede quello che c'è, nell'ordine in cui è scritto nel file.

Tre limiti, in ordine di quanto pesano.

**1. Non si può chiedere niente.** Il solo comando è lo stepper del mese. Non si può isolare una
categoria, una persona, un intervallo diverso dal mese civile, né una fascia di importo. Ogni domanda
che non sia «quanto ho speso questo mese» richiede di guardare la lista delle spese a mano.

**2. Il repertorio è fatto di barre.** Sei barre verticali per i mesi, barre orizzontali per le
categorie, barre di avanzamento per i budget. Vanno benissimo per quello che fanno, ma non c'è un
andamento continuo, non c'è distribuzione, non c'è densità nel tempo — cioè mancano proprio le forme
che un'app di finanza personale usa per far vedere **un'abitudine** invece di **un totale**.

**3. La schermata è la stessa per tutti.** Chi guarda soprattutto il budget e chi guarda soprattutto
il confronto con l'altra persona vedono la stessa sequenza, e ognuno scorre oltre la metà che non gli
serve.

**Due filtri richiesti non hanno di che lavorare**: la spesa non sa in che negozio è stata fatta e non
ha etichette. Sono i due campi che questo piano aggiunge — e sono anche gli unici, perché ogni campo
in più è una domanda in più nella schermata che si apre più spesso.

### Esito voluto

Un tab Grafici con **sei filtri che agiscono su tutti i grafici insieme**, una decina di
visualizzazioni fra cui scegliere, e una dashboard che ognuno compone come vuole — con un layout di
default che è, riga per riga, la schermata di oggi più l'andamento a dodici mesi. Chi aggiorna non
deve comporre niente per ritrovarsi a casa.

---

## Decisioni prese

| Ambito                   | Scelta                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| Campi nuovi sulla spesa  | **Negozio** e **tag**. Niente conto né metodo di pagamento                    |
| Dove stanno nel form     | Dietro **«Informazioni aggiuntive»**, tendina chiusa di default               |
| Fascia oraria            | **Fuori dal piano.** La spesa non ha un'ora, e `createdAt` dice un'altra cosa |
| Negozi e tag come entità | **No**: campi della spesa, vocabolario derivato in lettura                    |
| Come si disegna          | **SVG a mano**, con la geometria in `packages/core`. Nessuna libreria         |
| Layout della dashboard   | **Locale, per telefono**, in `app_meta`. Non sincronizzato                    |
| Riordino dei widget      | **Frecce su/giù.** Nessun trascinamento                                       |
| Etichette degli assi     | **`Text` di React Native**, non `<Text>` di SVG                               |
| Perimetro dei dati       | **Il gruppo aperto**, come oggi. Nessuna aggregazione fra gruppi              |
| Schema Yjs               | **Additivo**: due campi. Nessuna migrazione, nessun bump di `schema_version`  |
| Build                    | **Nessuna nuova build EAS**: `react-native-svg` è già installato e già dentro |

### Perché la fascia oraria resta fuori

È il grafico più richiesto delle app di finanza personale, e questo progetto non può farlo onestamente.
`Expense.date` è una stringa `YYYY-MM-DD`: **non c'è un'ora**. L'unico istante disponibile è
`createdAt`, che `VaultStore.timestamp()` valorizza con `new Date().toISOString()` nel momento in cui la
spesa viene **scritta** — non in cui viene fatta. Chi registra gli scontrini della giornata alle undici
di sera produrrebbe un picco alle ventitré che non è mai esistito. In più è UTC senza offset, quindi un
acquisto delle 00:30 finirebbe nel giorno prima; `todayIso()`
(`apps/mobile/src/features/expenses/grouping.ts:39-47`) costruisce `date` dai componenti **locali**
proprio per evitarlo, e le due cose userebbero due orologi diversi.

Aggiungere un'ora vera è possibile — un campo `time` opzionale — ma è una domanda in più nel form della
spesa, e il passo 7 del redesign quel form l'ha appena ridotto all'osso. Se un giorno servirà, sarà uno
step suo.

### Perché negozio e tag sono campi e non entità

La strada «giusta» sarebbe due `Y.Map` nuove, `stores` e `tags`, con id, nome ed eventuale colore. Ma
porterebbe due schermate di gestione, due percorsi di cancellazione, e soprattutto **il problema degli
orfani**: un tag rinominato o cancellato mentre l'altro telefono lo sta usando.

Con i campi, il vocabolario si **deriva in lettura** dalle spese esistenti — `knownStores(expenses)`,
`knownTags(expenses)` — che è esattamente il metodo già usato da `CATEGORY_ICONS` in
`features/categories/icon.ts` per non riscrivere le icone sincronizzate. Un negozio esiste finché
esiste una spesa che lo nomina, e sparisce da solo quando non ne resta nessuna. Niente da gestire,
niente da cancellare, niente da migrare.

Il prezzo è che non si può dare un colore a un tag né rinominarne uno in tutte le spese insieme. Sono
due cose che si comprano dopo, se serviranno, e non si perde nulla nel frattempo.

### Perché `tags` è un valore intero e non una `Y.Array` annidata

`docs/architecture.md` prescrive che i valori composti stiano dentro una chiave sola — è la ragione per
cui `split` è scritto intero (`model/doc.ts:80-91`): con una mappa annidata, il `mode` di un telefono
si fonderebbe con le `shares` dell'altro producendo uno split che non torna.

Per i tag quel vincolo non c'è: un elenco di etichette non ha un'invariante da rispettare, e una
`Y.Array` fonderebbe correttamente due aggiunte concorrenti. Ma vorrebbe reader e writer nuovi in
`doc.ts`, che oggi tratta solo valori piatti, **per un conflitto che richiede che due persone
etichettino la stessa spesa nello stesso momento**. Si scrive l'array intero, vince l'ultimo, e la
scelta va scritta nel codice accanto al campo — non solo qui.

### Perché SVG a mano e non una libreria di charting

`react-native-svg` **15.15.4 è già dipendenza diretta** di `apps/mobile` ed è già dentro la development
build installata: lo usa `features/pairing/PairingQr.tsx` per disegnare il QR. Disegnare grafici in SVG
costa zero moduli nativi e zero build.

Una libreria costerebbe invece uno stile suo da domare per farlo somigliare al registro del redesign, e
soprattutto un albero di dipendenze da controllare voce per voce: le più capaci poggiano su
`reanimated` e `gesture-handler`, che sono moduli nativi. E c'è una ragione strutturale che vale più
della convenienza: **la geometria scritta a mano sta in `packages/core` e si prova con Vitest**, come
già fanno i totali. Una libreria mette scale e path dentro il componente, dove questo progetto ha
deciso da tempo che i calcoli non stanno.

### Perché il riordino è a frecce e non a trascinamento

Il drag & drop vuole `react-native-gesture-handler` e `react-native-reanimated`, cioè una build EAS
nuova per un gesto. È la **terza** volta che questo progetto prende la stessa decisione, e le due
precedenti sono scritte nel codice: `@gorhom/bottom-sheet` rifiutato in
`features/groups/GroupSwitcherSheet.tsx:21-25`, `@react-native-community/datetimepicker` in
`features/expenses/ExpenseForm.tsx:399-403`. Due chevron su e giù fanno la stessa cosa, funzionano con
TalkBack senza lavoro aggiuntivo, e il trascinamento si paga quando sarà l'unica cosa che manca.

### Perché il layout non è sincronizzato

Sta in `app_meta`, la tabella SQLite locale, sotto la chiave `dashboard_layout`. È una **preferenza di
chi guarda**, non un dato del gruppo: metterla nel vault vorrebbe dire imporre all'altra persona
l'ordine dei propri grafici, e generare un update cifrato a ogni riordino. In `app_meta` non c'è
conflitto CRDT da risolvere, e `wipe.ts:111` (`DELETE FROM app_meta`) la porta via da sola
all'azzeramento, senza una riga in più.

---

## Step di implementazione

Ogni step termina con: **test verdi → `expo export` → documentazione aggiornata → commit e push**.
Nessuno step lascia il repo in stato non compilante.

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
cd apps/mobile && npx expo export --platform android
```

> **L'ordine mette il modello prima dei filtri, e la geometria prima dei disegni.** Costruire il foglio
> dei filtri senza negozio e tag vorrebbe dire riaprirlo subito dopo; e gli Step 23 e 25, che non si
> vedono, sono quelli che decidono se tutto il resto mostrerà numeri giusti. Se una sessione ha tempo
> per una cosa sola, sono quelle: rischio contenuto e nessun lavoro da rifare.

### Step 23 — Il modello impara negozio e tag ✅

> **Fatto l'11 agosto 2026.** Come scritto qui sotto, con tre aggiunte: la normalizzazione in
> scrittura è esposta come `normalizeStore`/`normalizeTags` accanto alle quattro funzioni previste;
> `knownStores`/`knownTags` **ignorano le spese cancellate** (un negozio nominato solo da una spesa
> cancellata è sparito con lei); e i tag del CSV passano per il disinnesco delle formule **uno per
> uno prima del `join(';')`**, perché farlo dopo proteggerebbe solo il primo. Dettagli nel
> [devlog](devlog.md#2026-08-11--step-23-il-modello-impara-negozio-e-tag).

**File:** `packages/core/src/model/types.ts`, `model/doc.ts`, `model/store.ts`,
`packages/core/src/insights/naming.ts` (nuovo) e il suo test, `insights/index.ts`,
`packages/core/src/export/csv.ts`, `export/json.ts`, `docs/architecture.md`.

Due campi su `Expense`:

```ts
/** Dove è stata fatta. Stringa vuota se non è stato detto. */
store: string;
/** Etichette libere, normalizzate in scrittura. Array vuoto se nessuna. */
tags: string[];
```

- **Additivo, e basta.** I reader di `doc.ts` prendono tutti un fallback e `writeRecord` scrive solo le
  chiavi che riceve: una spesa scritta prima di oggi legge `''` e `[]` senza che nulla la tocchi. **Non
  si fa backfill** — la ragione è scritta in `apps/mobile/src/state/seed.ts:37-48` — e **non si tocca
  `CURRENT_SCHEMA_VERSION`**, che è un meccanismo di azzeramento, non di migrazione.
- **Serve un reader nuovo, `strList(map, key, fallback)`**, e dev'essere difensivo: il valore arriva da
  un altro dispositivo, quindi va accettato solo se è un array e vanno tenute solo le stringhe. Un
  `tags` malformato non deve far saltare `listExpenses`, che è la lettura da cui dipende tutta l'app.
- **La normalizzazione sta in `insights/naming.ts` e si applica in scrittura**, dentro `addExpense` e
  `updateExpense`: `store` con gli spazi ai margini tolti, `tags` con spazi tolti, vuoti scartati e
  duplicati rimossi **sulla chiave normalizzata**. Salvare `Spesa` e `spesa` sulla stessa riga sarebbe
  un doppione che poi produce due barre.

`naming.ts` contiene quattro funzioni pure:

```ts
storeKey(name: string): string;              // trim, spazi collassati, minuscolo
tagKey(tag: string): string;                 // idem
knownStores(expenses: Expense[]): string[];  // per frequenza, grafia più usata
knownTags(expenses: Expense[]): string[];    // idem
```

> **`Esselunga`, `esselunga` e `Esselunga ` sono lo stesso negozio e devono fare una barra sola.** Si
> conserva la grafia che l'utente ha scritto — a schermo compare la **più usata** — e si aggrega sulla
> chiave. Senza questa funzione, «top negozi» diventa un elenco di refusi.

**L'export cambia versione.** In `export/csv.ts` l'intestazione è un array scritto a mano
(`csv.ts:109-123`): due colonne nuove, `negozio` e `tag`, con i tag uniti da `;` perché il separatore
CSV è la virgola. `EXPORT_FORMAT_VERSION` in `export/json.ts:21` passa da **1 a 2**.

> **Il disinnesco contro la CSV injection vale anche per il negozio.** Oggi è applicato alla nota: un
> valore che comincia per `=` viene valutato come formula da Excel e da Fogli Google. Un nome di
> negozio è testo scelto dall'utente esattamente come la nota, e passa per lo stesso filtro. Vale anche
> per i tag.

**`ExpenseFilter` non cambia.** Resta `{ from, to, categoryId, includeDeleted }`. Negozio, tag, persona
e fascia di importo si filtrano **in memoria** allo Step 25, non nello store: `listExpenses` è una
scansione lineare che alloca un array nuovo a ogni chiamata, e chiamarla una volta per widget con
filtri diversi vorrebbe dire scandire N volte la stessa lista.

Da aggiornare anche la tabella del modello dati in `docs/architecture.md:127`, che elenca i campi di
`expenses`.

_Verifica_ (`model/store.test.ts`, `insights/naming.test.ts`, `export/csv.test.ts`):
`una spesa senza negozio legge la stringa vuota`; `una spesa senza tags legge un array vuoto`;
`un tags non-array non fa saltare la lettura` (si scrive a mano un numero nella `Y.Map` e
`listExpenses` deve restituire `[]` per quel campo, non sollevare); `i tag si deduplicano sulla chiave
normalizzata`; `storeKey unisce Esselunga ed esselunga`; `knownStores ordina per frequenza e restituisce
la grafia più usata`; `il CSV disinnesca un negozio che comincia per uguale`; `due documenti convergono
su una spesa con i tag`.

### Step 24 — «Informazioni aggiuntive» nel form della spesa ✅

> **Fatto l'11 agosto 2026.** Come scritto qui sotto, con tre aggiunte: `Chip` prende un
> `icon?: ReactNode`, senza il quale le pillole delle categorie non erano convertibili; il peso
> dell'etichetta è unificato (`semibold`/`medium`), perché le due copie divergevano senza una
> ragione; e `extra-fields.ts` contiene anche `tagChoices`, che ordina le pillole dei tag
> confrontando sulla chiave. Il tag scritto e non confermato viene salvato lo stesso. Dettagli nel
> [devlog](devlog.md#2026-08-11--step-24-informazioni-aggiuntive-e-la-pillola-smette-di-essere-scritta-a-mano).

**File:** `apps/mobile/src/features/expenses/ExpenseForm.tsx`,
`features/expenses/extra-fields.ts` (nuovo) e il suo test, `apps/mobile/src/components/Chip.tsx` (nuovo).

Una sezione richiudibile in fondo al form, **chiusa di default**, con dentro **Negozio** (campo testo
più suggerimenti da `knownStores`) e **Tag** (chip dei tag già usati, più aggiunta libera).

- **La riga chiusa mostra un riassunto quando c'è qualcosa dentro** — «Esselunga · 2 tag» — e
  «Facoltativi» quando è vuota. Nascondere un campo **compilato** dietro una tendina muta è il modo in
  cui i dati si perdono senza che nessuno se ne accorga: chi riapre una spesa vecchia per correggerla
  deve vedere dalla riga chiusa che lì sotto c'è qualcosa.
- La logica del riassunto è `extraSummary(store, tags)` in `extra-fields.ts`, con i suoi test — è la
  regola del progetto: se una stringa dipende da una condizione, esce dal componente e si prova
  (`features/expenses/split-text.ts` è il precedente).
- **Nessuna animazione.** `LayoutAnimation` sulla nuova architettura è a supporto parziale, e non vale
  il rischio per una tendina: `useState` e render condizionale.
- **La sezione sta dopo i dettagli e prima del salva**, senza toccare l'ordine
  importo → chi e come → categoria → dettagli che il passo 7 del redesign ha stabilito.

**`Chip` diventa un componente condiviso.** Oggi la stessa pillola è scritta a mano due volte dentro
`ExpenseForm.tsx` — le modalità di divisione a `249-279` e le categorie a `355-389` — e questo step ne
aggiungerebbe una terza. `components/Chip.tsx` con `{ label, selected, onPress, color? }`: senza
`color` si colora d'accento come le modalità di divisione, con `color` prende bordo del colore e fondo
`color + '22'`, che è l'idioma già in uso per le categorie.

> **Convertire i due punti esistenti fa parte di questo step, non del prossimo.** Lasciare tre copie
> della stessa pillola significa che la prossima modifica ne aggiorna due su tre. Ma sono due punti
> collaudati della schermata che si apre più spesso: un solo commit, `expo export`, e la prova sul
> telefono prima di chiudere.

_Verifica_ (`features/expenses/extra-fields.test.ts`): `senza niente dice Facoltativi`; `col solo
negozio dice il negozio`; `coi soli tag ne dice il numero`; `con entrambi li unisce con il punto
mediano`; `un negozio lungo viene troncato invece di mandare la riga a capo`. Il resto è impaginazione,
e si verifica sul telefono — con la tastiera aperta, che è il rischio vero di questa schermata.

### Step 25 — La geometria dei grafici, in `packages/core` ✅

> **Fatto l'11 agosto 2026.** Come scritto qui sotto, con quattro precisazioni: `amountFor` sotto
> **«ha pagato»** restituisce l'importo **pieno** e non la quota (la domanda è quanto ha anticipato);
> la **fascia di importo** si misura sull'importo proiettato, o l'istogramma mostrerebbe barre fuori
> fascia; `totalCents`, `totalsByCategory` e `totalsByMonth` hanno preso la query come parametro
> additivo in coda, perché «si riusano senza toccarle» e «nessuno legge `amountCents` per conto suo»
> non stanno insieme; e `calendar.ts` lavora in **UTC** invece che col trucco del mezzogiorno, che
> serve solo ai `Date` costruiti con componenti locali. Dettagli nel
> [devlog](devlog.md#2026-08-11--step-25-la-geometria-dei-grafici-dove-si-può-provare).

**File:** cartella nuova `packages/core/src/chart/` (`scale.ts`, `path.ts`, `treemap.ts`, `bins.ts`,
`index.ts`) e le aggregazioni nuove in `packages/core/src/insights/` (`query.ts`, `calendar.ts`,
`series.ts`, `weekday.ts`, `heatmap.ts`, `stores.ts`, `people.ts`), ognuna col suo `.test.ts`, più i
due barrel.

Nessuna riga di interfaccia. È lo step che rende i grafici verificabili senza un telefono, ed è il
motivo per cui viene prima di quello che li disegna.

**`chart/` — solo numeri che entrano e numeri che escono.** `eslint.config.mjs` vieta a
`packages/core` di importare react-native: è questo divieto a garantire che la geometria resti provabile
in Node.

| File         | Contenuto                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------ |
| `scale.ts`   | `linearScale(domain, range)`, `bandScale(n, width, padding)`, `niceTicks(min, max, count)` |
| `path.ts`    | `linePath`, `areaPath`, `smoothLinePath`, `arcPath` per la ciambella                       |
| `treemap.ts` | Layout squarified → rettangoli, deterministico a parità di input                           |
| `bins.ts`    | `binsFor(amounts)` e la scala `0–10 · 10–20 · 20–50 · 50–100 · 100–200 · 200+`             |

> **`smoothLinePath` è una cubica monotona, non una spline naturale.** Fra due mesi bassi e uno alto,
> una spline normale **scavalca** i punti e scende sotto la linea di base: disegnerebbe una spesa
> negativa in un mese in cui si è speso poco. La monotona non supera mai i valori che collega. È la
> differenza fra un grafico più morbido e un grafico che mente.

**`insights/` — le aggregazioni nuove**, accanto a quelle che ci sono già e che si riusano senza
toccarle (`totalCents`, `totalsByCategory`, `totalsByMonth`, `averagePerMonth`, `budgetStatuses`,
`computeBalances`, `simplifyDebts`, `monthOf`, `monthBounds`, `shiftMonth`, `monthsBetween`,
`daysInMonth`).

| File          | Funzioni                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `query.ts`    | `ExpenseQuery`, `applyQuery(expenses, query)`, **`amountFor(expense, query)`**, `describeQuery(query)` |
| `calendar.ts` | `dayOfWeek`, `addDays`, `daysBetween`, `weekStart`, `daysOfMonth`                                      |
| `series.ts`   | `totalsByDay`, `cumulativeByDay`, `movingAverage(series, window)`, `averagePerDay`                     |
| `weekday.ts`  | `totalsByWeekday` → sette voci, sempre tutte e sette                                                   |
| `heatmap.ts`  | `dailyHeatmap(expenses, from, to)` → celle `{ date, totalCents, level: 0..4 }`                         |
| `stores.ts`   | `totalsByStore`, `totalsByTag` — stessa forma di `CategoryTotal`, stesso ordinamento deterministico    |
| `people.ts`   | `totalsByMemberOverTime(expenses, memberIds, months)` — pagato e a carico, per membro, per mese        |

> **`amountFor` è il punto in cui questo piano può produrre numeri sbagliati in silenzio, e per questo
> è una funzione sola.** `paidBy` e `split.shares` sono cose diverse: filtrando per una persona una
> cena da 40 € divisa a metà, mostrare 40 € sarebbe **falso**. Il filtro persona ha due modalità
> esplicite — **«A carico di»** (default, perché è ciò che una persona intende per «le mie spese») e
> **«Ha pagato»** — e quando è attivo l'importo di ogni spesa diventa la **quota** di quella persona.
> Senza filtro persona, l'importo è quello pieno. Ogni grafico chiama `amountFor`, nessuno legge
> `amountCents` per conto suo.

> **`calendar.ts` lavora sulle stringhe, come `period.ts`.** La ragione è scritta in testa a
> `insights/period.ts` e vale identica per i giorni: un `Date` porta con sé fuso e ora, e «il giorno di
> questa spesa» non ne ha bisogno. Dove serve davvero un `Date` — il giorno della settimana — si usa il
> trucco del mezzogiorno già in uso in `features/expenses/grouping.ts:66`, che è ciò che impedisce
> all'ora legale di spostare una spesa al giorno prima.

> **I livelli della heatmap sono per quantili, non lineari.** Con una scala lineare, una singola spesa
> grossa alza il massimo e schiaccia tutti gli altri giorni al livello più basso: si otterrebbe una
> griglia quasi vuota con una cella accesa, che è precisamente l'informazione che la heatmap dovrebbe
> dare e invece nasconde.

**Un test che attraversa i moduli.** Con lo stesso `ExpenseQuery`, la somma dell'istogramma degli
importi, quella delle aree del treemap e quella della serie giornaliera devono dare **lo stesso numero**
del totale in testa. È il controllo che accorge di un filtro applicato due volte o di un arrotondamento
che perde centesimi, e va scritto come test invece che verificato a occhio.

_Verifica:_ oltre a quello sopra — `una spesa cancellata non entra in nessuna aggregazione` (per ogni
funzione nuova, come già fanno quelle esistenti); `un periodo senza spese dà zero e non NaN`;
`amountFor con filtro persona restituisce la quota e non l'importo pieno`; `amountFor senza filtro
persona restituisce l'importo pieno`; `applyQuery combina i filtri in AND`; `totalsByWeekday restituisce
sempre sette voci`; `smoothLinePath non scende sotto la linea di base fra due minimi`; `il treemap
copre l'area senza sovrapporre rettangoli`; `binsFor mette 10,00 € nella fascia 10–20 e non in 0–10`
(il confine è il caso che si sbaglia); `dailyHeatmap con una spesa enorme non manda tutti gli altri
giorni a livello zero`.

### Step 26 — I grafici nuovi, in SVG ✅

> **Fatto l'11 agosto 2026.** Come scritto qui sotto, con una correzione e tre precisazioni.
> La correzione: **«nessuna logica pura nuova» non era vero**, e sono quattro moduli con trenta
> test — `axis.ts` (quali etichette ci stanno), `heatmap-grid.ts` (i giorni in colonne di
> settimane, e le soglie della legenda lette all'indietro dai livelli), `slices.ts` (la coda
> della ciambella) e `ink.ts` (di che colore scrivere dentro il colore di una categoria: metà
> della palette di default vuole il testo **scuro**, e il test l'ha scoperto bocciando
> l'assunzione opposta). Le tre precisazioni: la heatmap si disegna in SVG ma si tocca con
> `Pressable` sovrapposti, perché l'accessibilità di React Native non dipende dalla piattaforma;
> l'istogramma misura il **numero di spese** e non la somma, o la fascia «200+» vincerebbe
> sempre; e `TopList`, `MemberComparison` e `StatTile` restano `View` di React Native — una
> barra orizzontale è una vista con una larghezza, e l'SVG lì non compra niente. Dettagli nel
> [devlog](devlog.md#2026-08-11--step-26-i-grafici-nuovi-in-svg).

**File:** `apps/mobile/src/features/stats/charts/` (nuova) e `app/(tabs)/stats.tsx`.

I componenti ricevono dati **già calcolati** e colori da `useTheme()`. Non calcolano niente: tutto
quello che serviva è stato scritto e provato allo Step 25.

`LineChart.tsx` · `AreaChart.tsx` · `WeekdayBars.tsx` · `CalendarHeatmap.tsx` · `AmountHistogram.tsx` ·
`CategoryTreemap.tsx` · `DonutChart.tsx` · `Sparkline.tsx` · `StatTile.tsx` · `TopList.tsx` ·
`MemberComparison.tsx`

`MonthlyBars.tsx`, `CategoryBars.tsx` e `BudgetRows.tsx` **restano come sono**: sono già nella forma
registro che `visualdesign.md` prescrive per questa schermata, e riscriverle in SVG sarebbe lavoro
speso per ottenere quello che già si vede.

- **Le etichette sono `Text` di React Native, fuori dall'SVG**, in righe allineate — come già fa
  `MonthlyBars.tsx` con i nomi dei mesi. Il testo RN eredita gratis il font dell'app e il
  ridimensionamento d'accessibilità del sistema; `<Text>` di `react-native-svg` no. L'SVG disegna le
  **marche**.
- **Nessun grafico affida l'identità al colore** — la regola dello Step 8. Ogni marca porta nome,
  importo o etichetta, e i colori vengono da dove già esistono: `Category.color` (una palette scelta e
  validata sui due temi, `state/seed.ts:26-35`) e `Member.color`.
- **Questo step non aggiunge filtri né composizione.** `stats.tsx` mostra una sequenza fissa, più ricca
  di quella di oggi. Serve a vedere i grafici veri su un telefono vero prima di costruirci sopra due
  strati di interfaccia.

> **La heatmap è l'unico grafico in cui il colore porterebbe l'informazione da solo**, e va compensato
> in tre modi: `accessibilityLabel` per ogni cella («mercoledì 12 agosto: 34,20 €»), legenda con le
> soglie **in euro** e non solo in tinte, e tocco sulla cella che scrive giorno e importo sotto la
> griglia. Senza questi tre, è un grafico che una parte delle persone non può leggere.

_Verifica:_ nessuna logica pura nuova — è tutta allo Step 25. Il giudice è **`expo export --platform
android`**, che qui conta più che altrove: è la prima volta che `react-native-svg` viene usato fuori dal
QR, e i problemi di bundling non li vedono né i test né il typecheck. Poi il telefono, in tema chiaro e
scuro.

### Step 27 — I sei filtri, che agiscono su tutto insieme ✅

> **Fatto l'11 agosto 2026.** Come scritto qui sotto, con due moduli puri in più e quattro
> precisazioni. I moduli: `amount.ts`, perché il massimo delle fasce è **esclusivo** in
> `bins.ts` e **inclusivo** in `ExpenseQuery`, e quel centesimo si toglie una volta sola; e
> `facets.ts`, con `QueryFacets` (`Omit<ExpenseQuery, 'from' | 'to'>`) e un `toggleValue` che
> confronta sulla **chiave normalizzata**, o un filtro su `Esselunga` non si spegnerebbe più.
> Le precisazioni: **lo stepper del mese è stato tolto** e a sostituirlo sono le barre
> mensili, che ne mostrano sei invece di uno; **tre grafici non rispettano il periodo** ma
> solo gli altri cinque filtri, perché la loro finestra è dichiarata nel titolo, e **saldo e
> budget non ne rispettano nessuno**, perché sono fatti sul gruppo e non viste;
> `previousPeriod` distingue **tre casi** per la riga «rispetto a…»; e la heatmap ha dovuto
> imparare a scorrere, perché dodici mesi sono cinquantatré colonne. Dettagli nel
> [devlog](devlog.md#2026-08-11--step-27-i-sei-filtri-che-agiscono-su-tutto-insieme).

**File:** `apps/mobile/src/features/stats/filters/` (nuova: `FilterBar.tsx`, `FilterSheet.tsx`,
`PeriodPicker.tsx`, `DayGridPicker.tsx`, `period.ts` e il suo test), `app/(tabs)/stats.tsx`.

Sei filtri, concentrati in un solo `ExpenseQuery` che alimenta ogni grafico:
**periodo · persona · categoria · negozio · tag · fascia di importo**.

- **`FilterBar`** — riga di chip orizzontale scorrevole con i filtri attivi; toccarla apre il foglio. Il
  chip porta **il valore**, non il nome del filtro: «Spesa», non «Categoria». E c'è sempre un modo di
  azzerare tutto: un filtro che non si vede è un filtro che non si sa di avere, e produce una schermata
  vuota che sembra un guasto.
- **`FilterSheet`** — una `Modal` di React Native, copiando struttura e misure di
  `features/groups/GroupSwitcherSheet.tsx`: raggio 22 in alto, maniglia 38×4, backdrop `#00000099`,
  `maxHeight: '80%'`, inset di sicurezza in basso. Non `@gorhom/bottom-sheet`, per la ragione scritta
  in quel file.
- **`PeriodPicker`** — preset: 7 giorni · 30 giorni · questo mese · mese scorso · ultimi 12 mesi ·
  quest'anno · personalizzato. La conversione preset → `{ from, to }` sta in `period.ts`, pura e
  testata: è dove si annidano gli errori di un giorno.
- **`DayGridPicker`** — l'intervallo personalizzato, una griglia di giorni in `Pressable` costruita
  sugli stessi helper di `calendar.ts` che servono alla heatmap. **Nessun modulo nativo**, quindi
  nessuna build. Resta lì come base per rendere un giorno modificabile la data della spesa, ferma dal
  passo 7 del redesign proprio per mancanza di un selettore.
- **Una lettura sola, non una per widget.** `useExpenses(bounds)` con gli estremi del periodo — è
  l'unico filtro che conviene far fare allo store, perché restringe la scansione — e poi `applyQuery`
  in un `useMemo` per il resto. Chiamare `useExpenses` una volta per grafico scandirebbe la lista N
  volte a ogni render.

_Verifica_ (`features/stats/filters/period.test.ts`): `«ultimi 7 giorni» include oggi e i sei
precedenti`; `«questo mese» parte dal primo e arriva a oggi, non a fine mese`; `«mese scorso» a gennaio
torna a dicembre dell'anno prima`; `«ultimi 12 mesi» parte dal primo giorno del dodicesimo mese
indietro`; `un intervallo personalizzato invertito viene raddrizzato invece di dare zero risultati`. Il
resto si prova sul telefono: il criterio è che **cambiando un filtro cambino tutti i grafici insieme**,
e che il totale in testa continui a coincidere con la somma di ognuno.

### Step 28 — La dashboard componibile

**File:** `apps/mobile/src/features/stats/dashboard/` (nuova: `widgets.ts`, `layout.ts` e i loro test,
`useDashboardLayout.ts`, `DashboardWidget.tsx`), `apps/mobile/src/app/dashboard.tsx` (nuovo),
`app/(tabs)/stats.tsx`.

- **`widgets.ts`** — il registro: `WidgetId` come unione di stringhe, e per ogni id titolo, sottotitolo
  e dipendenze dichiarate (`needsStore`, `needsTags`, `needsMultipleMembers`).
- **`layout.ts`** — `DashboardLayout`, `DEFAULT_LAYOUT`, `parseLayout(raw)` difensivo,
  `serializeLayout`, `moveWidget(layout, id, delta)`.
- **`useDashboardLayout.ts`** — legge e scrive `dashboard_layout` in `app_meta` tramite
  `useAppData().meta`, con lo stesso parsing prudente di `loadProfile` in `state/profile.ts`: quello
  che non si riesce a leggere vale come assente, e si riparte dal default.
- **`DashboardWidget.tsx`** — la cornice comune: `SectionLabel`, filetto, contenuto, e **stato vuoto
  proprio** («in questo periodo non c'è niente da mostrare») invece di un grafico disegnato a zero, che
  sembra un dato e non lo è.
- **`app/dashboard.tsx` → `/dashboard`** — la schermata «Componi la dashboard»: elenco dei widget con
  interruttore e due chevron per l'ordine. Sta sulla **radice**, come `azzera.tsx` e `backup.tsx`: è
  una schermata-foglia che copre la tab bar, e il layout è globale, quindi non le serve la guardia di
  `app/(gruppo)/`.

**Il layout di default riproduce la schermata di oggi** — totale del mese, andamento, categorie, saldo,
budget — più l'andamento a dodici mesi. Chi aggiorna non perde niente e non deve comporre nulla per
ritrovarsi a casa.

> **Gli id sconosciuti si scartano in lettura, e i widget nuovi non si aggiungono d'ufficio.** Scartare
> serve a non rompersi quando un widget viene tolto dal codice; non aggiungere serve a non far
> **riapparire** in coda alla dashboard qualcosa che l'utente aveva deliberatamente rimosso. Sono due
> regole opposte in apparenza, e sono la stessa: il layout salvato è una scelta, non una cache.

> **Un widget con le dipendenze non soddisfatte resta visibile e lo dice.** Chi ha un solo membro, se
> sceglie «confronto fra persone», deve leggere «serve almeno un'altra persona nel gruppo», non trovare
> la riga sparita: un widget scelto che svanisce si legge come un guasto. Nel selettore la stessa
> condizione compare come suggerimento accanto al nome.

_Verifica_ (`features/stats/dashboard/layout.test.ts`, `widgets.test.ts`): `un id sconosciuto viene
scartato`; `un JSON malformato vale come layout assente`; `un widget aggiunto al registro non compare in
un layout già salvato`; `moveWidget in cima o in fondo non cambia niente`; `il layout di default
contiene solo id presenti nel registro`; `ogni id del registro ha titolo e sottotitolo`. Poi il
telefono: togliere un widget, **chiudere e riaprire l'app**, e ritrovarlo tolto.

---

## Trappole, in un posto solo

| Step | Trappola                                                                 | Come si evita                                                                                      |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 23   | Bump di `CURRENT_SCHEMA_VERSION` per due campi nuovi                     | È un azzeratore, non una migrazione: i campi sono additivi e i reader hanno un fallback            |
| 23   | Backfill dei campi nuovi sulle spese esistenti                           | Un update Yjs per spesa per telefono, indistinguibile da una modifica altrui. Si deriva in lettura |
| 23   | Un `tags` non-array arrivato da un'altra build fa saltare `listExpenses` | Reader `strList` difensivo: solo array, solo stringhe, altrimenti il fallback                      |
| 23   | `Esselunga` ed `esselunga` diventano due negozi                          | `storeKey` come chiave di aggregazione, grafia più usata a schermo                                 |
| 23   | Un negozio che comincia per `=` diventa una formula in Excel             | Lo stesso disinnesco già applicato alla nota, esteso a `store` e ai tag                            |
| 24   | Un campo compilato sparisce dietro la tendina chiusa                     | La riga chiusa mostra il riassunto di ciò che contiene                                             |
| 25   | Il filtro persona mostra l'importo pieno di una spesa divisa             | `amountFor` proietta sulla quota. Nessun grafico legge `amountCents` per conto suo                 |
| 25   | La curva morbida scende sotto zero fra due minimi                        | Cubica monotona, non spline naturale: non supera mai i punti che collega                           |
| 25   | Una spesa grossa schiaccia tutta la heatmap al livello più basso         | Livelli per quantili, non lineari                                                                  |
| 25   | Un filtro applicato due volte, o centesimi persi in un arrotondamento    | Il test che confronta la somma di istogramma, treemap e serie giornaliera con il totale            |
| 26   | La heatmap affida l'informazione al solo colore                          | Label per cella, legenda con le soglie **in euro**, tocco che scrive giorno e importo              |
| 26   | `react-native-svg` fuori dal QR non fa il bundle                         | `expo export --platform android` a ogni step: né test né typecheck vedono i problemi di bundling   |
| 27   | `useExpenses` chiamata una volta per widget                              | Una lettura sola sugli estremi del periodo, poi `applyQuery` in un `useMemo`                       |
| 27   | Un filtro attivo e invisibile fa sembrare guasta una schermata vuota     | I chip portano il valore, e «azzera i filtri» è sempre raggiungibile                               |
| 28   | Un widget nuovo riappare in una dashboard da cui era stato tolto         | Gli id sconosciuti si scartano, ma i widget nuovi **non** si aggiungono a un layout salvato        |
| 28   | Un widget scelto sparisce perché gli manca un dato                       | Resta visibile e dichiara cosa gli serve                                                           |

---

## Criterio di «fatto» end-to-end

Il piano v4 è riuscito quando, su due telefoni fisici:

1. **Si registra una spesa con negozio e tag** dalla tendina «Informazioni aggiuntive», si salva, e
   riaprendola la tendina **chiusa** mostra il riassunto di quello che c'è dentro.
2. **Quella spesa arriva sull'altro telefono con negozio e tag**, e i due elenchi di negozi noti
   coincidono. È il solo modo di sapere che i campi nuovi attraversano davvero il sync cifrato.
3. **Cambiando un filtro cambiano tutti i grafici insieme**, e il totale in testa continua a coincidere
   con la somma di ognuno di essi. Filtrando per una persona, l'importo di una spesa divisa a metà è
   **la metà**.
4. **Si toglie un widget, si chiude l'app e la si riapre, e il widget è ancora tolto.** Poi si
   riordina, e l'ordine regge allo stesso giro.
5. **Heatmap, treemap e curve si leggono in tema chiaro e in tema scuro**, e la heatmap si capisce
   anche senza distinguere le tinte — dalla legenda in euro e dal tocco sulla cella.
6. **Con un solo membro nel gruppo**, i widget che ne vogliono due dicono cosa manca invece di sparire.

Restano validi, e **vengono prima di tutto questo**, i criteri di «fatto» dei piani
[v2](piano-v2-profili-gruppi-sync.md#criterio-di-fatto-end-to-end) e
[v3](piano-v3-tab-gruppi-azzeramento-sync.md#criterio-di-fatto-end-to-end): il sync fra due telefoni
fisici in entrambe le direzioni non è mai stato visto funzionare. Questo piano non lo sostituisce, e il
punto 2 qui sopra ne dipende.

---

## Rischi noti

| Rischio                                                              | Mitigazione                                                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Il filtro persona produce numeri plausibili ma sbagliati             | `amountFor` è una funzione sola, testata, e nessun grafico legge `amountCents` da sé. Punto 3 del criterio di «fatto» |
| `react-native-svg` si comporta diversamente fuori dal QR             | `expo export` a ogni step; lo Step 26 è il primo a esercitarlo davvero, e non aggiunge altro                          |
| La schermata rallenta con molte spese                                | Una lettura sola per periodo, `applyQuery` e un `useMemo` per widget. `listExpenses` resta una scansione lineare      |
| Il form della spesa peggiora — è la schermata che si apre più spesso | La tendina è chiusa di default e l'ordine del passo 7 non si tocca. Nessun campo obbligatorio in più                  |
| L'estrazione di `Chip` rompe due punti già collaudati del form       | Stesso step, un commit solo, `expo export` e prova sul telefono prima di chiudere                                     |
| La dashboard diventa una discarica di widget                         | Il default riproduce la schermata di oggi, non il catalogo. Aggiungere è una scelta esplicita                         |
| Un tag scritto in due modi produce due voci                          | `tagKey` normalizza in scrittura, e i chip propongono quelli già usati invece di far ridigitare                       |
| Il piano cresce e non finisce                                        | Sei step, uno per sessione, e ognuno lascia il repo verde e qualcosa di usabile in mano                               |
| I campi nuovi non arrivano davvero all'altro telefono                | Punto 2 del criterio di «fatto», che dipende dalla prova di sync mai eseguita dei piani v2 e v3                       |

---

## Fuori perimetro

- **Fascia oraria delle spese** — la spesa non ha un'ora, e `createdAt` dice quando è stata digitata.
  Un campo `time` è possibile ma è una domanda in più nel form: sarà uno step suo, se servirà.
- **Conto e metodo di pagamento** — escluso in fase di progetto. Vale la stessa ragione: ogni campo in
  più è una scelta in più nella schermata che si apre più spesso.
- **Negozi e tag come entità gestibili** (colore, rinomina globale, unione di due doppioni) — si
  comprano dopo, se il vocabolario derivato si rivelerà stretto.
- **Grafici aggregati su più gruppi** — richiederebbero più `Y.Doc` montati insieme, la scelta
  architetturale che il progetto non ha mai attraversato. Vale ancora la ragione scritta nel
  [piano v3](piano-v3-tab-gruppi-azzeramento-sync.md).
- **Drag & drop, animazioni con worklet, selettore di date nativo** — tutti moduli nativi, tutti una
  build EAS nuova.
- **Librerie di charting** — la geometria sta in `packages/core`, dove si prova.
- **Esportare un grafico come immagine** — vorrebbe una rasterizzazione e il foglio di condivisione,
  che è un pezzo a sé.
- **Previsioni, spese ricorrenti, categorizzazione automatica** — sono un piano diverso, e nessuna di
  esse è una visualizzazione.
- **Nuove build EAS** — nessuna. Tutto ciò che questo piano usa è già dentro la development build
  installata.
