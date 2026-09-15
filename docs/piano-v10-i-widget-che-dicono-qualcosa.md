# JuTrack — Piano v10: i widget dicono qualcosa, e da lì comincia una spesa

> Punto d'ingresso del progetto: [STATO.md](STATO.md). **Da dove viene questo piano:** i widget sulla
> home di un telefono vero, dopo tre giorni che ci sono. Scritto il 15 settembre 2026.
>
> **Occupa gli Step 71 e 72**, uno per sessione. I numeri sono già scritti in
> [registro.md](registro.md).
>
> **Dipende dal [Piano v9](piano-v9-la-frase-che-diventa-una-spesa.md), ma solo per metà:** lo Step
> 72 atterra sul foglio della frase dello Step 68. Se il v9 non fosse fatto, il «+» aprirebbe il
> form normale — stessa rotta, un gesto in più — e lo step resterebbe valido.
>
> **Ogni misura e ogni riferimento qui sotto è stato letto nel codice**, e le proprietà della
> libreria vengono dai suoi tipi (`react-native-android-widget@0.22.0`), non dalla memoria.

## Contesto

1. **I due widget mostrano un numero fermo, e dicono poco.** «Saldo» e «Speso questo mese» sono lo
   stesso rettangolo con una cifra in mezzo: nessun andamento, nessun confronto, nessun colore che
   cambi nel tempo. Un widget che dice sempre la stessa cosa nello stesso modo smette di essere
   guardato, e allora tanto vale aprire l'app.
2. **Dalla home non si può cominciare una spesa.** Tutto il rettangolo apre l'app
   ([`WidgetCard.tsx`](../apps/mobile/src/features/widgets/WidgetCard.tsx)), e da lì si tocca
   «Nuova spesa». Il gesto più frequente dell'app — registrare una spesa appena fatta — passa per
   due schermate che non servono a registrarla.

## La cosa che il codice sapeva già (decisione 0)

**Decisione.** Non si tocca l'architettura dei widget: resta quella dello Step 34, e tutte e due gli
step di questo piano ci stanno dentro senza forzarla.

**Perché.** [`snapshot.ts:1-38`](../apps/mobile/src/features/widgets/snapshot.ts#L1-L38) spiega il
vincolo della piattaforma: il widget lo disegna un **task headless** che «non ha niente dell'app —
nessun provider, nessun `Y.Doc` montato, nessuna chiave presa dal portachiavi». Quindi il disegno
non calcola, **legge** un foglietto in `app_meta` che l'app ha lasciato. Tutto ciò che questo piano
aggiunge — una striscia, una percentuale, una frase in più — si calcola **nell'app** e si scrive lì.

Quattro cose che il codice e la libreria hanno già, e che rendono questo piano piccolo:

| Serve…                                    | Esiste già                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| un grafico dentro il widget               | `SvgWidget` accetta una **stringa SVG**, e `chart/path.ts` produce esattamente stringhe SVG (`linePath`, `areaPath`)                                                         |
| sapere quanto è grande il rettangolo      | `widgetInfo` porta `width` e `height` in dp, e arriva a tutti e due i percorsi di disegno                                                                                    |
| un pezzo di widget che apre una schermata | `clickAction: 'OPEN_URI'` con `clickActionData: { uri }`, e in `app.json` lo `scheme` `jutrack` c'è già                                                                      |
| i numeri da mostrare                      | `totalsByDay`, `averagePerDay` ([`insights/series.ts`](../packages/core/src/insights/series.ts)) e `budgetStatuses` ([`budget.ts`](../packages/core/src/insights/budget.ts)) |

**Il campo che aggiunge un campo non rompe i telefoni fermi.** Lo dice il commento dello Step 34, e
la previsione ha già retto una volta: _«`month` è entrato accanto a `balance` senza toccare una riga
del saldo, e un telefono rimasto al foglietto dello Step 34 continua a disegnare il saldo con il
totale del mese assente — invece del foglietto intero illeggibile»_.

**Serve una build EAS?** **No per i due step di questo piano**, e **sì** per tre cose che perciò non
ci sono (ultima sezione): un terzo widget, una dimensione nuova e le anteprime del selettore. Il
nome di un widget diventa una classe `AppWidgetProvider` nel manifest — lo scrive
[`module.ts:7-17`](../apps/mobile/src/features/widgets/module.ts#L7-L17) — e il manifest esiste solo
dopo una build. Tutto ciò che sta **dentro** i due rettangoli già dichiarati è JavaScript, quindi
viaggia via etere con `version` invariata, come vuole
[versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md).

---

## Le decisioni

### 1 · Non nasce un terzo widget: si riempiono i due che ci sono

**Decisione.** «Saldo» e «Speso questo mese» restano i due soli provider. Nessun nome nuovo in
`WIDGET_NAMES` né in `app.json`.

**Perché.** Un nome nuovo è codice nativo, quindi una build EAS e un passaggio dal Play Store per
chi ha l'app installata — mentre i due rettangoli sono **già sulla home** e si aggiornano da soli
stanotte. E il contenuto che manca non è un terzo numero: è il **contorno** dei due che ci sono.

**Vincolo.** `WIDGET_NAMES` non cambia. Se cambia, questo piano ha sbagliato strada.

### 2 · Il foglietto cresce per campi nuovi, mai per campi cambiati

**Decisione.** `BalanceSnapshot` e `MonthSnapshot` guadagnano campi **facoltativi**; i tre esistenti
(`group`, `amount`, `caption`) restano com'erano, con lo stesso significato.

**Perché.** È già successo ed è già andata bene (decisione 0), e il caso che protegge è reale: fra
l'aggiornamento via etere e il primo avvio dell'app può passare mezza giornata, e in mezzo il
sistema disegna i widget col foglietto vecchio. Un campo rinominato darebbe un rettangolo vuoto
sulla home in quella finestra, cioè il difetto peggiore che un widget possa avere — si legge come
un'app rotta.

**Vincolo.** Ogni campo nuovo è opzionale e ha un ripiego disegnabile. Il test è `parseSnapshot` su
un foglietto in forma vecchia, che deve dare un widget completo meno le parti nuove.

### 3 · Il grafico nel widget è la stessa geometria dei Grafici, già cotta

**Decisione.** La striscia degli ultimi giorni si calcola nell'app con `totalsByDay` e `areaPath`,
e finisce nel foglietto **come stringa SVG**; il widget la disegna con `SvgWidget`.

**Perché.** È l'unica forma che rispetta la decisione 0 — il task headless non ha le spese, ha il
foglietto — e nello stesso tempo evita la seconda implementazione di un grafico: `chart/path.ts` non
importa `react-native` (lo vieta `eslint.config.mjs` su tutto `packages/core`), quindi la stessa
funzione che disegna l'area nei Grafici produce la stringa per la home. Due curve calcolate da due
codici diversi si sarebbero contraddette il giorno di un arrotondamento.

**Vincolo.** La stringa SVG ha un tetto di lunghezza e un numero di punti fisso (quattordici giorni,
un punto al giorno): il foglietto sta in `app_meta`, e un campo che cresce con la storia del gruppo
diventerebbe una riga di database che si riscrive a ogni spesa.

### 4 · Il widget cambia con la propria dimensione, e i due percorsi di disegno devono restare d'accordo

**Decisione.** La vista diventa una funzione della dimensione: `widgetInfo.width`/`height` decidono
quante righe entrano — la sola cifra su un rettangolo piccolo, la cifra più la striscia e il
confronto su uno largo.

**Perché.** `resizeMode` è `horizontal|vertical` in `app.json` da sempre: il rettangolo si allarga
già, e oggi a schermo cambia solo la dimensione del carattere
(`adjustsFontSizeToFit` in `WidgetCard.tsx`). È lì che «graficamente statico» si vede di più.

**Vincolo — ed è il punto di tutto lo step.** I percorsi che disegnano sono **due**: il task
headless, che ha `widgetInfo` per costruzione, e l'app, che chiama `requestWidgetUpdate` in
[`publish.ts`](../apps/mobile/src/features/widgets/publish.ts). Il secondo oggi **precalcola la
vista e ignora l'argomento**: `renderWidget: () => view`. Se la vista diventa funzione della
dimensione e quella riga resta com'è, il widget si disegna bene quando lo si ridimensiona e male
appena si registra una spesa — con l'app in mano, che è il momento in cui lo si guarda.

### 5 · Dal widget la spesa comincia **intera**

**Decisione.** Il «+» del widget apre l'app sul foglio della frase (Step 68 del
[v9](piano-v9-la-frase-che-diventa-una-spesa.md)), via `clickAction: 'OPEN_URI'`. **Il widget non
scrive niente nel documento**, e non esiste una spesa «da completare dopo».

**Perché.** Una spesa registrata a metà è un numero senza chi l'ha pagata e senza com'è divisa: nei
saldi entra sbagliata, e nei grafici entra comunque. L'elenco delle cose da sistemare sarebbe una
seconda lista da guardare, cioè un secondo posto in cui dimenticarsene. La scorciatoia giusta non è
scrivere meno: è **scrivere tutto in una riga**, che è ciò che il v9 ha costruito.

**Vincolo.** Il widget resta di sola lettura: nessuna scrittura sul vault da un task headless, dove
non ci sono né la chiave né il documento montato.

### 6 · Due zone toccabili, e si vedono

**Decisione.** Il rettangolo continua ad aprire l'app (`OPEN_APP`, com'è oggi); il «+» in un angolo
apre la spesa. Due `accessibilityLabel` distinte.

**Perché.** Un widget in cui una parte fa una cosa e il resto un'altra, senza che si veda quale è
quale, è peggio di un widget che ne fa una sola: il bersaglio va disegnato. E la zona grande deve
restare quella innocua — chi sbaglia mira apre l'app, non una schermata di scrittura.

**Vincolo.** Il «+» non copre la cifra a nessuna delle dimensioni ammesse dal `resizeMode`.

---

## Step 71 — «i due widget dicono qualcosa di più»

| File                                               | Cosa                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/mobile/src/features/widgets/snapshot.ts`     | i campi nuovi, tutti facoltativi (decisione 2) e il loro `parseSnapshot`                     |
| `apps/mobile/src/features/widgets/compose.ts`      | li calcola: striscia, ritmo, confronto col mese scorso (decisione 3)                         |
| `apps/mobile/src/features/widgets/WidgetCard.tsx`  | la card diventa funzione della dimensione, e accoglie `SvgWidget` (decisione 4)              |
| `apps/mobile/src/features/widgets/views.tsx`       | `balanceView`/`monthView` prendono la dimensione                                             |
| `apps/mobile/src/features/widgets/publish.ts`      | `draw` smette di precalcolare la vista: `renderWidget: (info) => …` (**il punto qui sotto**) |
| `apps/mobile/src/features/widgets/handler.tsx`     | passa `widgetInfo` alle viste                                                                |
| `apps/mobile/src/features/widgets/compose.test.ts` | i campi nuovi, e il foglietto in forma vecchia che resta disegnabile                         |

**Esiste già e non si riscrive:** `totalsByDay` e `averagePerDay` (`insights/series.ts`), `areaPath`
e `linePath` (`chart/path.ts`), le due palette e i token (`theme/tokens.ts`), `changedWidgets` che
evita le scritture inutili, e tutto `refresh.ts`.

### Il punto che non va dimenticato

**`publish.ts` ignora `WidgetInfo`, e lo fa da sempre.** La riga è
`renderWidget: () => view`, con `view` calcolata prima del giro: funziona benissimo finché la vista
non dipende dalla dimensione, ed è esattamente ciò che questo step cambia. Il guasto che ne
seguirebbe non si vede nei test — il modulo nativo lì non esiste — e non si vede nemmeno
ridimensionando il widget, perché quel gesto passa dall'**altro** percorso. Si vede solo così:
widget largo sulla home, si registra una spesa, e il rettangolo si ridisegna nella versione stretta.

### Criterio di «fatto»

Col telefono in mano, widget «Speso questo mese» sulla home:

1. il rettangolo mostra il totale, **la striscia degli ultimi quattordici giorni** e una riga di
   confronto («di questo passo, ~840 € a fine mese»);
2. stringilo a due celle: la striscia sparisce, restano gruppo, cifra e didascalia — nessun testo
   tagliato a metà;
3. riallargalo: la striscia torna;
4. **con l'app aperta**, registra una spesa: il widget si aggiorna e resta **largo**, con la striscia
   che adesso comprende la spesa appena fatta;
5. spegni e riaccendi lo schermo: nessun rettangolo vuoto.

---

## Step 72 — «la spesa comincia dalla home»

| File                                              | Cosa                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/mobile/src/features/widgets/WidgetCard.tsx` | la zona «+», con `clickAction: 'OPEN_URI'` e la sua etichetta (decisioni 5 e 6) |
| `apps/mobile/src/features/widgets/deeplink.ts`    | **nuovo** — l'URI in un posto solo, e il suo test                               |
| `apps/mobile/src/app/(gruppo)/expense/new.tsx`    | accoglie l'arrivo dal widget: apre il foglio della frase invece del solo form   |
| `apps/mobile/src/features/widgets/handler.tsx`    | ignora esplicitamente `WIDGET_CLICK`, che con `OPEN_URI` non arriva             |

**Esiste già e non si riscrive:** lo `scheme` `jutrack` in `app.json`, le rotte tipizzate di
`expo-router`, il foglio della frase dello Step 68 e `GroupRequired` per il caso «nessun gruppo».

### Il punto che non va dimenticato

**Il widget può essere toccato quando l'app non è in uno stato che se lo aspetta.** Tre casi reali,
e nessuno dei tre dà una schermata sensata da solo: nessun gruppo (chi ha appena azzerato il
telefono), il gruppo aperto adesso è un altro rispetto a quello scritto nel foglietto, e l'app già
aperta su un'altra schermata. Il primo è già risolto da `app/(gruppo)/_layout.tsx`, che mostra
`GroupRequired`; **il secondo va deciso in questo step** — il widget dice di che gruppo parla, e
aprire la scrittura su un gruppo diverso da quello letto sulla home è il modo più silenzioso di
mettere una spesa nel posto sbagliato.

### Criterio di «fatto»

1. Tocca il «+» sul widget con l'app **chiusa**: si apre direttamente il foglio della frase, non
   l'elenco delle spese;
2. scrivi `12 bar` e salva: torni alla home e il widget mostra il totale aggiornato;
3. tocca il resto del rettangolo: si apre l'app dove si apriva prima;
4. con due gruppi, cambia gruppo nell'app, torna alla home e tocca il «+»: la spesa si scrive nel
   gruppo che il widget sta mostrando, oppure il widget lo dice prima — mai in silenzio nell'altro.

---

## Cosa questo piano ha deciso di NON fare

- **Non si tocca: un terzo widget.** Un nome nuovo è un provider nel manifest, quindi una build EAS
  e un giro dal Play Store. Se un giorno ne servirà uno, entra nella prossima build **insieme** alle
  due voci qui sotto, come lo Step 30 ha fatto per notifiche e widget insieme.
- **Rimandato alla prossima build EAS: le anteprime del selettore**, oggi riquadri vuoti — è il
  difetto aperto in [STATO.md](STATO.md). Si chiude con `previewImage` nella configurazione del
  plugin, cioè una risorsa nell'APK: nessun aggiornamento via etere può metterla lì.
- **Rimandato alla prossima build EAS: le dimensioni dichiarate** (`minWidth`, `targetCell`,
  `maxResize`). Stanno in `app.json` e finiscono nel manifest.
- **Rimandato: «aggiungi il widget» da dentro l'app.** La libreria ha `requestPinWidget`, che
  aprirebbe la richiesta del launcher e aggirerebbe le anteprime vuote — ma è un metodo **nativo**, e
  nessuno ha ancora verificato che sia nella build installata il 5 settembre. Si riapre dopo averlo
  provato dalla diagnostica, con la stessa guardia di `countPlacedWidgets`.
- **Rimandato: la spesa scritta senza aprire l'app**, con un `clickAction` personalizzato che scrive
  dal task headless. Lì non ci sono né la chiave né il documento montato: significherebbe rimontare
  il vault per una riga, ed è la ragione per cui la decisione 5 apre l'app invece.
- **Non si fa: la spesa da completare dopo.** Un importo registrato senza chi paga e senza come si
  divide entra sbagliato nei saldi ed entra comunque nei grafici, e l'elenco delle cose da sistemare
  è un secondo posto in cui dimenticarsene. La scorciatoia è la frase del
  [Piano v9](piano-v9-la-frase-che-diventa-una-spesa.md), che scrive tutto in una riga.

## Riepilogo

| Step | Cosa                                      | Rischio                                                                    | Build EAS |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------- | --------- |
| 71   | I due widget dicono qualcosa di più       | Medio: tocca il disegno, che ha due percorsi e uno non si vede dai test    | No        |
| 72   | Il «+» che apre la scrittura di una spesa | Medio: il deep link si prova solo col telefono, e il gruppo va deciso bene | No        |

Baseline di partenza: **1469 test verdi** (723 core + 692 app + 54 relay), `typecheck`, `lint` e
`format:check` puliti, come dichiara [STATO.md](STATO.md) al 13 settembre 2026.
