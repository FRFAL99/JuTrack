# JuTrack — Piano v5: notifiche, widget Android, valuta e lingua nel profilo

> Punto d'ingresso del progetto: [STATO.md](STATO.md). Piano approvato:
> `~/.claude/plans/ho-appena-fatto-delle-nested-conway.md`.
>
> **Tre step su dodici chiusi**, tutti il 12 agosto 2026: lo
> [Step 29](#step-29--valuta-di-default-nel-profilo), lo
> [Step 30](#step-30--infrastruttura-nativa-condivisa) — **build EAS compresa**, installata e
> verificata con la diagnostica a 16 passaggi su 16 — e lo Step 31, il promemoria spese. Gli
> Step 32–35 lavorano in JS sopra quella build e non ne chiedono altre.
>
> **Sullo Step 31 il piano diceva «promemoria periodico», e periodico non è.** Una notifica locale
> si programma prima e scatta da sola, senza che nessuno possa rivalutare la condizione al momento
> in cui suona: la regola è diventata una **scadenza** ricalcolata alle tre occasioni che l'app
> vede — apertura, spesa registrata, interruttore toccato. Il dettaglio è in
> [STATO.md](STATO.md#il-promemoria-spese-step-31), e riguarda anche il 32 e il 33.
>
> **Due punti dello Step 30 erano scritti male qui**, e vanno letti da
> [STATO.md](STATO.md#linfrastruttura-nativa-step-30):
>
> - **I due widget vanno dichiarati in questo step, non al 34–35.** Il plugin di
>   `react-native-android-widget` ha `widgets: Widget[]` obbligatorio e ogni voce diventa un
>   `<receiver>` nel manifest: dichiararli dopo vorrebbe dire una **seconda** build EAS, cioè
>   proprio ciò che lo Step 30 esiste per evitare.
> - **`POST_NOTIFICATIONS` non va aggiunto**: lo dichiara già il manifest di `expo-notifications`.
>   È rimasto in `app.json` per leggibilità, non per necessità.
>
> **Due punti dello Step 29 erano scritti male qui, e sono stati corretti implementandolo** — vanno
> letti da [STATO.md](STATO.md#la-valuta-di-default-nel-profilo-step-29), non da §Step 29 qui sotto:
>
> 1. **«L'unico consumatore nuovo è il default nel form» era falso.** Il simbolo `€` era scritto a
>    mano in 48 punti (il default di `formatMoney` più otto letterali nel JSX): senza toccarli, una
>    valuta scelta avrebbe prodotto un'etichetta falsa accanto a ogni numero. Il passaggio del
>    simbolo fa parte dello step.
> 2. **«L'utente può comunque cambiarlo spesa per spesa» non era vero.** `Expense.currency` esiste
>    nel modello, ma il form non ha mai avuto un campo valuta e `ExpenseFormValues` non la portava.
>
> E una conseguenza che il piano non dichiarava: **JuTrack non converte**, quindi due membri con
> valute diverse nello stesso gruppo producono totali che sommano unità diverse. Il campo resta
> locale al telefono — su questo il piano ha ragione — ma la scelta è comune di fatto, e il
> selettore lo dice.

## Contesto

Il redesign v4 è chiuso nel codice ([STATO.md](STATO.md)): resta solo la prova su due telefoni
fisici, niente di nuovo da scrivere per i quattro piani precedenti. Questo quinto piano nasce da una
richiesta di prodotto e apre tre filoni indipendenti fra loro:

1. **Notifiche** — solo locali per ora (promemoria, soglie di budget, esito sync). Niente push fra
   dispositivi in questo giro: aggiungerebbe al relay una mappa `vaultId → token`, un aumento della
   superficie di metadata rispetto al modello attuale in cui il relay non sa nulla di chi sincronizza
   cosa. Resta un passo futuro, da riaprire con una discussione esplicita sul trade-off di privacy.
2. **Widget Android** — due widget nella home del telefono: **saldo del gruppo aperto** e **totale
   speso nel mese**.
3. **Profilo utente** — valuta di default e lingua, **solo a livello di profilo** (locale al
   telefono/persona), mai a livello di gruppo. Per la lingua si parte con l'infrastruttura i18n
   completa, non solo il campo di preferenza.

Punti fermi emersi dall'esplorazione del repo, che determinano l'approccio:

- **Nessun account, nessun backend applicativo.** L'identità è un `Profile` locale
  (`apps/mobile/src/state/profile.ts`), uno per telefono/persona, condiviso fra i gruppi ma **mai
  sincronizzato dentro un vault**. È già, di fatto, il posto giusto per impostazioni "mie e basta":
  aggiungerci `currency`/`language` non introduce alcun problema di sync fra i membri di un gruppo.
- **Il relay è cieco per progetto** (`services/relay/`): vede blob cifrati opachi, instradati per
  `vaultId`. Qualunque canale di notifica vera fra dispositivi richiederebbe insegnargli qualcosa —
  per questo resta fuori da questo piano.
- **App Expo managed, nessuna cartella `android/`.** I moduli nativi già aggiunti (`expo-camera`,
  `expo-sqlite`, …) passano da config plugin dichiarati in `app.json` più build EAS, senza mai un
  `expo prebuild` manuale — lo stesso vale per `expo-notifications` e per una libreria di widget
  (`react-native-android-widget`, che ha un proprio config plugin).
- **Zero infrastruttura i18n oggi.** Tutte le stringhe sono italiano scritto a mano in ogni
  componente. È lavoro reale e ampio, coerente con la cadenza "un passo a sessione" già usata per gli
  altri tre piani e per il redesign.
- **La valuta esiste già, ma solo per spesa** (`Expense.currency`, default `'EUR'` in
  `packages/core/src/model/doc.ts` e `store.ts`; formattazione in
  `packages/core/src/model/money.ts:formatMoney`). Manca un default a livello di profilo che
  precompili il campo nel form di nuova spesa.

### Esito voluto

Notifiche locali utili senza toccare il modello di minaccia attuale, due widget Android che mostrano
dati sempre aggiornati quando l'app è stata aperta di recente, e un profilo dove ciascuno sceglie la
propria valuta e lingua senza che questo influenzi gli altri membri dello stesso gruppo.

---

## Decisioni prese

| Ambito                         | Scelta                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Notifiche                      | **Solo locali.** Niente FCM/APNs, niente token, niente modifica al relay         |
| Push fra dispositivi           | **Fuori dal piano.** Riaprire solo con una discussione esplicita sulla privacy   |
| Widget: contenuto              | **Due widget**: saldo del gruppo aperto, totale speso nel mese                   |
| Widget: aggiornamento          | **Ad apertura app / fine sync.** Nessun refresh in background nell'MVP           |
| Valuta e lingua                | **Solo nel profilo**, mai nel gruppo. Locali al telefono, non sincronizzate      |
| Build native                   | **Una sola build EAS nuova**, con entrambi i plugin (notifiche + widget) insieme |
| Libreria widget                | `react-native-android-widget` (config plugin, nessun `expo prebuild` manuale)    |
| Libreria i18n                  | `i18next` + `react-i18next` + `expo-localization`. Puro JS, nessuna build in più |
| Traduzione                     | **Progressiva, schermata per schermata**, non tutta in un colpo solo             |
| Modello Yjs / schema del vault | **Non toccato.** Nessuno dei tre filoni scrive nel documento condiviso           |

### Perché una sola build EAS per notifiche e widget

Sia le notifiche locali sia i widget richiedono un modulo nativo, quindi una build EAS nuova — un
costo che il progetto ha sempre evitato quando possibile ("si paga quando servirà", ripetuto più
volte nei piani precedenti a proposito di drag & drop, date picker, bottom sheet), ma qui è reale e
non aggirabile: **niente widget Android e niente notifiche di sistema senza codice nativo.** Per non
pagarlo due volte, i due config plugin (`expo-notifications` e `react-native-android-widget`) vanno
aggiunti **insieme, in un solo step** (Step 30), con una sola build EAS di sviluppo che li porta
entrambi. Gli step successivi di notifiche e widget lavorano in JS sopra quella build, senza
richiederne altre — a meno che il refresh in background dei widget (Step 36, esplicitamente marcato
opzionale) risulti necessario dopo l'uso reale.

### Perché niente push fra dispositivi in questo giro

Sarebbe la funzione più utile ("qualcuno ha aggiunto una spesa nel gruppo"), ma il relay
(`services/relay/`) oggi non sa nulla di chi sincronizza cosa — vede solo blob cifrati per `vaultId`.
Farlo davvero richiede insegnargli una mappa `vaultId → token push`, che è un aumento reale della
superficie di metadata rispetto al modello attuale, oltre a un provider esterno (FCM) che vedrebbe
"c'è stato un aggiornamento per questo dispositivo" anche se non il contenuto. È una scelta di
prodotto e di soglia di privacy che va presa esplicitamente, non di passaggio dentro un piano più
ampio — per questo resta un passo futuro, non cancellato ma non aperto qui.

### Perché la valuta e la lingua stanno nel `Profile` e non nel gruppo

Il `Profile` (`apps/mobile/src/state/profile.ts`) è già, per costruzione, locale al telefono e mai
scritto nel vault condiviso: è nato per risolvere "chi sono io", non "come vede il gruppo le cose".
Metterci valuta e lingua significa che due persone nello stesso gruppo possono avere impostazioni
diverse senza che questo generi un conflitto di sync — non c'è nulla da fondere, perché non è mai
stato nulla di condiviso. L'alternativa, un campo sul gruppo, costringerebbe tutti i membri alla
stessa scelta ed è esplicitamente ciò che l'utente non vuole.

### Perché `react-native-android-widget` e non un `expo prebuild` manuale

Il progetto non ha mai avuto una cartella `android/` e ha sempre preferito i config plugin dichiarati
in `app.json` (vedi `expo-camera`, aggiunto senza toccare nulla a mano). `react-native-android-widget`
segue lo stesso schema: un plugin che genera il codice nativo necessario durante la build EAS, senza
un progetto Android da mantenere a mano nel repo. L'alternativa — `expo prebuild` e gestione manuale
del progetto Android — introdurrebbe una seconda fonte di verità sulla configurazione nativa, in
contraddizione con come il resto del progetto è già strutturato.

### Perché `i18next` e non una soluzione scritta in casa

Non richiede moduli nativi (quindi nessuna build EAS aggiuntiva, a differenza di notifiche e widget),
ha supporto maturo per React Native tramite `react-i18next`, e si integra con `expo-localization` per
il rilevamento della lingua di sistema come default iniziale. Scriverne una versione minima in casa
risparmierebbe una dipendenza ma andrebbe reinventata man mano che servono plurali, interpolazioni o
fallback — cose che il progetto dovrà comunque affrontare non appena la traduzione supera le prime
schermate.

---

## Step

| Step | Filone    | Contenuto                                                                                                                                     | Build EAS |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | :-------: |
| 29   | Profilo   | Valuta di default nel `Profile`, selettore in `tu.tsx`, precompila il form nuova spesa                                                        |    No     |
| 30   | Infra     | Config plugin `expo-notifications` + `react-native-android-widget`, permessi Android, build EAS nuova, verifica diagnostica                   |  **Sì**   |
| 31   | Notifiche | Promemoria locale "registra una spesa" (programmato, cancellabile)                                                                            |    No     |
| 32   | Notifiche | Avviso locale soglia di budget superata                                                                                                       |    No     |
| 33   | Notifiche | Notifica locale esito sync (fallito/bloccato a lungo)                                                                                         |    No     |
| 34   | Widget    | Widget "Saldo del gruppo aperto" — refresh quando l'app è in primo piano/dopo sync                                                            |    No     |
| 35   | Widget    | Widget "Totale speso nel mese" — stesso meccanismo di refresh                                                                                 |    No     |
| 36   | Widget    | _(opzionale, da valutare dopo l'uso reale)_ refresh periodico in background via WorkManager                                                   |   Forse   |
| 37   | Lingua    | Infrastruttura i18n (libreria, provider, dizionari IT/EN), campo `language` nel `Profile`, selettore in `tu.tsx`                              |    No     |
| 38   | Lingua    | Traduzione EN delle tre schermate più aperte: home spese, nuova spesa, gruppi                                                                 |    No     |
| 39   | Lingua    | Traduzione EN del resto: grafici/dashboard, Tu/impostazioni, onboarding, pairing, backup/export, azzera                                       |    No     |
| 40   | Verifica  | Prova end-to-end su telefono reale: notifiche mostrate davvero, widget che si aggiornano, cambio lingua visibile, valuta di default applicata |    No     |

### Step 29 — Valuta di default nel profilo

Campo `currency?: string` additivo su `Profile` (`apps/mobile/src/state/profile.ts`), con lo stesso
trattamento difensivo già usato per `identity` in `loadProfile`: un valore illeggibile non deve far
fallire il caricamento dell'intero profilo. UI: un `CurrencyPicker` in `tu.tsx`, sul modello di
`ColorChoice.tsx` già esistente in `features/profile/`. L'unico consumatore nuovo è il default del
campo valuta nel form di nuova spesa (`ExpenseForm.tsx`), che oggi non ha un default esplicito legato
all'utente — l'utente può comunque cambiarlo spesa per spesa, perché `Expense.currency` resta
per-spesa. Nessuna build, nessun impatto sullo schema Yjs.

### Step 30 — Infrastruttura nativa condivisa

I due config plugin insieme in `app.json`, il permesso `POST_NOTIFICATIONS` (Android 13+) accanto a
quello già presente per la fotocamera, e **una** build EAS di sviluppo nuova. Verifica: la
diagnostica esistente sul telefono (quella che oggi conta "14 passaggi su 14") va estesa con un
controllo che i due moduli nativi sono effettivamente linkati, sullo stesso principio già applicato
per crypto, SQLite e SecureStore.

### Step 31–33 — Notifiche locali

`expo-notifications` in locale, senza token FCM/APNs e senza server: promemoria programmati con
`scheduleNotificationAsync`, letti e cancellati sul dispositivo. Tre contenuti concreti, scelti
perché derivabili da dati già presenti nel codice:

- **Promemoria periodico** se non si registra una spesa da N giorni.
- **Soglia di budget superata**, riusando i calcoli già in `packages/core/src/insights/`.
- **Sync bloccato da tempo**, riusando lo stato già derivato in `features/sync/describe.ts`.

Ogni notifica va dietro un interruttore proprio (non un solo "notifiche sì/no"), perché sono tre
motivi diversi di essere avvisati e non tutti li vorranno tutti e tre.

### Step 34–35 — I due widget

`react-native-android-widget` legge dati già disponibili lato JS (saldo dal motore di calcolo
esistente, totale del mese da `insights/`) e li spinge al widget nativo con `requestWidgetUpdate` nei
punti in cui l'app già ricalcola quei valori — apertura della schermata pertinente, fine di un ciclo
di sync. Entrambi i widget mostrano il dato del **gruppo aperto** (lo stesso concetto già usato in
tutto il redesign, es. `GroupHome.tsx`), non un'aggregazione fra gruppi.

### Step 36 — Refresh in background (opzionale)

Il refresh **mentre l'app non è aperta** è un problema a parte — un `WorkManager`/headless task
Android — e resta deliberatamente fuori dall'MVP. Si riapre solo se, dopo l'uso reale dei due widget,
il refresh-solo-ad-apertura risulta insufficiente: stessa logica già applicata più volte nel progetto
per rimandare un costo finché non risulta necessario davvero (drag & drop, date picker, bottom
sheet).

### Step 37 — Infrastruttura i18n

`i18next` + `react-i18next`, con `expo-localization` per il rilevamento della lingua di sistema come
default iniziale. Campo `language?: string` additivo sul `Profile`, stesso schema del campo valuta
(Step 29), con selettore in `tu.tsx`. A fine step l'infrastruttura esiste e funziona, ma solo un
sottoinsieme minimo di stringhe è davvero tradotto — sufficiente a verificare che il cambio lingua è
visibile, non a coprire l'app.

### Step 38–39 — Traduzione EN

Schermata per schermata, non tutta insieme, con lo stesso ritmo "un passo a sessione" già rodato nel
redesign visivo. Lo Step 38 copre le tre schermate più aperte (home spese, nuova spesa, gruppi) — le
stesse che il passo 6 e 7 del redesign avevano identificato come quelle che si aprono più spesso. Lo
Step 39 copre il resto: grafici/dashboard, Tu/impostazioni, onboarding, pairing, backup/export,
azzera.

### Step 40 — Verifica end-to-end

Notifiche e widget sono per natura non verificabili senza telefono: vanno nella lista di "verificato
su hardware reale" di [STATO.md](STATO.md#cosa-non-è-ancora-stato-verificato-su-hardware-reale), non
spuntati solo perché i test passano. Da controllare nell'ordine in cui un guasto rende inutile
provare il resto: **(1)** le tre notifiche compaiono davvero nella tendina di sistema; **(2)** i due
widget aggiunti alla home si popolano e si aggiornano dopo l'uso dell'app; **(3)** cambiare lingua nel
profilo cambia davvero il testo a schermo; **(4)** una nuova spesa parte con la valuta di default del
profilo.

---

## File critici coinvolti

- `apps/mobile/src/state/profile.ts` — `Profile`, `loadProfile`/`saveProfile`: qui vanno i due campi
  nuovi (`currency`, `language`).
- `apps/mobile/src/app/(tabs)/tu.tsx` e `apps/mobile/src/features/profile/` (`ColorChoice.tsx` come
  modello di picker) — dove vivono i selettori di valuta e lingua.
- `packages/core/src/model/money.ts` (`formatMoney`) e
  `apps/mobile/src/features/expenses/ExpenseForm.tsx` — dove entra il default di valuta.
- `apps/mobile/app.json` — nuovi config plugin (`expo-notifications`, `react-native-android-widget`) e
  permessi Android.
- `packages/core/src/insights/` — dati già pronti per budget/soglie e totale mese, riusati sia dalle
  notifiche sia dal widget "totale del mese".
- `apps/mobile/src/features/sync/describe.ts` — stato di sync già derivato, riusato per la notifica di
  sync bloccata.

## Verifica (per ogni step)

- Logica pura (default valuta, chiavi i18n con fallback, calcolo dei dati mostrati dal widget) va
  coperta da test Vitest, sullo stesso modello già in uso (`split-text.ts`, `extra-fields.ts`).
- `npm run format:check && npm run lint && npm run typecheck && npm test` dopo ogni step, come da CI.
- Dopo lo Step 30 (nuovi config plugin), rifare la build EAS di sviluppo e reinstallarla, esattamente
  come già documentato in [STATO.md](STATO.md) per `expo-camera`.
- Lo Step 40 non è facoltativo: chiude il piano solo dopo la prova su telefono reale, non dopo che i
  test passano.
