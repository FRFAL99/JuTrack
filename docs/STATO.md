# Stato del progetto — punto di partenza

Aggiornato: 2026-08-17 — **tutti e quattro i piani e il redesign visivo sono finiti nel codice, il
quinto piano è a undici step su tredici, e due step di robustezza sono nati fuori dai piani**.

> **Gli Step 42 e 43 non vengono da un piano, ma da una rilettura del progetto**, e chiudono i due
> lati dello stesso rischio — perdere i dati. Il **42** dà una via d'uscita a chi la chiave l'ha già
> persa: `/export` produceva una copia integrale del vault che **nessuno sapeva rileggere**, e adesso
> `parseVaultExport` la rilegge e `/importa` la ricostruisce in un gruppo nuovo. Il **43** prova a
> far sì che non la perda: un quarto avviso dice, una volta per gruppo, che la chiave non risulta
> salvata da nessuna parte. Nessuno dei due chiede una build EAS. Dettaglio in
> [devlog.md](devlog.md); il **40** resta il prossimo step scritto.

Il quarto — [piano-v4-grafici-e-dashboard.md](piano-v4-grafici-e-dashboard.md),
**Step 23–28** — si è chiuso l'11 agosto con la dashboard componibile, e i sette passi del redesign
sono chiusi da prima ([visualdesign.md](visualdesign.md)). Lo stesso giorno è stato scritto il
**quinto piano**, [piano-v5-notifiche-widget-profilo.md](piano-v5-notifiche-widget-profilo.md) —
notifiche locali, due widget Android, valuta e lingua nel profilo — e ne sono entrati nel codice i
**primi undici step su tredici**: la valuta di default nel profilo, l'infrastruttura nativa, il
promemoria spese, l'avviso di budget, quello di sincronizzazione ferma, **tutti e due i widget**, il
refresh in background che li tiene vivi, l'**infrastruttura i18n**, la **traduzione EN delle tre
schermate più aperte** e il **formato dei numeri per lingua**. Restano il resto della traduzione
(40) e la verifica su telefono (41). Il piano ne aveva dodici: il tredicesimo è lo Step 39, nato
dallo Step 38 e inserito in mezzo.

> ⚠️ **Serve una build EAS nuova, ed è la seconda del piano v5.** Lo
> [Step 36](#il-refresh-in-background-step-36) ha messo `updatePeriodMillis: 1800000` in
> `app.json`, e quel numero finisce nell'XML del provider dei widget: **sulla build installata
> oggi la sveglia non suona**, e il refresh in background non parte. Tutto il resto — notifiche,
> widget, disegno, **e la lingua** — funziona già sulla build dello Step 30: lo Step 37 è JS puro
> e non ha aggiunto moduli nativi, deliberatamente (vedi sotto).
>
> ```bash
> cd apps/mobile && npx eas-cli build -p android --profile development
> ```
>
> **Notifiche e widget sono tutti nel codice**: lo [Step 31](#il-promemoria-spese-step-31), lo
> [Step 32](#lavviso-di-budget-step-32) e lo [Step 33](#la-sincronizzazione-ferma-step-33) per le
> tre notifiche, il [34](#il-widget-del-saldo-step-34), il [35](#il-totale-del-mese-step-35) e il
> [36](#il-refresh-in-background-step-36) per i widget. Il prossimo è il **40**, il resto della
> traduzione.
>
> **Lo Step 37 si è scostato dal piano su un punto, ed è scritto qui perché non si scopra dopo:**
> `expo-localization` **non** è stato installato. Serviva solo a leggere la lingua del telefono al
> primo avvio, è un modulo nativo, e avrebbe reso questo il terzo step a chiedere una build —
> rompendo per giunta l'app sulla build oggi installata. Quella lettura la fa
> `Intl.DateTimeFormat().resolvedOptions().locale`, che su Hermes c'è già, dentro un `try` che
> ripiega sull'italiano. Entrate solo `i18next` e `react-i18next`, entrambe JS puro.
>
> **Fra i primi quattro piani non c'è più uno step scritto da fare: quello che resta è la prova su
> due telefoni veri**, e i criteri di «fatto» di tutti e quattro ci passano in mezzo. Il piano v5 è
> un'aggiunta di prodotto separata e procede in parallelo, uno step per sessione.

Documento di orientamento: cosa è fatto, cosa manca, cosa è bloccato. Per il dettaglio di ogni
passaggio c'è [devlog.md](devlog.md), ma **questo file basta per riprendere il lavoro**.

## Avanzamento

| Step                                | Stato | Cosa contiene                                                |
| ----------------------------------- | ----- | ------------------------------------------------------------ |
| 0 — Repo e documentazione           | ✅    | Monorepo npm workspaces, toolchain, ADR, threat model        |
| 1 — Scheletro Expo                  | ✅    | SDK 57, expo-router, tema chiaro/scuro, componenti base      |
| 2 — Crypto                          | ✅    | HKDF, XChaCha20-Poly1305, backup con passphrase              |
| 3 — Modello Yjs e persistenza       | ✅    | VaultStore, SQLite, convergenza CRDT verificata              |
| 4 — UI spese e categorie            | ✅    | Lista, form, categorie, persone — funzionante offline        |
| 5 — Relay Cloudflare                | ✅    | **In produzione**, verificato end-to-end                     |
| 6 — Motore di sincronizzazione      | ✅    | Push/pull cifrato, coda offline, recupero via snapshot       |
| 7 — Pairing via QR                  | ✅    | QR, scanner, incolla manuale, deep link `jutrack://pair`     |
| 8 — Split, saldo, budget, grafici   | ✅    | Saldo, pareggi, budget mensili, barre per categoria e mese   |
| 9 — CI, export, backup della chiave | ✅    | GitHub Actions, export CSV/JSON, backup cifrato della chiave |
| 10 — Sync: correttezza e velocità   | ✅    | Catch-up al boot, push immediato, poll adattivo, `AppState`  |
| 11 — Profili                        | ✅    | Un profilo per persona, il membro nasce da lì                |
| 12 — Più gruppi per telefono        | ✅    | Registro gruppi, tabelle per vault, runtime rimontabile      |
| 13 — Inviti via link                | ✅    | Link condivisibile, pagina `/j` sul Worker                   |
| 14 — Uscire da un gruppo            | ✅    | Cancellazione dal relay, rigenerazione con chiave nuova      |
| 15 — Piano v3 scritto               | ✅    | Quattro tab, gruppo come luogo, azzeramento, sync tarato     |
| 16 — Poll a scala, `markActive`     | ✅    | Scala 2→5→15→60 s invece del gradino 3 s/30 s                |
| 17 — Offline ≠ errore del relay     | ✅    | `offlineRetryMs`, state vector scritto solo se cambia        |
| 18 — Tab Gruppi: elenco → gruppo    | ✅    | Le spese diventano il dettaglio del gruppo, URL invariati    |
| 19 — Tutto il gruppo nel gruppo     | ✅    | Categorie, budget, pareggi, export dietro un'unica guardia   |
| 20 — Quattro tab                    | ✅    | Gruppi, Grafici, Impostazioni, Profilo                       |
| 21 — Nessun gruppo al primo avvio   | ✅    | Fase `absent`, l'utente crea o entra con un invito           |
| 22 — Azzera questo telefono         | ✅    | Wipe totale e ritorno all'onboarding, senza riavvio          |

Piano v4 — [piano-v4-grafici-e-dashboard.md](piano-v4-grafici-e-dashboard.md), **chiuso**:

| Step                           | Stato | Cosa contiene                                                 |
| ------------------------------ | ----- | ------------------------------------------------------------- |
| 23 — Negozio e tag nel modello | ✅    | Due campi additivi su `Expense`, normalizzazione, export a v2 |
| 24 — «Informazioni aggiuntive» | ✅    | Tendina chiusa nel form, suggerimenti, `Chip` condiviso       |
| 25 — La geometria dei grafici  | ✅    | `packages/core/src/chart/` e sette aggregazioni nuove         |
| 26 — I grafici nuovi, in SVG   | ✅    | Linee, aree, heatmap, istogramma, treemap, ciambella          |
| 27 — I sei filtri              | ✅    | `ExpenseQuery`, barra a chip, foglio, selettore di periodo    |
| 28 — La dashboard componibile  | ✅    | Registro dei widget, layout in `app_meta`, `/dashboard`       |

Piano v5 — [piano-v5-notifiche-widget-profilo.md](piano-v5-notifiche-widget-profilo.md), **dieci
step su dodici nel codice**:

| Step                               | Stato | Cosa contiene                                                          |
| ---------------------------------- | ----- | ---------------------------------------------------------------------- |
| 29 — Valuta di default nel profilo | ✅    | Campo `currency` sul `Profile`, selettore in `tu.tsx`, simbolo ovunque |
| 30 — Infrastruttura nativa         | ✅    | Plugin, permesso, build EAS installata, diagnostica 16/16              |
| 31 — Promemoria spesa              | ✅    | Interruttore in Tu, scadenza riarmata a ogni apertura                  |
| 32 — Avviso di budget              | ✅    | Watcher sul documento, segni in `app_meta`, gestore di primo piano     |
| 33 — Sincronizzazione ferma        | ✅    | Terzo interruttore, watcher sulla fase, scadenza di 24 h su disco      |
| 34 — Widget «Saldo»                | ✅    | Foglietto in `app_meta`, task headless, `index.js` come entry          |
| 35 — Widget «Speso questo mese»    | ✅    | Stesso foglietto e stesso rettangolo, didascalia che nomina il mese    |
| 36 — Refresh in background         | ✅    | Sync ogni 30 min dal task headless. **Chiede una build EAS nuova**     |
| 37 — Infrastruttura i18n           | ✅    | `i18next`, campo `language`, selettore in `tu.tsx`, Tu tradotta tutta  |
| 38 — Traduzione EN, tre schermate  | ✅    | Spese, nuova spesa, gruppi, e i sei moduli condivisi sotto             |
| 39 — Formato dei numeri per lingua | ✅    | `NumberFormat` nel core, `@/i18n/money` nell app, guardia ESLint       |
| 40 — Traduzione EN, il resto       | ⬜    | Grafici, dashboard, onboarding, pairing, backup/export, azzera         |
| 41 — Verifica end-to-end           | ⬜    | Su telefono reale: notifiche, widget, lingua, valuta                   |

Robustezza dei dati — nati fuori dai piani, dalla rilettura del 17 agosto:

| Step                             | Stato | Cosa contiene                                                        |
| -------------------------------- | ----- | -------------------------------------------------------------------- |
| 42 — Reimport dell'export JSON   | ✅    | `parseVaultExport`, `importSnapshot`, `/importa`, in un gruppo nuovo |
| 43 — Avviso «chiave non salvata» | ✅    | Quarto interruttore, `BackupWatcher`, soglia a cinque spese          |

Redesign visivo — [visualdesign.md](visualdesign.md), direzione **2a**, sette passi:

| Passo                      | Stato | Cosa contiene                                                   |
| -------------------------- | ----- | --------------------------------------------------------------- |
| 1 — Token                  | ✅    | Grigi scuri più profondi, `surfaceRaised`/`divider`/`textFaint` |
| 2 — Icone                  | ✅    | Feather al posto delle emoji, mappa emoji→icona in `seed.ts`    |
| 3 — Componenti nuovi       | ✅    | `SectionLabel`, `ListRow`, `AvatarStack`, `Card` a varianti     |
| 4 — Tu                     | ✅    | Fusione profilo + impostazioni, da quattro tab a tre            |
| 5 — Grafici                | ✅    | Riscrittura in forma registro, barre ritoccate                  |
| 6 — Spese home + selettore | ✅    | Nuova radice del tab, card eroe, selettore gruppi in un foglio  |
| 7 — Nuova spesa            | ✅    | Riscrittura del form: importo → chi/come → categoria → dettagli |

**1250 test verdi** (639 core + 568 app + 43 relay), typecheck, lint e `format:check` puliti.

> **Il redesign è finito nel codice, e adesso tocca al telefono.** Sette passi su sette, e da qui
> non resta niente da scrivere: resta da **guardare**. È la stessa frase che valeva per i tre piani
> funzionali, ma questa volta pesa di più — i passi 4, 6 e 7 hanno rifatto le tre schermate che si
> aprono più spesso, e il 6 ha spostato la radice del primo tab. Cosa provare, in ordine di rischio,
> in [Cosa non è ancora stato verificato su hardware reale](#cosa-non-è-ancora-stato-verificato-su-hardware-reale).

**I piani chiusi sono due.** Il piano originale (Step 0–9), e
[piano-v2-profili-gruppi-sync.md](piano-v2-profili-gruppi-sync.md) (**Step 10–14**), nato dalla prima
prova con due dispositivi che aveva fatto emergere due bug sui numeri e tre limiti di prodotto.

**Anche il terzo è chiuso:** [piano-v3-tab-gruppi-azzeramento-sync.md](piano-v3-tab-gruppi-azzeramento-sync.md),
**Step 16–22**, tutti fatti. Nasceva dalla prova a mano delle funzionalità: la gestione dei gruppi
non era intuitiva, il gruppo di default al primo avvio generava confusione, e il poll del relay
andava tarato. **Uno step per sessione.** La taratura del motore è finita, **gli spostamenti di rotte
pure** — erano i due step più delicati del piano, quelli che potevano rompere in silenzio l'ingresso
da un invito, e sono chiusi entrambi con gli URL intatti (vedi sotto) — la riorganizzazione dei tab
anche, il gruppo di default non c'è più, e «Azzera questo telefono» adesso azzera davvero.

**Anche il redesign visivo è chiuso** — sette passi su sette: vedi
[visualdesign.md](visualdesign.md) e la sezione [Redesign visivo](#redesign-visivo) qui sotto.

**Anche il quarto piano è chiuso:** [piano-v4-grafici-e-dashboard.md](piano-v4-grafici-e-dashboard.md),
**Step 23–28** — grafici, filtri e dashboard componibile. Nasceva da una richiesta di prodotto e non
da un difetto, e dai tre limiti dei Grafici di allora: **non si poteva chiedere niente** (lo risolve
il 27), **il repertorio era fatto di barre** (il 25 e il 26), **la schermata era la stessa per tutti**
(il 28). Il 23 e il 25 sono i due che **non si vedono**, tutti dentro `packages/core`, e il piano
stesso li indicava come il posto giusto da cui cominciare; il 24 porta negozio e tag nel form, dietro
una tendina chiusa. Vedi [Negozio e tag](#negozio-e-tag-step-23-e-24),
[La geometria dei grafici](#la-geometria-dei-grafici-step-25),
[I grafici nuovi, in SVG](#i-grafici-nuovi-in-svg-step-26),
[I sei filtri](#i-sei-filtri-step-27) e
[La dashboard componibile](#la-dashboard-componibile-step-28).

Resta però vero che il seguito più urgente è
[la prova sui due telefoni](piano-v3-tab-gruppi-azzeramento-sync.md#criterio-di-fatto-end-to-end), che
manca a tutti e tre i piani precedenti e ora anche al redesign. Il piano v4 aggiunge due campi alla
spesa, quindi il suo criterio di «fatto» **dipende** da quella prova: finché il sync non è stato visto
funzionare in entrambi i versi, non si può sapere se un negozio scritto di qua arriva di là.

Le WebSocket sul Durable Object restano una possibilità dichiarata fuori perimetro, **da valutare solo
dopo** aver provato sul campo la taratura degli Step 16 e 17.

> **Di quanto è stato scritto finora non resta codice da scrivere: resta la prova sul campo.** Vale
> per i tre piani e ora anche per il redesign — il piano v4 è un'aggiunta, non il completamento di
> qualcosa, e non sostituisce questa riga.
> Dallo Step 10 in poi nulla è mai stato visto funzionare su un telefono: quello che manca è
> il [criterio di «fatto» end-to-end](piano-v2-profili-gruppi-sync.md#criterio-di-fatto-end-to-end) su
> due dispositivi fisici. Finché non è stato fatto, «i test passano» e «funziona» restano due frasi
> diverse — e adesso la distanza fra le due è più larga di prima, perché **i passi 4, 6 e 7 hanno
> rifatto le tre schermate che si aprono più spesso** e il 6 ha spostato la radice del primo tab. Gli
> URL sono rimasti quelli di prima e i tipi generati da expo-router lo confermano a ogni passo, ma è
> una ragione in più per farla adesso, non una in meno. Gli spostamenti di file sono finiti: da qui in
> poi la struttura delle rotte non si tocca più.
>
> **Con un telefono solo si fa quasi tutto lo stesso:** `npm run prova` esegue la checklist da sola
> — due dispositivi senza schermo che montano **i moduli veri dell'app** su SQLite vero contro il
> relay in produzione, una trentina di controlli in ~90 s — e `npm run peer` è la versione
> interattiva, per le prove che hanno bisogno del telefono dall'altra parte. Cosa copre e cosa no in
> [prova-con-un-telefono-solo.md](prova-con-un-telefono-solo.md).

**La pagina `/j` è in produzione** (deploy del 2026-08-02, versione `b351a959`): risponde 200 con
gli header attesi — `Referrer-Policy: no-referrer`, CSP `default-src 'none'`, `noindex` — e l'HTML
servito è quello del repo, senza risorse esterne. Resta da provare col telefono in mano.

## Redesign visivo

Documento: [visualdesign.md](visualdesign.md). Direzione **2a**: card dove si agisce e c'è un numero
da mettere al centro (spese, nuova spesa), registro — liste a tutta larghezza, filetti, etichette
maiuscoletta — dove si legge (grafici, selettore gruppi, Tu). Regola unica: **una sola card per
schermata**. Il redesign passa da quattro tab a tre, e non tocca `packages/core`, lo schema Yjs,
sync, crypto, relay, backup, export né azzeramento.

**Un passo per sessione**, come per i piani precedenti. **Tutti e sette chiusi.**

### Il passo 7 ha riscritto il form della spesa

L'ordine adesso è **importo → chi e come → categoria → dettagli**, che è l'ordine in cui la spesa
viene detta a voce. Prima era importo, descrizione, categoria, chi ha pagato, come si divide: la
parte sui soldi stava in due tronconi separati dal resto, ed è la schermata che si apre più spesso.

**Il salva non sta più in alto**, ma a piena larghezza in fondo, dove arriva il pollice. In cima
resta solo la x per uscire: `ModalScreen` ha una prop `compact` — x tonda a sinistra, titolo al
centro — usata da queste due rotte e da nessun'altra delle quattordici, perché altrove il pulsante
in alto **è** l'unico modo di uscire.

**L'importo è la card eroe e la cifra è il campo**: si tocca il numero, non un riquadro attorno.
Sotto ogni persona compare la quota che le toccherebbe, aggiornata mentre si scrive — è ciò che rende
visibile la differenza fra le tre modalità senza provarle una per una. Il riquadro selezionato prende
il **colore del membro**, non l'accento, così dice _chi_ e non solo _scelto_.

**Due etichette del mockup erano false, e non sono state copiate** — sesta e settima correzione al
documento:

- **«Metà e metà» è vero solo in due.** In tre sarebbe falso, e su un'app di conti una frase falsa
  accanto a un numero è peggio di una lunga: `splitModeLabel` dice «Metà e metà» con due membri e
  «In parti uguali` da tre in su.
- **«Tutto mio» è falso quando ha pagato un altro.** La modalità `single` mette la spesa a carico di
  **chi ha pagato**, e una spesa pagata da un altro si può registrare. L'etichetta è «Solo chi paga»,
  vera in entrambi i casi.

**La data resta non modificabile, com'era prima.** Un selettore di date vuole
`@react-native-community/datetimepicker`, cioè un modulo nativo, cioè una build EAS nuova. La riga la
**mostra** — su una spesa vecchia dice di quale giorno si parla — e non finge di essere toccabile.

**`describeGap` e `splitPreview` sono usciti dal componente** in `features/expenses/split-text.ts`,
dove hanno dei test: stavano in `ExpenseForm.tsx` senza, e `splitPreview` ha il caso del centesimo di
resto (10,00 € in tre fa 3,34 / 3,33 / 3,33), che è esattamente il tipo di cosa che si vuole fissata.

**La logica di calcolo non è cambiata:** `parseAmount`, `buildSplit`, la validazione delle quote e la
costruzione dello `split` sono quelle di prima, riga per riga. È un passo di impaginazione.

### Il passo 6 ha invertito la radice del primo tab

Era `elenco dei gruppi → gruppo aperto`, adesso è `gruppo aperto`, e l'elenco è un foglio. Si apre
l'app per registrare una spesa, non per scegliere in quale gruppo si è: quella domanda ora sta nella
pill dell'header.

**Gli URL non sono cambiati, di nuovo.** `/` era l'elenco ed è la home delle spese; `/groups/<id>` —
l'indirizzo su cui atterra chi entra da un invito — c'è ancora e mostra la stessa schermata. La
procedura dello Step 18 è stata rifatta: tipi rigenerati con `expo start`, `tsc` **con quei tipi
presenti** (ha subito trovato un errore di sintassi vero), rotte verificate una per una.

**Le due rotte condividono `features/expenses/GroupHome.tsx`, e non un redirect.** La strada corta
era un `<Redirect href="/" />` in `/groups/<id>/index`, e sarebbe stata un bug: in uno stack le
schermate **sotto** quella a fuoco restano montate, quindi quel redirect scatterebbe anche mentre si
guarda `/groups/<id>/manage`, che sta nello stesso stack, chiudendo la gestione appena aperta. Un
componente condiviso non naviga. La differenza fra le due rotte è solo chi decide il gruppo: il
registro in `/`, l'URL in `/groups/<id>` attraverso la guardia del layout, che è rimasta com'era.

**Cambiare gruppo dal foglio fa `dismissTo('/')` prima di `select()`.** Se si sta guardando
`/groups/<id>` la guardia di quel layout riporterebbe corrente il gruppo dell'URL, disfacendo il
cambio all'istante. Si naviga prima, così quella guardia è già smontata quando il corrente cambia.
`dismissTo` e non `replace`: dalla radice è già a posto e non impila nulla.

**`GroupPicker` è un componente e due contenitori**, come chiedeva il documento: il foglio
(`GroupSwitcherSheet`) e lo stato vuoto «nessun gruppo» a piena pagina. Due copie divergerebbero, e
la prima cosa a divergere sarebbe un ingresso dimenticato in una delle due.

**Il foglio è una `Modal` di React Native, non `@gorhom/bottom-sheet`.** Quello porterebbe
`react-native-reanimated` e `react-native-gesture-handler`, due moduli nativi: una build EAS nuova
per un'animazione, con una sola development build installata sul telefono. Si paga quando servirà
trascinare il foglio col dito, non prima.

**La quota per riga non passa da `computeBalances`** — la correzione n. 3 qui sotto, applicata:
`features/expenses/share.ts` è `amountCents - shares[me]` se ho pagato io, `-shares[me]` altrimenti.
O(1) per riga, nessuna prop da propagare. Il test ha trovato subito un difetto vero: `-shares[me]`
con quota zero dà **`-0`**, che non è `0`, e un `Math.sign` a valle lo leggerebbe come debito.

**Il gruppo non ha un colore nello schema, e non gliene è stato aggiunto uno.** La pill lo vuole:
`groupColor(vaultId)` lo deriva dal `vaultId`, che è già lì, stabile e **uguale sui due telefoni** —
quindi lo stesso gruppo ha lo stesso colore su entrambi, senza un update Yjs né una domanda a chi
crea un gruppo. Terza famiglia di colori, distinta da persone e categorie perché nell'header le tre
cose compaiono insieme; e nel quadratino c'è sempre l'iniziale, quindi il colore non porta mai
l'identità da solo.

**`numeric` non compilava, e nessuno lo sapeva.** Il token è nato al passo 1 con `as const`, che
rende `fontVariant` un tuple `readonly` mentre `TextStyle` lo vuole mutabile. È rimasto invisibile
per tre passi perché **nessuno lo applicava**: il primo `Text` che l'ha usato è stato anche il primo
a non compilare. Ora è tipizzato `Pick<TextStyle, 'fontVariant'>`.

**`Screen.onTitlePress` è stato smontato.** Serviva al nome del gruppo come titolo toccabile verso la
gestione; adesso il gruppo è una pill che apre il selettore, e alla gestione porta il bottone con le
leve. Era il suo unico chiamante.

**Il sottotitolo ricco delle righe vale solo per il gruppo aperto** — quinta correzione al documento,
che lo mostra su ogni riga. Spese e totali stanno dentro il documento Yjs di quel gruppo, e di
documenti ne è montato **uno solo per volta**: riempirlo su tutte le righe vorrebbe dire aprire ogni
vault, N chiavi dal portachiavi e il motore di sync da riassegnare. Le altre righe tengono il
`vault <short>`, che è comunque ciò che distingue due gruppi con lo stesso nome.

**Il passo 5 riscrive `stats.tsx` in forma registro**, senza toccare `packages/core`: lo stepper
del mese diventa l'header della schermata (`Screen header=`, come già per Tu), l'importo del mese è
l'unico numero grande (`fontSize.display`/`fontWeight.heavy` — nuovo, **800**, perché a quella
scala anche `bold` a 700 si legge sottile), e `MonthlyBars`/`CategoryBars` perdono il contenitore a
card. `CategoryBars` perde anche l'icona di categoria: colore della barra e nome bastano, ed era
l'unico punto in cui l'icona ripeteva un'informazione già data dal colore. `BudgetRows` resta
**invariata** di proposito, com'è scritto nel documento.

**`EmptyState` accetta un nodo oltre a un'emoji.** `icon` era `string`, reso sempre come `<Text>`;
ora accetta anche un `ReactNode` — usato dai due stati vuoti dei Grafici per un'icona Feather
(`bar-chart-2`, `colors.textFaint`) — e i tre chiamanti rimasti (`GroupRequired`, l'elenco spese di
un gruppo, la spesa non trovata) continuano a passare un'emoji senza toccare una riga.

**Il bottone "Pareggia"/"Storico" è un componente locale**, non `Button`: quest'ultimo è pensato a
piena larghezza, e qui serve un tocco compatto accanto a una riga di testo. Non è salito fra i
componenti condivisi perché lo usa una sola schermata.

**Il passo 4 fonde `profile.tsx` e `settings.tsx` in `tu.tsx`.** Tre tab invece di quattro: il tab
Impostazioni sparisce, e con lui il file omonimo — che però **non si cancella**, diventa un
`<Redirect href="/tu" />`, perché expo-router persiste l'ultima rotta e chi riapre l'app dopo
l'aggiornamento con `/settings` come stato salvato deve arrivare comunque da qualche parte. Va
tolto dopo un ciclo, quando nessuna installazione può più avere quello stato. Lo stesso vale per il
tab nella tab bar: `href: null` nelle `options`, non la cancellazione dello screen, o la rotta
resterebbe raggiungibile ma senza un modo di arrivarci dal redirect.

**`profile.tsx` → `tu.tsx` cambia l'URL**, quindi la procedura dei tipi di rotta dello Step 18 è
stata rifatta: `.expo/types/router.d.ts` rigenerato con `expo start` e verificato con `tsc` prima di
scrivere gli `router.push` di `tu.tsx` — non dopo, perché senza quei tipi presenti un href sbagliato
passa il typecheck lo stesso.

**Solo la sezione «Il gruppo aperto» si smonta senza un gruppo.** Sincronizzazione e Questo telefono
restano sempre montate — «Sincronizza» si disabilita e basta, come già faceva Impostazioni dallo
Step 21 — perché Diagnostica e **Azzera questo telefono** devono restare raggiungibili proprio
quando i gruppi sono zero.

**Il pallino dello stato di sync è condiviso, non duplicato.** `syncTone()` in
`features/sync/describe.ts` estrae la scelta fase→tonalità (`ok`/`warn`/`muted`) che prima viveva
solo dentro `SyncBadge`; il componente la usa ancora per colorare icona e testo, e il pallino nudo di
Tu la stessa funzione per colorare un cerchio di 7px. `describeSync()` non è stata toccata — il suo
`icon` testuale resta quello di sempre, coperto dal test esistente.

**Il default di `Card` resta la forma di sempre.** Le varianti nuove sono `flat` (contenitore di
lista: niente bordo, niente padding) e `raised` (card eroe, una per schermata); `default` è un ponte
scritto per essere smontato quando i passi 4-7 avranno spostato tutte le chiamate.

**Le icone delle categorie non migrano i dati.** Il campo `icon` nel documento Yjs resta com'è —
è sincronizzato, riscriverlo genererebbe un update per ogni categoria su ogni telefono — e la
sostituzione avviene in sola lettura in `features/categories/icon.ts`: nome Feather → si disegna;
emoji di default → la traduce `CATEGORY_ICONS`, derivata da `DEFAULT_CATEGORIES` in `state/seed.ts`;
qualunque altra cosa → **pallino del colore della categoria**. Il terzo caso è ciò che permette di
non migrare nulla, e riguarda le categorie create a mano con la vecchia schermata a emoji.

**`@expo/vector-icons` non ha richiesto una build EAS**, e la ragione va ricordata: `app.json` non è
stato toccato (nessun config plugin), il pacchetto ha zero dipendenze proprie, e il modulo nativo che
gli serve — `expo-font` — è già dipendenza diretta di `expo`, quindi era autolinkato nella build del
1º agosto. Il font viaggia come asset del bundle. **Importare sempre dal sottopercorso**
(`@expo/vector-icons/Feather`): il barrel tira dentro tutti e undici i set con i rispettivi TTF.

**Quattro punti in cui il documento va corretto**, verificati contro il repo prima di cominciare —
sono nel documento come sono stati scritti, quindi vanno letti da qui:

1. **`@expo/vector-icons` non è installato** e non è transitivo di Expo SDK 57, contrariamente a
   quanto dice §3. Va aggiunto al passo 2 con `npx expo install`. È JS più asset font ed `expo-font`
   c'è già: **niente build EAS**.
2. **`Card variant` non può avere `flat` come default** (§2.1): oggi `Card` ha sempre bordo e
   padding, e ci sono 46 usi in 15 file, molti fuori scope. Il default resta la forma attuale.
3. **La quota per riga di `ExpenseRow` non passa da `computeBalances`** (§2.1): è
   `amountCents - split.shares[me]` se ho pagato io, `-split.shares[me]` altrimenti. O(1), niente
   prop da propagare.
4. **Togliere il tab Impostazioni richiede `href: null`** nelle options (§4.1): cancellare il file
   non basta finché sta in `(tabs)/`. E `profile.tsx` → `tu.tsx` cambia l'URL, quindi al passo 4 va
   rifatta la procedura dei tipi di rotta dello Step 18.

## Negozio e tag (Step 23 e 24)

Due campi su `Expense` — `store: string` e `tags: string[]` — nel modello (23) e nel form (24). Il 23
è il primo dei due step del piano v4 che **non si vedono**, e insieme allo Step 25 è quello che
decide se il resto mostrerà numeri giusti.

- **Sono campi, non entità.** Niente mappe `stores` e `tags` con i propri id: il vocabolario si
  deriva in lettura da chi li usa (`insights/naming.ts`), quindi un negozio esiste finché esiste una
  spesa che lo nomina e sparisce da solo quando non ne resta nessuna. Niente schermate di gestione,
  niente cancellazioni, **nessun orfano**. Il prezzo, accettato: non si può dare un colore a un tag
  né rinominarne uno in tutte le spese insieme.
- **Additivo per davvero.** I reader hanno un fallback (`''` e `[]`) e `writeRecord` scrive solo le
  chiavi che riceve: una spesa registrata prima di oggi si legge senza che nulla la tocchi. **Nessun
  backfill** e **nessun bump di `CURRENT_SCHEMA_VERSION`**, che è un meccanismo di azzeramento e non
  di migrazione — alzarlo qui cancellerebbe le tabelle. C'è il test che scrive a mano un record senza
  le due chiavi.
- **`strList` è difensivo perché il valore arriva dall'altro telefono.** `listExpenses` è la lettura
  da cui dipende l'intera lista spese: un `tags` che è un numero la farebbe saltare tutta. Si accetta
  solo se è un array, si tengono solo le stringhe, e si restituisce sempre un array **nuovo** — così
  chi legge non modifica per sbaglio il valore dentro il documento.
- **I tag si scrivono come array intero: vince l'ultimo.** Una `Y.Array` fonderebbe due aggiunte
  concorrenti, ma richiede reader e writer nuovi in `doc.ts` — che oggi tratta solo valori piatti —
  per un conflitto che vuole due persone che etichettano la stessa spesa nello stesso momento. Il
  test di convergenza fissa ciò che conta: dopo il sync i due documenti hanno la **stessa** lista.
  Diverso da `split`, atomico perché ha un'invariante da rispettare.
- **`Esselunga`, `esselunga` e `Esselunga ` sono lo stesso negozio.** La normalizzazione si applica
  **in scrittura**, dentro `addExpense` e `updateExpense`, che è l'unico punto da cui il testo entra
  nel documento; si conserva la grafia scritta e a schermo compare la **più usata**. A parità di
  frequenza decide la chiave in ordine alfabetico, come già per le categorie: i due telefoni devono
  proporre lo stesso elenco. Le spese cancellate non contribuiscono al vocabolario.
- **L'export sale a v2**, e le colonne nuove sono `negozio` e `tag`, quest'ultima con i tag uniti da
  `;` perché la virgola è il separatore del file. Il disinnesco contro la CSV injection si applica a
  **ogni tag prima di unirli**: farlo dopo proteggerebbe solo il primo.

Nel form (Step 24) stanno dietro **«Informazioni aggiuntive»**, una tendina in fondo alla schermata,
dopo i dettagli e prima del salva — l'ordine importo → chi e come → categoria → dettagli del passo 7
non è stato toccato.

- **La riga chiusa dice cosa c'è sotto**: «Esselunga · 2 tag», oppure «Facoltativi». Nascondere
  campi **compilati** dietro una tendina muta è il modo in cui i dati si perdono senza che nessuno se
  ne accorga. Resta chiusa anche su una spesa che ha già negozio e tag: a dirlo è il riassunto.
- **Il negozio si tronca a 20 caratteri, e non è cosmetico.** `numberOfLines={1}` taglierebbe la
  **fine** della stringa, cioè proprio il «· 2 tag» che dice che sotto c'è dell'altro. La logica è
  `extraSummary` in `features/expenses/extra-fields.ts`, con i test, come `split-text.ts`.
- **Due modi di perdere un tag, chiusi entrambi**: il campo usa `submitBehavior="submit"` invece del
  default `blurAndSubmit`, così due tag di seguito non richiedono di ritoccarlo; e `handleSubmit`
  salva `normalizeTags([...tags, tagDraft])`, cioè include il tag a metà scrittura di chi tocca
  «Salva» senza premere «fine».
- **Il form non normalizza.** `ExpenseFormValues` porta il testo com'è stato scritto: a ripulirlo è
  `VaultStore` in scrittura, l'unico punto da cui entra nel documento. Una seconda regola nel form
  sarebbe una seconda regola da tenere allineata.
- **`Chip` è ora un componente condiviso** (`components/Chip.tsx`), e i due punti che lo scrivevano a
  mano dentro `ExpenseForm.tsx` — modalità di divisione e categorie — sono convertiti nello stesso
  commit. Senza `color` la pillola selezionata si riempie d'accento (una scelta fra modi), con
  `color` prende bordo del colore e fondo `color + '22'` (lì il colore **è** l'informazione).
  Unificato anche il peso dell'etichetta, che nelle due copie divergeva senza una ragione:
  `semibold` da selezionata, `medium` altrimenti.

## La geometria dei grafici (Step 25)

Undici moduli in `packages/core`, nessuna riga di interfaccia: quattro in `chart/` (`scale`, `path`,
`treemap`, `bins`) e sette in `insights/` (`query`, `calendar`, `series`, `weekday`, `heatmap`,
`stores`, `people`). Serve a rendere i grafici verificabili **senza un telefono**, ed è la ragione
per cui viene prima di quello che li disegna.

- **`amountFor` è il punto in cui si producono numeri plausibili e sbagliati, e per questo è una
  funzione sola.** Senza filtro persona l'importo è pieno; con **«a carico di»** è la quota di quella
  persona; con **«ha pagato»** torna pieno, perché la domanda è quanto ha anticipato. Nessun grafico
  legge `amountCents` per conto suo.
- **La fascia di importo si misura sull'importo proiettato.** Sull'importo pieno, un istogramma
  costruito su `amountFor` mostrerebbe barre fuori dalla fascia scelta.
- **Le tre aggregazioni esistenti hanno preso la query in coda**, con default vuoto: `totalCents`,
  `totalsByCategory`, `totalsByMonth`. Il piano le dava per intoccate, ma dice anche che nessuno
  legge `amountCents` da solo — e le due cose insieme non stanno in piedi. Nessun chiamante toccato.
- **Il test che attraversa i moduli è quello che vale.** Con la stessa query, serie giornaliera,
  barre settimanali, categorie, istogramma e curva cumulata devono dare **lo stesso** totale, e le
  aree del treemap coprire il rettangolo in proporzione. Sei query, filtro persona in entrambe le
  modalità. Nessun test di singolo modulo se ne accorgerebbe: ciascuno sarebbe coerente con sé.
- **`smoothLinePath` è una cubica monotona**, non una spline naturale, che fra due mesi bassi e uno
  alto scenderebbe sotto la linea di base disegnando una spesa negativa. Il test non campiona la
  curva: sfrutta l'inviluppo convesso delle Bézier.
- **La heatmap è per quantili, sui soli giorni con spese.** Con una scala lineare un affitto
  schiaccia tutto il resto al minimo; includendo i giorni vuoti nei quantili, in un mese tranquillo
  il livello 1 coprirebbe quasi tutto.
- **`calendar.ts` lavora in UTC**, non col trucco del mezzogiorno di `grouping.ts`: quello serve
  quando il `Date` è costruito con componenti locali, e qui non se ne costruisce mai uno. UTC l'ora
  legale non ce l'ha. La settimana comincia **di lunedì**.
- **`totalsByStore` somma meno del totale** (le spese senza negozio non compaiono, e non c'è una
  voce «senza negozio» perché dominerebbe ogni grafico); **`totalsByTag` somma di più** (una spesa
  con due tag conta per intero in entrambi). Vanno dette entrambe dove i numeri si mostrano.

## I grafici nuovi, in SVG (Step 26)

Undici componenti in `apps/mobile/src/features/stats/charts/` — `LineChart`, `AreaChart`,
`Sparkline`, `WeekdayBars`, `CalendarHeatmap`, `AmountHistogram`, `CategoryTreemap`, `DonutChart`,
`StatTile`, `TopList`, `MemberComparison` — e un tab Grafici che è ancora **una sequenza fissa**,
solo molto più lunga: i filtri sono lo Step 27, la composizione il 28. `MonthlyBars`,
`CategoryBars` e `BudgetRows` non sono state toccate.

- **I componenti non calcolano niente.** Tutto quello che serviva è stato scritto e provato allo
  Step 25: qui si scelgono le scale, si chiede il tracciato e si disegna.
- **«Nessuna logica pura nuova» era sbagliato, e sono trenta test.** Quattro moduli con i loro
  test: `axis.ts` (quali etichette ci stanno sotto un asse), `heatmap-grid.ts` (i giorni in
  colonne di settimane, e le soglie della legenda ricavate dai livelli), `slices.ts` (la coda
  della ciambella, che non deve perdere centesimi) e `ink.ts`.
- **Metà dei colori di categoria vuole il testo scuro, non il bianco.** `ink.ts` esiste perché il
  treemap è il primo punto dell'app in cui una scritta finisce **dentro** una tinta. Il test è
  nato asserendo il bianco per tutti e otto ed è fallito: arancione, turchese, ocra e grigio col
  bianco stanno sotto 3,7:1. E la soglia WCAG di luminanza non serve, perché vale contro il bianco
  e il nero **puri**: si confrontano i due contrasti veri e vince il maggiore.
- **La heatmap si disegna in SVG e si tocca in React Native**, con `Pressable` trasparenti
  sovrapposti alle celle. Le tre compensazioni chieste dal piano ci sono tutte e tre — etichetta
  per cella, legenda con le soglie **in euro**, tocco che scrive giorno e importo — ed è l'unico
  grafico in cui il colore porterebbe l'informazione da solo.
- **L'istogramma misura il numero di spese, non la somma.** La domanda è «tanti scontrini piccoli o
  pochi grossi?»: su una scala di importi la fascia «200+» vincerebbe sempre con due spese sole.
- **La ciambella solo dove le fette sommano al totale** — chi ha anticipato. Negozi e tag vanno in
  `TopList`, con la nota che dice perché sommano meno (i negozi) o più (i tag) del totale.
- **Sul mese in corso le curve si fermano a oggi**; la heatmap invece copre il mese intero, e i
  giorni spenti in fondo dicono a che punto del mese si è.
- **Ogni grafico si misura da sé** con `onLayout`: `Dimensions.get('window')` darebbe la larghezza
  dello schermo ignorando i padding, e il grafico sborderebbe. Serve anche allo Step 28, dove i
  widget non sanno in che colonna finiranno.
- **`stats.tsx` passa già una `ExpenseQuery` vuota** a ogni aggregazione. Oggi non cambia nulla —
  con la query vuota `amountFor` dà l'importo pieno — e allo Step 27 basterà sostituire un oggetto
  solo invece di rileggere undici componenti.

## I sei filtri (Step 27)

Periodo, persona, categoria, negozio, tag e fascia di importo, in un solo `ExpenseQuery` che
alimenta ogni grafico. Sette file in `apps/mobile/src/features/stats/filters/` — `period.ts`,
`amount.ts` e `facets.ts` con i loro test, più `FilterBar`, `FilterSheet`, `PeriodPicker` e
`DayGridPicker` — e `stats.tsx` ricablato. È lo step che risponde al primo dei tre limiti da cui il
piano nasce: **non si poteva chiedere niente.**

- **Lo stepper del mese non c'è più.** Erano due controlli per la stessa cosa: lo stepper diceva un
  mese per volta, le **barre mensili** ne mostrano sei e ne fanno toccare uno. Ogni tocco riancora
  le sei barre, quindi si va indietro sei mesi alla volta — più lontano di quanto arrivino i
  preset. L'intestazione della schermata è adesso la barra dei filtri.
- **I chip portano il valore, non il nome del filtro**: «Spesa», non «Categoria». Le frasi le
  costruisce `queryParts` di `@jutrack/core`, la stessa di `describeQuery`. E **«Azzera» sta nella
  barra**, non dentro il foglio: è l'uscita di sicurezza da una schermata vuota, e chiedere di
  aprire un foglio per trovarla vorrebbe dire chiederlo proprio a chi non ha capito cosa succede.
- **Niente da mostrare non è tutto a zero.** Con la query senza risposte compare uno stato vuoto —
  che distingue «filtri attivi» da «periodo senza spese» — invece di undici grafici piatti, che si
  leggerebbero come un dato.
- **Tre grafici non rispettano il periodo, e lo dicono nel titolo.** «Dodici mesi», «Giorni della
  settimana» e «Anticipato e a carico» leggono la loro finestra ancorata al mese in cui il periodo
  **finisce**: un grafico intitolato «dodici mesi» che ne mostra sette sarebbe un titolo falso.
  Rispettano gli altri cinque filtri. **Saldo e budget non ne rispettano nessuno**: sono fatti sul
  gruppo, non viste — «speso 40 € di 200» diventerebbe falso filtrando per persona. Ognuna delle
  tre righe è scritta sotto il grafico a cui si riferisce.
- **`QueryFacets` è un tipo a sé** (`Omit<ExpenseQuery, 'from' | 'to'>`) e non una `ExpenseQuery`
  che ci si ricorda di non riempire: `amountFor` legge solo persona e modalità, ma `totalsByDay`
  usa `query.from`/`query.to` come estremi di ripiego, e per i grafici a dodici mesi sarebbero gli
  estremi sbagliati.
- **Le letture dal documento restano due**: una ristretta al periodo — l'unico filtro che conviene
  far fare allo store, perché restringe la scansione — e una completa per saldo e dodici mesi. Il
  resto sono due `applyQuery` in altrettanti `useMemo`.
- **«Rispetto a…» ha tre casi.** Un mese intero si confronta con il mese intero prima; un mese **in
  corso** con lo stesso tratto del mese prima (il 31 marzo diventa il 28 febbraio), o a metà agosto
  qualunque mese finito vincerebbe e la riga direbbe «-60%» ogni giorno; tutto il resto con il
  tratto di pari lunghezza subito precedente, che finisce il giorno prima che il periodo cominci.
- **Il massimo delle fasce è esclusivo in `bins.ts` e inclusivo in `ExpenseQuery`.** Senza togliere
  quel centesimo, una spesa da 20,00 € starebbe in «10–20» **e** in «20–50». Il test lo verifica
  passando dalla stessa `binsFor` che disegna le barre.
- **Un filtro su un negozio si spegne anche scritto con un'altra grafia**: `toggleValue` confronta
  sulla chiave normalizzata. E l'ultima voce spenta lascia la chiave **assente** invece di un
  elenco vuoto, o «Azzera» resterebbe nella barra senza niente da azzerare.
- **`DayGridPicker` non porta moduli nativi**, quindi nessuna build: è una griglia di `Pressable`
  sugli stessi helper di `calendar.ts` che servono alla heatmap. Quarta volta che il progetto
  rifiuta un modulo nativo per un gesto, e resta la base da cui rendere modificabile un giorno la
  data della spesa.
- **La heatmap ha imparato a scorrere.** Con «ultimi 12 mesi» sono cinquantatré colonne: divise per
  la larghezza di un telefono darebbero celle da tre punti, invisibili e **impossibili da toccare**
  — che è una delle tre compensazioni su cui si regge la sua leggibilità. La cella non scende sotto
  i nove punti e la griglia si trascina, con i nomi dei giorni fermi fuori dallo scorrimento.

## La dashboard componibile (Step 28)

Sedici widget in un registro, un layout salvato in `app_meta` e la schermata `/dashboard` per
scegliere quali mostrare e in che ordine. Il tab Grafici non è più una sequenza scritta nel file: è
un elenco di id che qualcuno ha scelto. È lo step che risponde al terzo dei tre limiti da cui il
piano nasce — **la schermata era la stessa per tutti**.

- **L'ordine esce dal JSX e diventa un dato.** `stats.tsx` costruisce una mappa
  `WidgetId → contenuto` e il layout la percorre. I sedici nodi si costruiscono sempre, anche
  quando se ne mostrano tre: creare un elemento React non lo disegna, e i calcoli sono quelli di
  prima. Il guadagno è che l'ordine sta in `layout.ts` e non nella sequenza del file.
- **Il filetto è passato alla cornice.** Con un ordine variabile, un tratto scritto a mano fra due
  blocchi resterebbe appeso in cima appena si toglie il widget sopra: a disegnarlo è
  `DashboardWidget`, che sa qual è il primo.
- **Ogni widget dice il proprio nome**, compresi il totale e i tre riquadri di riepilogo, che allo
  Step 26 non avevano etichetta. Un numero grande in cima si spiega da sé; spostato in fondo, no.
  **È la composizione a rendere obbligatorie le etichette.**
- **Due stati vuoti, non uno.** `unmet` riguarda il **gruppo** («serve almeno un'altra persona»),
  `empty` riguarda il **periodo** («in questo periodo non c'è niente da mostrare»): mandano a fare
  due cose diverse. Un grafico disegnato su zero direbbe invece una terza cosa, falsa.
- **Un widget scelto non svanisce mai.** Prima negozi, tag, ciambella, saldo e confronto erano
  dietro un `&&` che li faceva sparire; adesso restano e dichiarano cosa gli serve, con la
  **stessa frase** che il selettore mostra accanto al nome (`describeNeed`, una funzione sola).
- **Gli id sconosciuti si scartano, i widget nuovi non si aggiungono.** Sembrano regole opposte e
  sono la stessa: il layout salvato è una **scelta**, non una cache. Dal punto di vista del file,
  «widget nuovo» e «widget tolto dall'utente» sono lo stesso caso — un id che non c'è.
- **Una lista sola** (`{ id, visible }[]`): un widget spento conserva il posto che avrà quando
  verrà riacceso, e `moveWidget` scambia sull'elenco **intero** — è quello che si sta guardando
  mentre si riordina, e saltare gli spenti farebbe muovere la riga di due posti invece che di uno.
- **Il default è tutti e sedici.** Il piano diceva «la schermata di oggi, non il catalogo», ma dopo
  lo Step 26 la schermata _è_ il catalogo: un default più corto sarebbe una sottrazione fatta
  d'ufficio a chi aggiorna. Che coincidano è vero oggi e non è una regola.
- **Frecce e non trascinamento**, per la quinta volta nel progetto: il drag & drop vuole due moduli
  nativi, cioè una build EAS nuova per un gesto.
- **«Componi» sta fuori dalla barra dei filtri.** Dentro la riga scorrevole dei chip finirebbe
  fuori schermo appena i filtri attivi sono due — e sarebbe l'unico modo di riaccendere i widget,
  nascosto proprio a chi li ha spenti tutti.
- **Scrittura ottimistica, lettura no.** Un chevron risponde sotto il dito e salva dopo; la
  dashboard invece aspetta la rilettura, o chi ha spento dieci widget vedrebbe un lampo di
  schermata piena a ogni apertura del tab.
- **`/dashboard` sta sulla radice e funziona senza gruppo**, come `azzera.tsx` e `backup.tsx`: il
  layout è del telefono, non del vault. Il componente è diviso in due perché i suggerimenti sulle
  dipendenze leggono il vault, e senza gruppo mancano solo quelli.

## La valuta di default nel profilo (Step 29)

Un campo `currency?: string` sul `Profile`, un `CurrencyPicker` in Tu, e il simbolo che da lì arriva
a ogni importo che l'app scrive. È il primo step del piano v5 e l'unico dei dodici che non chiede né
una build EAS né una libreria nuova.

- **Il piano sottostimava lo step, e la correzione è la parte importante.** Diceva «l'unico
  consumatore nuovo è il default del campo valuta nel form di nuova spesa», ma il simbolo `€` era
  scritto a mano in **48 punti** — quaranta `formatMoney` che si affidavano al parametro di default,
  più otto `€` dentro il JSX. Con il solo default nel form, scegliere il franco avrebbe scritto
  `currency: 'CHF'` nel documento e lasciato a schermo `12,00 €`: un numero giusto con accanto una
  parola falsa, esattamente ciò che il progetto rifiuta da «Metà e metà». Il passaggio del simbolo
  è parte dello step.
- **Seconda correzione: «l'utente può cambiarla spesa per spesa» non era vero.** `Expense.currency`
  esiste nel modello dallo Step 0, ma il form non ha mai avuto un campo valuta e `ExpenseFormValues`
  non la portava: `addExpense` riceveva `undefined` e `store.ts` metteva `'EUR'`. Adesso la porta,
  presa dal profilo.
- **JuTrack non converte, e va detto dove si sceglie.** Il campo resta locale al telefono e non entra
  mai nel documento condiviso — su questo il piano ha ragione, non c'è nulla da fondere fra due
  membri. Ma senza tassi di cambio, due persone dello stesso gruppo con valute diverse registrano
  importi in unità diverse e ogni totale li somma come se fossero la stessa cosa. **Il campo è locale
  nel codice, la scelta è comune di fatto**, e la riga sotto il selettore lo dice invece di lasciarlo
  scoprire a un saldo sbagliato.
- **`ExpenseRow` è l'unica riga che non guarda il profilo**: lì il simbolo viene da
  `expense.currency`, perché mostra un importo preciso scritto un giorno preciso. Dove si somma —
  totali, saldi, grafici, budget — vale quella del profilo, perché una somma non ha una valuta
  propria. Per la stessa ragione **modificare una spesa non riscrive `currency`**.
- **Il simbolo passa dal profilo, non da un contesto nuovo.** `useCurrencySymbol()` sta accanto a
  `useProfile()`, già montato sopra tutta l'app. I moduli puri (`split-text.ts`, `balance-line.ts`,
  `stats/format.ts`, `queryParts` nel core) non possono chiamare un hook e lo ricevono come ultimo
  parametro con default `'€'`: è ciò che ha tenuto verdi i loro test senza riscriverli.
- **Sei valute, e le esclusioni sono le decisioni.** Fuori quelle a zero decimali (JPY): il progetto è
  in centesimi e `formatCents` stampa sempre due cifre. Fuori i simboli ambigui: `kr` vale per tre
  corone, e dove il simbolo non distingue si scrive il codice. Un codice sconosciuto — da una spesa
  vecchia o dall'altro telefono — si scrive **com'è**, senza ripiegare sull'euro.
- **Posizione del simbolo e virgola decimale non cambiano**, di proposito: sono convenzioni della
  **lingua**, non della moneta, e vanno con `Intl.NumberFormat` allo Step 37.
- **Una valuta illeggibile non fa cadere il profilo**, a differenza di un `profileId` vuoto: si torna
  al default e si continua. Non c'è nessun danno che si propaghi all'altro telefono.

## L'infrastruttura nativa (Step 30)

I due config plugin insieme in `app.json`, i moduli caricati pigramente e la diagnostica che passa
da 14 a 16 passaggi. **La build EAS è stata fatta e installata il 12 agosto 2026**, e la
diagnostica risponde 16 su 16: `modulo disponibile, permesso non concesso` e `2 provider rispondono
(0 + 0 sulla home)`. Gli Step 31–35 sono JS sopra questa build e non ne chiedono altre.

- **I due widget vanno dichiarati adesso, non agli Step 34–35 — e il piano non lo diceva.** Il
  plugin di `react-native-android-widget` ha `widgets: Widget[]` **obbligatorio**, e ogni voce
  diventa un `<receiver>` nel manifest: è configurazione nativa, quindi aggiungerne uno dopo
  vorrebbe dire una seconda build EAS, cioè esattamente ciò che questo step esiste per evitare.
  `Balance` e `MonthTotal` sono dichiarati qui; il 34 e il 35 restano JS puro.
- **`POST_NOTIFICATIONS` era già dichiarato dal manifest di `expo-notifications`**, che Android
  fonde da sé: il piano diceva di aggiungerlo, ed è ridondante. Resta in `app.json` accanto a
  `CAMERA` — ridondante per la stessa ragione — perché è il file che una persona legge per sapere
  cosa chiede l'app.
- **`expo config --type introspect` non espande l'AndroidManifest**: dà i permessi e basta. La
  verifica è stata fatta con un `expo prebuild --no-install` in un `android/` cancellato subito
  dopo, che ha mostrato i due receiver, i loro `@xml/widgetprovider_*` e i quattro `meta-data`
  delle notifiche. Quindici minuti di build EAS non si spendono per scoprire un nome sbagliato.
- **`SYSTEM_ALERT_WINDOW` e `VIBRATE` c'erano già.** Rifatto il prebuild con l'`app.json` di prima
  per attribuirli: vengono dal manifest di debug di React Native e dal dev client. Lo step aggiunge
  esattamente un permesso.
- **Il prebuild riscrive `expo start --android` in `expo run:android`**, ed è stato rimesso a posto:
  questo progetto non ha una cartella `android/` e compila su EAS.
- **`WIDGET_NAMES` è la stessa stringa di `app.json`, e la diagnostica la prova.** Il nome in
  `app.json` diventa una classe nativa, quello nel codice è la stringa con cui il JS la chiama: uno
  scarto di una lettera non dà errore di compilazione e allo Step 34 si vedrebbe solo come un widget
  che non si aggiorna mai. `getWidgetInfo` fallisce se il provider non esiste, e il passaggio 16 lo
  riporta.
- **Il passaggio 15 legge il permesso e non lo chiede** (`getPermissionsAsync`): su Android 13 il
  dialogo si rifiuta una volta sola, e una sonda non deve consumarlo.
- **`updatePeriodMillis: 0`**: nessun aggiornamento automatico. Il refresh in background è lo
  Step 36, dichiarato opzionale.
- **`npm audit` 28 → 29, e il +1 non è nuovo**: `react-native-android-widget` è segnalato perché
  dipende da `expo`, che dipende dalla catena metro/`image-size` già segnalata. Le «0 vulnerabilità»
  dello Step 0 sono ferme a quel giorno.

## Il promemoria spese (Step 31)

Un interruttore in Tu e una notifica locale che arriva dopo tre giorni senza registrare nulla.
Primo dei tre contenuti di notifica, tutto JS sopra la build dello Step 30.

- **È una scadenza, non una condizione, e non poteva essere altro.** Una notifica locale si
  programma **prima** e scatta da sola: nessuno la rilegge quando suona, e non c'è un processo in
  background che possa valutare lì per lì se ha ancora senso — quello è lo Step 36, opzionale.
  Quindi la regola si scrive come una data, ricalcolata nelle tre occasioni che l'app vede:
  apertura, spesa registrata, interruttore toccato. Ne segue che **il testo è vero per
  costruzione**: se una spesa fosse arrivata nel frattempo, quella notifica sarebbe stata disdetta.
- **Senza il riarmo all'avvio scatterebbe una volta sola**: una notifica programmata sparisce
  quando suona. `ReminderScheduler` sta sotto `ProfileGate`, non disegna niente, riarma a ogni
  apertura — e **rilegge il timestamp invece di scrivere «adesso»**, perché aprire l'app non è
  registrare una spesa: se lo fosse, il promemoria non arriverebbe mai a chi apre, guarda e non
  annota, cioè esattamente a chi l'ha chiesto.
- **L'ultima spesa sta in `app_meta`, non nel vault.** Di documenti Yjs ne è montato uno per
  volta: cercare la spesa più recente fra tutti i gruppi vorrebbe dire aprire ogni vault, N chiavi
  dal portachiavi e il motore da riassegnare. **Conta chi scrive, non chi riceve**: una spesa che
  arriva dall'altro telefono non sposta la scadenza, perché il promemoria riguarda l'abitudine di
  annotare. Il prezzo: in una coppia dove registra uno solo, l'avviso arriva a entrambi — ma a
  quello che non registra è vero.
- **Si disdice per tipo (`data.kind`), non per identificatore salvato.**
  `cancelAllScheduledNotificationsAsync` sarebbe già sbagliata allo Step 32; un id in `app_meta`
  sarebbe un secondo stato da tenere allineato, e uno rimasto indietro lascerebbe promemoria
  fantasma impossibili da disdire.
- **Il permesso si chiede accendendo l'interruttore, mai all'avvio**: su Android 13 il dialogo si
  rifiuta una volta sola, e spenderlo al boot vuol dire non poterlo più chiedere quando servirà.
- **La scrittura non è ottimistica**, al contrario del riordino della dashboard: prima il
  permesso, poi il salvataggio. Un interruttore acceso che non produce mai una notifica è peggio di
  uno che torna giù, perché non c'è modo di accorgersene se non aspettando invano.
- **Un permesso revocato non spegne l'interruttore di nascosto**: la voce resta accesa e una riga
  dice che è il sistema a bloccarla. Spegnerla d'ufficio farebbe sparire una scelta senza spiegarla.
- **Canale `LOW`**: compare senza suonare. `MIN` resterebbe ripiegato in fondo alla tendina, cioè
  invisibile a chi ha acceso l'interruttore per vederlo. Un canale per motivo, così si può zittire
  il promemoria dalle impostazioni di sistema senza perdere gli altri avvisi.
- **Due testi**: chi non ha mai registrato niente non ha «smesso», e dirgli «da 3 giorni» sarebbe
  falso. Stesso criterio di «Metà e metà».
- **Le venti in ora locale, ed è l'unico posto in cui l'ora locale è giusta**: `calendar.ts` sta in
  UTC perché confronta giorni fra due telefoni, qui «le venti» sono quelle di chi legge.
  L'aritmetica passa dai componenti del `Date`, o l'ultima domenica di ottobre l'avviso arriverebbe
  alle 19 — c'è il test.

## L'avviso di budget (Step 32)

Un secondo interruttore in Tu e una notifica che arriva quando una categoria tocca l'80% del limite
del mese o lo supera. Secondo dei tre contenuti di notifica, tutto JS sopra la build dello Step 30.

- **È l'opposto esatto dello Step 31, e vale la pena dirlo.** Il promemoria non poteva essere una
  condizione ed è diventato una scadenza; qui «hai superato il budget» **è** una condizione, e per di
  più una che cambia solo quando cambia il documento. Non c'è nessuna data da calcolare: si guarda, e
  se è appena successo si avvisa subito con un `ChannelAwareTriggerInput`, che consegna nell'istante
  ma **sul canale scelto** — `trigger: null` consegnerebbe altrettanto subito sul canale di default,
  cioè fuori dall'interruttore di sistema che questo step si è preso la cura di creare.
- **Ne segue il limite onesto, e sta scritto sotto l'interruttore.** L'avviso lo produce l'app
  guardando il documento, quindi **l'app deve essere aperta**: subito per una spesa registrata qui,
  alla prima apertura per una arrivata dall'altro telefono col sync. Un avviso in differita resta
  vero — il limite è superato adesso — e l'alternativa è lo Step 36, opzionale.
- **Il watcher si iscrive al documento, non a un gesto.** `useExpenseRegistered` dello Step 31 va
  chiamata dal form perché il promemoria dipende da un'azione; un budget dipende dal **documento** e
  sfonda anche per una spesa che nessuno ha toccato su questo telefono. `BudgetWatcher` sta accanto
  allo `Stack` e non nei Grafici: lì i budget si controllerebbero solo aprendo la scheda dove sono
  già disegnati.
- **Senza il gestore di primo piano lo step sarebbe invisibile.** `expo-notifications` di default non
  mostra niente mentre l'app è aperta, ed è esattamente lì che questo avviso nasce. `foreground.ts`
  decide **per tipo**: budget sì, promemoria no — quello inviterebbe ad aprire un'app già aperta — e
  ciò che non riconosce non lo mostra. Mai un suono in primo piano: il suono serve a chi non sta
  guardando lo schermo, e in primo piano quel caso non esiste.
- **Tre regole contro tre modi di ripetersi**, e i segni stanno in `app_meta` (`budget_alerts`),
  chiave `vaultId|mese|categoria`. **Il livello sale e non scende**, o un budget che oscilla intorno
  all'80% suonerebbe a ogni scontrino. **La prima volta si guarda e basta** — gruppo appena aperto,
  mese appena cominciato — perché «era già sforato quando ho cominciato a guardare» non è una notizia;
  è la ragione per cui i segni hanno due campi e non uno: senza `watched`, «tutto a posto» e «non ho
  mai guardato» sarebbero entrambi un elenco vuoto. **I segni si aggiornano anche a interruttore
  spento**, o riaccenderlo produrrebbe la raffica degli arretrati.
- **Si scrive prima e si avvisa dopo.** L'ordine inverso rifarebbe lo stesso avviso a ogni giro se la
  scrittura fallisse: un avviso perso si nota una volta, uno ripetuto fa spegnere l'interruttore.
- **I segni si potano al mese in corso**, e si può perché un mese finito non può più essere sforato:
  la spesa porta la data del giorno in cui viene registrata, e il form non ha un selettore di date. Si
  pota per mese e **non** per gruppo — i gruppi aperti sono più d'uno e ciascuno tiene il suo conto.
- **Anche l'80%, non solo il superamento**, benché il piano dicesse «soglia superata»: la soglia
  `near` esiste già nel core e il suo commento dice perché — «avvisare al 95% sarebbe inutile, a quel
  punto il mese è deciso». In Tu la percentuale si legge da `BUDGET_NEAR_THRESHOLD` invece di
  riscriverla a mano.
- **Un avviso solo anche quando i budget sono tre**, perché tre notifiche identiche in fila sono il
  modo in cui si smette di leggerle. Il caso singolo dice i numeri — sapere _quanto_ si è sforato
  distingue un avviso da un rimprovero — e il titolo del caso multiplo dice «superati» solo se lo sono
  tutti: con uno soltanto vicino sarebbe la solita frase falsa accanto a un numero.
- **Canale separato, importanza `DEFAULT`**: separato perché chi zittisce i promemoria dalle
  impostazioni di Android non deve perdere l'avviso di sforamento; `DEFAULT` e non `LOW` perché quello
  è un invito che ci si è chiesti, questo è un numero appena cambiato su cui si può ancora agire.
- **`packages/core` non è stato toccato.** `budgetStatuses` e `stateOf` decidono se un limite è vicino
  o superato; qui si decide solo se quello stato **è nuovo**. E `setReminder` è diventata
  `set(kind, on)`, la firma che lo Step 33 ha poi usato senza modificarla.

## La sincronizzazione ferma (Step 33)

Un terzo interruttore in Tu e una notifica che arriva quando le spese non raggiungono più gli altri
telefoni. Ultimo dei tre contenuti di notifica, tutto JS sopra la build dello Step 30.

- **È una condizione su una scadenza, cioè i due step precedenti insieme** — e il piano lo aveva
  previsto senza deciderlo. Si guarda come il budget (`SyncWatcher` accanto allo `Stack`), ma quello
  che si guarda è **da quanto dura**. Ne segue la scelta che regge tutto: i segni stanno su disco
  (`sync_alerts` in `app_meta`) e non in memoria, perché la durata da misurare è più lunga di una
  sessione dell'app e un contatore che riparte a ogni apertura non arriverebbe mai a
  ventiquattr'ore proprio per chi apre l'app tutti i giorni.
- **Due guai e non tre**, benché le fasi in errore siano tre. `blocked` è **fermo**: il relay
  rifiuta la chiave (401/403), il motore ha smesso di ritentare, e aspettare un giorno per dirlo
  regalerebbe un giorno di divergenza — si avvisa **subito**. `offline` ed `error` sono **in
  ritardo**: il motore riprova da solo e nove volte su dieci passa da sé, quindi si aspettano
  **ventiquattr'ore**.
- **`offline` conta come `error`, ed è la scelta discutibile dello step.** Lo Step 17 aveva stabilito
  che offline non è un errore del relay, e la schermata infatti lo dice senza allarme. Ma quello che
  l'avviso serve a evitare — credere che i due telefoni siano allineati quando non lo sono — succede
  identico nei due casi, e dopo un giorno «sono in aereo» non è più una spiegazione. Cambia il
  rimedio, non il fatto: a cambiare è il testo, non la regola.
- **`idle` e `syncing` non toccano niente**, ed è la riga più facile da sbagliare in silenzio:
  trattarle come «tutto a posto» azzererebbe il conto a ogni avvio, l'avviso non arriverebbe mai e
  non ci sarebbe modo di accorgersene se non aspettando invano.
- **Il watcher si iscrive alla fase, non allo stato intero.** `at` e `retryAt` cambiano a ogni giro
  di poll: dipendere dall'oggetto vorrebbe dire una lettura di `app_meta` ogni due secondi mentre
  tutto funziona. La fase basta perché ogni ciclo passa da `syncing` prima di ricadere in `error` o
  `offline`, quindi la scadenza si ricontrolla a ogni tentativo anche restando fermi su una
  schermata.
- **Le regole contro il ripetersi sono quelle del 32, su un altro asse.** Il livello **sale e non
  scende** (`offline`→`blocked` riavvisa, `blocked`→`error` no); **un avviso per episodio**, e
  l'episodio finisce al primo `synced`; **i segni si aggiornano anche a interruttore spento**, col
  solito prezzo — chi accende mentre il guaio è in corso non riceve niente per quel guaio lì.
  **Si scrive prima e si avvisa dopo.**
- **La potatura è ai gruppi che esistono ancora**, non ai mesi: un gruppo da cui si è usciti non può
  più sincronizzarsi, e senza potatura uscirne mentre il relay era giù lascerebbe una riga per
  sempre.
- **Il nome del gruppo entra nel testo**, a differenza dell'avviso di budget: quello si legge mentre
  lo si è appena provocato, questo si legge ore dopo, e con più gruppi «non si sincronizza» senza
  dire cosa obbliga ad aprire l'app. Il titolo del caso fermo è la stessa frase del pallino in Tu,
  presa da `describe.ts`.
- **Canale `sincronizzazione` separato, importanza `DEFAULT`**, e gestore di primo piano anche per
  questo: lo stato del sync si vede già, ma solo in Tu e in fondo alla lista spese, cioè dove chi ha
  il sync rotto potrebbe non passare per giorni. È la stessa ragione per cui il watcher non vive in
  una schermata.
- **`packages/core` non è stato toccato**, per il terzo step di fila. `SyncState` e `describe.ts`
  dicono **cosa** sta succedendo; qui si decide solo da quanto, e se è già stato detto.

## Il widget del saldo (Step 34)

Il saldo del gruppo aperto sulla schermata home di Android, primo dei due widget dichiarati in
`app.json` allo Step 30. Tutto JS sopra quella build, e senza chiederne un'altra.

- **Il widget non lo disegna l'app, e da qui viene tutto il resto.** Lo disegna il sistema quando
  lo chiede lui — widget appena aggiunto, telefono riacceso, rettangolo ridimensionato — cioè
  quasi sempre ad app chiusa. Risponde un **task headless**: il bundle JS senza provider, senza
  `Y.Doc` montato, senza chiave dal portachiavi. Quindi il disegno **non calcola, legge**: l'app
  calcola quando ha già tutto in mano (`WidgetPublisher` accanto allo `Stack`, dove stanno i due
  watcher) e lascia un foglietto in `app_meta` (`widget_snapshot`); il task lo raccoglie e lo
  disegna. Stessa divisione dei tre step di notifica, fra due lati che non sono nemmeno vivi
  nello stesso momento.
- **Nel foglietto ci sono frasi già fatte, non numeri.** Formattare un importo vuole il simbolo
  della valuta del profilo (Step 29), dire chi deve a chi vuole i nomi dei membri: le due cose
  che il task headless non ha. Salvare `cents` significherebbe rimontare metà app per riscoprire
  ciò che l'app sapeva già un istante prima.
- **`myBalance` è l'unico refactoring, e nasce da una differenza di forma.** La card in cima alle
  spese dice «Juju ti deve 25,00 €» in una riga; il widget ha un numero grande e una didascalia,
  quindi l'importo esce dalla frase. I fatti si decidono una volta sola, le parole due.
- **Da solo in un gruppo non si è «pari» con nessuno.** La card nasconde il saldo con un membro
  solo; il widget non può nascondere niente — è tutta la sua superficie — e dice «Solo tu in
  questo gruppo». Il widget che serve a chi è da solo è quello dello Step 35.
- **Niente data di aggiornamento, ed è una scelta.** Senza refresh in background il widget resta
  fermo finché l'app non si riapre; datarlo sarebbe onesto ma è un campo che nessuno legge, e il
  problema è quello che lo **Step 36** esiste per risolvere. Se dopo l'uso reale risulterà troppo
  vecchio, la risposta è aggiornarlo, non datarlo.
- **`apps/mobile/index.js` esiste per una ragione sola**: il task va registrato **all'ingresso del
  bundle**, perché ad app chiusa React Native cerca un task headless già registrato prima che
  qualunque componente esista. `main` non è più `expo-router/entry`. **Non serve una build EAS
  nuova**: l'app nativa apre l'entry virtuale di Metro, che risolve `main` al momento del bundle.
- **Il task apre il database con una connessione tutta sua** (`isolated`). Può partire mentre
  l'app gira, nello stesso runtime JS, ed expo-sqlite senza `useNewConnection` riusa la
  connessione già aperta: la `close()` del task l'avrebbe chiusa sotto i piedi all'app.
- **«Azzera questo telefono» adesso azzera anche la home.** `wipeDevice` porta via il foglietto
  con il resto di `app_meta`, ma nessuno ridisegnava il widget: il saldo dell'ultimo gruppo
  sarebbe rimasto sullo schermo fino al riavvio. `clearWidgets()` in `useWipeDevice` chiude il
  buco, ed è lo Step 22 applicato a una superficie che allora non c'era.
- **Il freno è nella scrittura, non nel calcolo.** Il saldo si rifà a ogni modifica del documento
  — lo stesso `computeBalances` della home, pagato anche a home chiusa — ma `publishSnapshot`
  confronta con il disco e quasi sempre non scrive: il documento cambia a ogni spesa, il saldo
  mostrato molto più di rado.
- **Due palette e non il tema dell'app**: Android sceglie fra `light` e `dark` **nel momento in
  cui disegna**, e un tema letto dall'app resterebbe chiaro sulla home scura di chi l'ha cambiato
  ad app chiusa. Dei componenti non si riusa niente (`RemoteViews`, non viste), dei token sì — e
  la palette ha ora un test che pretende `#RRGGBB`, perché il cast in `BalanceWidget.tsx` si fida
  di quello.
- **`MonthTotal` rispondeva ma non disegnava** fino allo Step 35, che gli ha dato un contenuto.

## Il totale del mese (Step 35)

Il secondo widget: quanto ha speso il gruppo aperto nel mese in corso. Chiude il filone dei
widget del piano v5.

- **Lo step è piccolo, ed è la notizia.** Le tre scelte dello Step 34 fatte prevedendo questa
  sessione — un campo per widget nel foglietto, la lettura difensiva campo per campo, il
  rettangolo condiviso — hanno retto tutte e tre: `month` è entrato accanto a `balance` **senza
  toccare una riga del saldo**, e c'è il test che dice che un foglietto scritto dal 34 continua a
  disegnare il saldo con il totale assente.
- **La didascalia nomina il mese e non dice «questo mese»**, ed è la decisione dello step. Senza
  refresh in background il numero resta quello dell'ultima apertura, quindi il primo di settembre
  «speso questo mese» sopra il totale di agosto sarebbe una frase falsa scritta da noi. «Speso in
  agosto» resta vero anche vecchio di un giorno. `in` e non `a` regge tutti e dodici i mesi senza
  scegliere fra «a gennaio» e «ad agosto».
- **Il totale è quello del gruppo, non la mia quota**: è lo stesso numero della card in cima alle
  spese, contato sulle stesse spese. La quota personale ha già il suo posto, ed è il saldo.
- **Non è rosso, e non è una dimenticanza.** `colors.expense` è il colore di un'uscita; la somma
  di tutte le spese del mese tinta di rosso diventerebbe un allarme. A dire se si sta spendendo
  troppo c'è il budget, che ha una soglia e una notifica sua.
- **`changedWidgets` ha sostituito `sameSnapshot`.** Con un widget bastava sapere **se** qualcosa
  era cambiato, con due serve sapere **quali**: una spesa tutta mia sposta il totale e non il
  saldo, un pareggio il saldo e non il totale. Senza la distinzione ogni spesa manderebbe due
  giri di `RemoteViews` al launcher invece di uno.
- **Un `WidgetPublisher` solo**, perché i due numeri dipendono dallo stesso documento e cambiano
  nello stesso istante: due componenti avrebbero riscritto lo stesso `app_meta` a turno, con le
  letture accavallate che `chain` esiste per evitare.
- **Un rettangolo solo per due widget** (`WidgetCard.tsx`): la sola differenza è il colore della
  cifra, passato come funzione del tema. `BalanceWidget.tsx` è diventato `views.tsx`.

## Il refresh in background (Step 36)

I widget si aggiornano da soli ogni mezz'ora, ad app chiusa. Era l'unico step del piano v5 marcato
opzionale, ed è l'unico che **chiede una build EAS nuova** dopo quella dello Step 30.

- **Ricalcolare non sarebbe servito a niente, e questa è la scoperta dello step.** Il documento
  locale non si muove da solo: il motore di sync gira solo dentro l'app. Un ricalcolo periodico
  darebbe gli stessi numeri di prima, tranne il primo del mese. Quindi il task headless **fa un
  giro di sync** — monta il vault, parla col relay, applica quello che arriva e riscrive il
  foglietto: fuori dall'albero React, quello che `VaultProvider` fa dentro.
- **Nessuna libreria nuova.** `expo-background-task` e `expo-task-manager` sarebbero stati due
  moduli nativi in più; il provider dei widget ha già la sua sveglia (`updatePeriodMillis`, minimo
  30 minuti), e quella sveglia entra dal `WIDGET_UPDATE` del task headless dello Step 34. Lo step è
  una riga di configurazione e un file di logica. **Ma quella riga finisce nell'XML del provider**,
  quindi serve una build.
- **La sveglia esiste solo se un widget è davvero sulla home**, che una libreria di background
  generica non avrebbe garantito: chi i widget non li usa non paga né batteria né rete.
- **Solo `WIDGET_UPDATE`.** `WIDGET_ADDED` e `WIDGET_RESIZED` arrivano mentre qualcuno **guarda** il
  rettangolo, e un giro di rete da qualche secondo davanti lo lascerebbe vuoto proprio allora.
- **Tre guardie.** Se l'app è in primo piano non si fa niente — due `SyncEngine` sullo stesso vault
  significano due scritture concorrenti, e la compattazione della persistenza non le regge.
  Venticinque minuti fra un giro e l'altro, perché **due widget sulla home sono due risvegli** e
  senza soglia sarebbero due giri identici. E il task **non semina**: seminare le categorie è una
  scrittura nel documento condiviso, e un telefono che scrive nel vault mentre nessuno lo usa è
  ciò che un refresh non deve fare.
- **Metà del valore è nell'altra direzione**, e il nome dello step non lo dice: `engine.start()`
  mette in coda il delta non ancora pubblicato, quindi le spese registrate mentre non c'era rete
  **partono da qui**, senza aspettare che qualcuno riapra l'app.
- **`composeSnapshot` e `CURRENT_GROUP_KEY` sono usciti allo scoperto** perché adesso hanno due
  chiamanti lontanissimi fra loro: l'albero React e un task headless. Due copie che devono dare lo
  stesso numero, di cui una impossibile da guardare mentre gira.
- **Il threat model ha tre voci nuove**, e la più importante è una conseguenza da non scoprire
  tardi: **un lock con biometria e il refresh in background si escludono a vicenda**, perché in
  background non c'è nessuno che possa autenticarsi.
- **`packages/core` non è stato toccato**, per il sesto step di fila — e stavolta è il fatto più
  significativo: il task headless usa `SyncEngine`, `VaultStore` e `SqliteYPersistence` come li usa
  l'app, senza una riga di adattamento. È la ricompensa della regola dello Step 0.

## L'infrastruttura i18n (Step 37)

Le frasi dell'app escono dai componenti ed entrano in due dizionari. `i18next` +
`react-i18next`, campo `language` sul profilo, selettore in Tu, e **una schermata tradotta per
intero** — `tu.tsx`, più le tre etichette dei tab.

- **`expo-localization` non è entrato, ed è la decisione dello step.** Il piano lo nominava, ma
  serviva a una cosa sola — sapere in che lingua è il telefono al primo avvio — ed è un modulo
  nativo: avrebbe reso questo il terzo step a chiedere una build EAS, e avrebbe **rotto l'app
  sulla build oggi installata**. Quella lettura la fa
  `Intl.DateTimeFormat().resolvedOptions().locale`, che su Hermes c'è già, dentro un `try` che può
  rispondere `null`. Stessa conclusione dello Step 36: la cosa che serviva c'era già.
- **L'ordine delle sorgenti è tutto lo step: scelta, poi telefono, poi italiano.** La scelta
  esplicita viene prima perché è l'unica fatta da una persona. `resolveLanguage` riceve la lingua
  di sistema come parametro invece di andarsela a prendere, ed è ciò che rende verificabile senza
  telefono la parte dove sta la decisione.
- **La regione si butta via**: le impostazioni danno `en-GB`, non `en`, e non esiste un dizionario
  `en-GB` distinto da `en-US`. Trattarli come lingue diverse vorrebbe dire non riconoscerne
  nessuna delle due.
- **L'italiano è la fonte, l'inglese la copia, e `fallbackLng` punta alla fonte.** `en.ts` si
  dichiara della forma di `it.ts`, quindi una chiave dimenticata è un errore di `tsc`; e quando la
  traduzione resterà indietro si leggerà la frase italiana, non la chiave grezza.
- **Tre test guardano quello che il tipo non vede**: la frase vuota, che a schermo sembra un
  problema di layout; il `{{segnaposto}}` perso in traduzione, che si legge come una frase senza
  il numero e senza errori; e l'italiano ricopiato di sotto per fretta. Oggi sorvegliano una
  cinquantina di stringhe, ma gli Step 38–39 ne porteranno qualche centinaio.
- **Due cose non passano da `t`**, e sono la stessa regola: i nomi delle lingue nel selettore
  («Italiano», «English») restano tali in ogni lingua, o chi apre quel selettore proprio perché
  non capisce non riconoscerebbe la propria; e i nomi di gruppi, categorie e persone non si
  traducono mai, perché stanno nel documento condiviso.
- **Lingua e valuta qui si separano.** Sono due campi gemelli nel profilo, ma la valuta è una
  scelta comune di fatto — valute diverse sommano unità diverse — mentre la lingua traduce l'app e
  nient'altro: due persone possono leggere lo stesso gruppo in due lingue senza che un numero
  cambi.
- **Il confine di ciò che è tradotto è netto**, e serve a non scambiarlo per un guasto: `tu.tsx`
  tutta, tab compresi; **non** la riga di stato del sync, che la scrive `describe.ts` e che
  compare identica anche in fondo alla lista spese. Tradurre un modulo condiviso vuol dire
  tradurre le schermate che lo usano, ed è lo Step 38.
- **Il threat model non cambia**: la lingua è una preferenza locale in `app_meta`, non esce dal
  telefono e non produce traffico. Le due librerie sono JS puro senza rete — nessun dizionario
  scaricato, nessun permesso nuovo — e `npm audit` non è cambiato.
- **`packages/core` non è stato toccato, per il settimo step di fila**: il core non ha stringhe da
  tradurre perché non ne ha mai scritte. Se un giorno servissero la posizione del simbolo di
  valuta o il separatore decimale per lingua — la nota in `currency.ts` lo prevede — quello sì
  entrerebbe lì.

## La traduzione delle tre schermate (Step 38)

Le tre che si aprono più spesso — spese del gruppo, nuova spesa, elenco dei gruppi — e i sei
moduli condivisi che ci scrivono dentro. Da una cinquantina di stringhe tradotte a duecento.

- **Il problema erano i moduli sotto, non le schermate.** `describe.ts`, `grouping.ts`,
  `balance-line.ts`, `split-text.ts`, `extra-fields.ts` e `list.ts` sono puri di proposito, ed è
  lì che arrivano i test: un hook non ce lo si può mettere. Fanno `import i18n from '@/i18n'` —
  il modulo che **inizializza** l'istanza, non il pacchetto `i18next` — così l'ordine è una
  proprietà del grafo degli import e non una cosa da ricordare.
- **La regola che ne segue, per tutto il resto della traduzione:** quelle funzioni leggono la
  lingua quando girano e non avvisano nessuno quando cambia. A far ridisegnare è
  `useTranslation()` nel componente, che quindi va chiamato **anche senza stringhe proprie**
  (`SyncBadge`, `GroupRow`), e un `useMemo` attorno a quelle chiamate vuole `t` fra le
  dipendenze.
- **Le date sono modelli, non elenchi di parole.** Tradurre i soli nomi dei mesi avrebbe dato
  «Monday 1 August»: in inglese il mese viene prima del giorno. Nel dizionario ci sono cinque
  modelli, e quattro cambiano forma fra le due lingue.
- **I plurali si contano a mano.** `PluralResolver.getRule` di i18next, letto nel sorgente,
  ripiega su una **regola finta** quando `Intl` manca: sceglierebbe sempre la stessa forma e
  scriverebbe «1 spese» senza dirlo. Lo stesso sorgente conferma però che `init` non può fallire
  per assenza di `Intl` — è dentro un `try` — il che ridimensiona un rischio dello Step 37.
- **I test erano diventati dipendenti dalla lingua della macchina**, ed è il guasto che lo step
  ha scoperto in sé stesso: forzando l'inglese ne falliscono **66**, tutti scritti negli step
  precedenti. Un `setupFiles` fissa adesso l'italiano prima di ogni test.
- **I widget sono entrati per forza**, pur essendo dello Step 39: la loro didascalia contiene il
  nome del mese, e sarebbe uscito «Speso in August». `UNKNOWN_BALANCE`/`UNKNOWN_MONTH` sono
  diventate funzioni — una costante di modulo congelerebbe la lingua all'import — e il task
  headless dello Step 36 applica la lingua del profilo.
- **Due cose non passano mai da `t`:** i nomi scritti nel documento condiviso (gruppi, categorie,
  persone, negozi, tag) e `state.message` del sync, che viene dal motore o dal relay — tradurlo
  vorrebbe dire avere l'elenco dei guasti previsti.
- **Resta italiano il formato dei numeri**, ed è il debito aperto dello step: vedi l'avviso in
  cima a questo documento.

## Il formato dei numeri per lingua (Step 39)

Non era nel piano dell'11 agosto: lo ha reso necessario lo Step 38, che ha tradotto tre
schermate lasciandole a scrivere «1.234,56» anche in inglese. **La numerazione da qui in poi è
scalata di uno**: la traduzione del resto è il 40, la verifica su telefono il 41.

- **Era l'unica cosa che la traduzione diceva ancora di falso.** «1.234,56» per un lettore
  inglese non è lo stesso numero scritto in un altro modo: è un numero diverso, perché per lui
  il punto è il decimale. Il resto dello Step 38 diceva qualcosa di _meno_ — la riga del sync
  in italiano, i nomi dei gruppi non tradotti — non qualcosa di sbagliato.
- **Il core riceve il formato, non se lo va a prendere.** `NumberFormat` (i due separatori, il
  lato del simbolo, cosa ci sta in mezzo) è un parametro di `formatCents`/`formatMoney` col
  default italiano, come dallo Step 29 il simbolo è un parametro. `packages/core` non può
  dipendere da `i18next` — regola dello Step 0, verificata da ESLint.
- **Simbolo e formato restano due scelte separate**, e non è pedanteria: si legge in inglese una
  spesa in euro, ed è il caso normale per chi vive qui e non parla italiano.
- **Un modulo, non un argomento in più.** `@/i18n/money` espone le due funzioni con la stessa
  firma di prima e la lingua dentro: il cambiamento su ognuno dei venticinque file che
  formattano denaro è stato **l'import**. Una regola ESLint vieta di importarle dal core, perché
  la prossima chiamata scritta per abitudine tornerebbe all'italiano fisso senza segnali — stesso
  meccanismo di `utf8ToBytes` allo Step 3.
- **Quattro punti componevano importo e simbolo a mano**, e sembravano formattazione: erano la
  decisione «il simbolo va dopo», vera in italiano e falsa in inglese. Tre sono diventati
  `formatMoney`; il quarto, la cifra grande dove il simbolo ha un colore suo, è diventato
  `HeroAmount` — che chiude anche una duplicazione che c'era già.
- **Un bug evitato**: `ExpenseForm` toglieva il raggruppamento con `replace(/\./g, '')`, e in
  inglese quel punto **è il decimale**. Aprire una spesa da 12,30 avrebbe mostrato `1230`, e chi
  avesse salvato senza guardare avrebbe moltiplicato per cento.
- **«CHF5.00» prende uno spazio**, deciso guardando il carattere di confine e non un elenco di
  valute: `CHF 5.00` e `CA$5.00` escono giusti tutti e due.
- **L'export CSV non è cambiato**, ed era già stato deciso bene: `csv.ts` ha una
  `centsToDecimal` sua, con un commento che dice di essere diversa da `formatCents` perché
  quella è «la forma italiana leggibile». Il file esportato è identico nelle due lingue, che è
  l'unica cosa sensata per un file che un foglio di calcolo deve rileggere.

## Il reimport dell'export JSON (Step 42)

`parseVaultExport` in `packages/core/src/export/import.ts`, `VaultStore.importSnapshot`,
`GroupRegistry.createFromState` e la schermata `/importa`. Nasce da un'incoerenza: `/export` diceva
«per conservarli» e produceva un file che **nessuno sapeva rileggere**.

- **Non è il gemello di `/backup`, e la schermata lo dice in cima.** Ripristinare una chiave riapre
  _quel_ vault, sincronizzazione compresa. Importare un JSON ricostruisce i **dati** in un gruppo
  **nuovo**, con una chiave nuova: il file è in chiaro e non contiene alcuna chiave — non potrebbe,
  o chiunque lo riceva entrerebbe nel gruppo. Il gruppo importato non riceve gli aggiornamenti degli
  altri telefoni, e per tornare a condividerlo serve un invito.
- **Il file si rifiuta intero, il record si scarta da solo.** Il primo quando non si sa cosa sia
  (JSON illeggibile, `format` sbagliato, versione futura), il secondo quando il file è giusto ma la
  riga non sta in piedi — e **ogni scarto porta il motivo** fino a schermo, raggruppato per motivo e
  non per record. Un import che perde righe in silenzio farebbe credere di aver riavuto tutto.
- **Le invarianti si difendono alla porta.** È l'unico punto in cui dei record entrano già formati
  senza passare da `addExpense`: quote che sommano al totale, importi interi, `paidBy` e quote
  intestate a membri che esistono davvero. Una spesa pagata da un id assente comparirebbe nei totali
  e sparirebbe dai saldi — la stessa famiglia del bug dei membri duplicati dello Step 11.
- **Categoria e budget hanno criteri diversi**: una spesa con categoria assente entra **senza**
  categoria (`categoryId` è già nullabile), un budget senza categoria si scarta perché non
  comparirebbe da nessuna parte.
- **I file v1 si leggono, quelli di versione futura no.** Gli stessi fallback (`''` e `[]`) di
  `readExpense` per `store` e `tags`; il rifiuto in avanti è la regola dei formati binari di
  [architecture.md](architecture.md) applicata qui.
- **`importSnapshot` conserva gli id ed è tutto il punto**: `newId` spezzerebbe `paidBy`, le chiavi
  di `split.shares` e i due membri di ogni pareggio. Non valida — quella è del parser, e due regole
  divergono — e scrive in **una sola transazione**, quindi un solo update Yjs. `assertEmpty` rifiuta
  un documento che ha già dei record: la fusione cambierebbe dei saldi.
- **Il gruppo nasce già pieno.** `createFromState` scrive lo stato nel log prima che qualcuno possa
  aprirlo, con lo stesso `seedDocument` che usa `regenerate` — passare dal runtime avrebbe lasciato
  una finestra con un gruppo vuoto visibile.
- **L'export non porta il nome del gruppo** (sta in `meta`, che `VaultSnapshot` non attraversa): si
  propone la data del file e si lascia cambiare, invece di alzare la versione del formato.
- **Si incolla, non si sceglie un file**: `expo-document-picker` è un modulo nativo. Sesta volta.

## L'avviso «chiave non salvata» (Step 43)

Il quarto interruttore in Tu, `features/notifications/backup.ts`, `BackupWatcher` accanto agli altri
due watcher, e `recordBackup` chiamata da `/backup` quando la cifratura riesce.

- **È il rischio peggiore dell'app, e finora stava scritto dove lo legge solo chi non ne ha
  bisogno**: la frase «persa la chiave, i dati non tornano» è in cima a `/backup`, cioè la legge chi
  il backup lo sta già facendo.
- **La `vaultKey` non cambia mai, quindi l'avviso è più semplice degli altri tre.** Niente scadenza
  da riarmare, nessun livello che sale: o la chiave è al sicuro o non lo è, e salvata una volta il
  gruppo esce dal giro per sempre.
- **Soglia in spese, non in giorni** (cinque): quello che si rischia si misura in quanto c'è dentro,
  e avvisare un gruppo vuoto insegnerebbe a ignorare l'avviso prima che diventi vero.
- **Un avviso per gruppo, mai ripetuto**, come «un avviso per episodio» dello Step 33 — applicato a
  un episodio che non finisce.
- **«Non risulta» e non «non hai salvato».** L'app conosce i backup che ha visto fare, e prima di
  oggi quel segno non lo scriveva nessuno: un gruppo salvato l'anno scorso risulterà «mai salvato».
  La prima frase è vera in entrambi i casi, la seconda sarebbe falsa in uno — stessa disciplina che
  ha bocciato «Metà e metà» al passo 7 del redesign.
- **`parseBackupMarks` sbaglia dalla parte opposta a `parseSyncMarks`**, di proposito: là un segno
  illeggibile vale «mai visto» per non avvisare su un guasto finito, qui vale «mai salvato» perché
  sbagliare di là produrrebbe silenzio su una chiave a rischio.
- **Marcare il backup è il massimo osservabile**: né il foglio di condivisione né gli appunti dicono
  se il file è stato conservato. «Salvato» qui significa «la chiave cifrata ha lasciato l'app».

## I due bug che rendevano sbagliati i numeri sono corretti

Entrambi nel codice e coperti dai test. **Nessuno dei due è ancora stato visto risolto su due
telefoni veri** — è la verifica che manca, e va fatta in entrambe le direzioni.

- ~~**La sincronizzazione è unilaterale.**~~ **Corretto allo Step 10.** `SyncEngine.start()` ora
  pubblica il delta fra il documento e lo state vector dell'ultima pubblicazione riuscita, che il
  `SyncCursorStore` ricorda. Copre lo storico precedente al vault, il seed, la chiave adottata su un
  documento già pieno e gli update prodotti a motore spento. Insieme è stato corretto un secondo
  difetto trovato leggendo: su una pagina interamente indecifrabile il cursore saltava a `head`, cioè
  alla fine dell'**intero** log, perdendo in silenzio tutti gli update validi che seguivano.
- ~~**I membri si duplicano e il saldo è sbagliato.**~~ **Corretto allo Step 11.** Il membro non
  nasce più da un id casuale generato su ogni dispositivo, ma dal **profilo**: `profileId` è lo
  stesso su tutti i gruppi e non cambia mai. Le categorie di default non vengono più seminate da chi
  **entra** in un vault esistente — era la ragione delle sedici invece di otto.

> **Non serve più cancellare i dati a mano.** Lo faceva prescrivere l'assenza di migrazione; dallo
> Step 12 la **ripartenza pulita è automatica**: al primo avvio l'app trova lo schema a vault unico,
> elimina quelle tabelle e la vecchia chiave, e riparte. Il profilo sopravvive. Il pairing va rifatto,
> perché la vecchia chiave è stata eliminata insieme ai dati che il vecchio membro «Io» rendeva
> sbagliati.

## Riferimenti operativi

- Repo: https://github.com/FRFAL99/JuTrack (privato)
- Relay in produzione: **https://jutrack-relay.jutrack-relayfrfal.workers.dev**
- Account Cloudflare: `francesco.fallavena@gmail.com`, già autenticato in `wrangler`

```bash
npm run format:check && npm run lint && npm run typecheck && npm test   # verifica completa
cd services/relay && npm run e2e                       # prova cifrata contro il relay
cd apps/mobile && npx expo export --platform android   # il bundle regge?
npm run prova                                          # la checklist end-to-end, senza telefono
npm run peer -- crea "Prova"                           # un secondo dispositivo, interattivo
```

Sono esattamente i passaggi della CI, nello stesso ordine: `.github/workflows/ci.yml` gira a ogni
push, su qualunque ramo.

`expo export` va eseguito a ogni step: ha già intercettato una trappola che né typecheck né test
vedevano.

## L'app gira sul telefono ✅

**Bloccante risolto il 2026-08-01.** La causa non era nel codice: **Metro era in esecuzione dalla
root del monorepo** invece che da `apps/mobile`, e da lì non esiste alcun progetto Expo — l'entry
point non si risolveva e il server rispondeva 404 a ogni richiesta di bundle. Storia completa e
lezione di metodo in [troubleshooting-avvio-app.md](troubleshooting-avvio-app.md).

```bash
cd apps/mobile && npx expo start --dev-client    # MAI dalla root del monorepo
```

Development build EAS installata su Android. **Diagnostica: 16 passaggi su 16, «TUTTO OK»** — Yjs,
`Y.Doc` con lo shim lib0/webcrypto, crypto su Hermes vero, XChaCha20-Poly1305, SQLite, SecureStore,
relay in produzione, invito di pairing, QR, fotocamera, **notifiche locali e widget Android**.

- Progetto EAS: `@frfal/jutrack`, build con `npx eas-cli build -p android --profile development`
- Il keystore Android è custodito da EAS: serve per ogni aggiornamento futuro dell'app installata

> **La build del 12 agosto 2026 è quella dello Step 30**, installata e verificata: la diagnostica
> risponde `15. notifiche locali: modulo disponibile, permesso non concesso` e
> `16. widget Android: 2 provider rispondono (0 + 0 sulla home)`. «Permesso non concesso» e gli zeri
> erano **l'esito atteso** di allora: il permesso l'ha poi chiesto lo Step 31, il saldo ha ricevuto
> un contenuto con lo Step 34, e «speso questo mese» lo riceve col 35.
>
> **Questa build sblocca gli Step 31–35, che sono JS e non ne chiedono altre** — lo Step 34 lo ha
> confermato anche per il cambio di `main`, che Metro risolve al momento del bundle. Ne resta fuori
> il solo Step 36, opzionale e da riaprire solo se il refresh ad apertura app non basta.
>
> **Ha portato con sé anche `expo-file-system` ed `expo-sharing`**, aggiunti allo Step 9 e mai finiti
> in una build: il foglio di condivisione dell'export dovrebbe funzionare adesso, invece di ripiegare
> sugli appunti. Non è stato ancora guardato — vedi la lista qui sotto.

## Cosa non è ancora stato verificato su hardware reale

Va detto con precisione, perché è la differenza fra «testato» e «funzionante». Dopo la diagnostica
la lista si è accorciata parecchio, ma non è vuota — ed è **la sola cosa che resta da fare sui primi
quattro piani e sul redesign**. Il piano v5 aggiunge codice nuovo e quindi righe nuove a questa
lista, non le toglie.

> **Da dove cominciare, se si ha un telefono in mano e mezz'ora.** Nell'ordine, perché è l'ordine in
> cui un guasto rende inutile provare il resto: **(1)** l'app si apre e la home mostra le spese del
> gruppo giusto (passo 6); **(2)** si registra una spesa e ricompare nella lista col totale giusto
> (passo 7); **(3)** un invito mandato in chat apre `/groups/<id>` sul gruppo giusto sull'**altro**
> telefono; **(4)** la spesa compare sull'altro telefono, **e in entrambi i versi** — è il criterio
> di «fatto» che manca a tutti e tre i piani. I punti 1 e 2 si provano con un telefono solo; i punti
> 3 e 4 sono quelli che non sono mai stati visti funzionare.

- Il ciclo di sync completo **fra due telefoni fisici**: provato una volta e **fallito** (una sola
  direzione, con ritardi di parecchi secondi, e membri duplicati). Le cause sono state corrette agli
  Step 10 e 11, ma la riprova sul campo non è ancora stata fatta. È la verifica più importante della
  lista: due membri e non quattro, saldo che coincide col calcolo a mano, e la spesa che compare
  sull'altro telefono **in entrambi i versi**
- La **schermata di onboarding** del profilo, che al primo avvio viene mostrata **fuori** dallo
  `Stack` di expo-router — come già facevano le schermate di attesa e di errore, ma quella è la prima
  interattiva a farlo
- Il **pairing ottico**: che il QR mostrato da un telefono venga davvero inquadrato dall'altro. La
  generazione è confermata, la scansione no
- Che `expo-sqlite` **persista fra due riavvii** dell'app: la diagnostica scrive e rilegge nella
  stessa sessione, che è meno
- Le **schermate degli Step 7, 8 e 9** — statistiche, budget, pareggi, quote libere, export, backup
  della chiave — mai toccate con un dito. Statistiche e quote libere sono state anche **riscritte**
  dal redesign (passi 5 e 7), quindi non è più solo «mai provate»: è codice nuovo mai provato
- L'**APK autonomo** (profilo `preview`), che gira senza Metro: mai costruito
- Il costo di `scrypt` con `logN = 16` su mobile (default da calibrare, in
  `packages/core/src/crypto/backup.ts`). La schermata di backup **misura e mostra** il tempo
  impiegato: basta un backup reale per avere il numero
- Il **foglio di condivisione** e la scrittura del file in cache: richiedono una build che contenga
  `expo-file-system` ed `expo-sharing`, aggiunti allo Step 9
- **Tutto lo Step 12**, che è nuovo di oggi: due gruppi che tengono le spese davvero separate, il
  cambio di gruppo che non lascia appesi engine o persistenza, la **ripartenza pulita** che non
  cancelli più del dovuto, e la domanda «chi sei in questo gruppo?» a chi entra
- **Tutto lo Step 13**, anch'esso di oggi, e in particolare i due punti dove può fallire in
  silenzio: che Android consegni il link `jutrack://join#…` **con il fragment** alla rotta `/join`
  (se lo perdesse per strada, l'app riceverebbe un invito senza chiave), e che il foglio di
  `Share.share` compaia davvero nella build installata. La pagina `/j` è già in produzione e
  risponde: quello che manca è il giro completo, dal link mandato in chat al gruppo aperto
- La **scala del poll** dello Step 16: che una spesa scritta sull'altro telefono compaia entro pochi
  secondi mentre entrambi sono aperti, e ancora entro un minuto dopo che uno è rimasto fermo cinque
  minuti. È il punto 5 del criterio di «fatto» del piano v3, e a occhio si vede subito
- L'**`offlineRetryMs`** dello Step 17: telefono in aereo, due spese, rete riaccesa → devono partire
  entro ~15 s senza toccare nulla. È il sostituto del listener di connettività, quindi è la prova che
  quel sostituto basta
- **La navigazione dello Step 18**: che il gesto «indietro» dentro il tab Gruppi torni all'elenco e
  non esca dall'app; che la tab bar resti visibile sul gruppo e sparisca sulle schermate-foglia; e
  soprattutto che **un invito ricevuto in chat apra ancora `/groups/<id>` col gruppo giusto**. Gli URL
  sono verificati sui tipi generati da expo-router, il che è molto, ma non è il telefono
- **Lo Step 19**: che le cinque `NavCard` della gestione del gruppo — categorie, budget, pareggi,
  backup della chiave, export — aprano davvero le schermate giuste, e che il loro «Chiudi» riporti al
  gruppo invece di uscirne. Gli URL non sono cambiati, quindi il rischio è basso, ma è lo stesso tipo
  di rischio dello Step 18
- **Lo Step 20**: che quattro etichette stiano nella tab bar senza troncarsi («Impostazioni» è la
  lunga), che il tab Profilo salvi il nome **sul blur** e che il cambio si veda subito nel gruppo, e
  che `/azzera` si apra e si chiuda
- **Lo Step 21, ed è quello che conta di più**: che al primo avvio da azzerato si arrivi
  all'onboarding del profilo e poi a **zero gruppi**, con i tre ingressi funzionanti; che creare il
  primo gruppo **non azzeri la pila di navigazione** (è la ragione della fase `absent`); che uscire
  dall'ultimo gruppo riporti all'elenco vuoto senza spinner appesi; e soprattutto che **chi ha già
  dei dati non si accorga di nulla** — nessuna migrazione, quindi l'unico modo di saperlo è aprirla
  su un telefono che i gruppi ce li ha già
- **Lo Step 22**, che è l'unico gesto dell'app che **non si può annullare**: doppia conferma,
  ritorno all'onboarding **senza riavviare**, e — la parte che conta — che registrando un profilo
  nuovo non riappaia nulla di prima. Da guardare anche il caso con un gruppo aperto e il motore che
  gira: fra il tocco e l'onboarding devono passare frazioni di secondo, non secondi, e nessun errore
  deve comparire in console mentre il motore si spegne
- **Il passo 6 del redesign, ed è quello con più modi di fallire in silenzio.** Tre cose in
  particolare: che **un invito ricevuto in chat apra ancora `/groups/<id>` col gruppo giusto** — la
  radice del tab è cambiata, gli URL no, e questa è la terza volta che quella prova viene rimandata;
  che cambiare gruppo dal foglio **non torni indietro da solo** quando si parte da `/groups/<id>`
  (è il `dismissTo` prima del `select`, e a occhio si vede subito); e che il gesto «indietro» dalla
  radice esca dall'app invece di finire su una schermata vuota, ora che sotto le spese non c'è più
  l'elenco. Da guardare anche la `Modal` del foglio su Android: è l'unica dell'app che arriva dal
  basso, e la tab bar le sta sotto
- **Il passo 7**, che è la schermata che si apre più spesso e l'unica in cui si **scrive** qualcosa
  che finisce nel documento condiviso. Il rischio non è l'impaginazione ma la tastiera: che il
  tastierino numerico non copra il bottone «Salva la spesa», che sta in fondo (il
  `KeyboardAvoidingView` c'era già, ma prima il bottone non era l'ultima cosa della pagina); che
  toccando la cifra da 46px si apra davvero il tastierino decimale e non quello intero; e che la nota,
  che adesso è una riga che **diventa** un campo al tocco, salvi quello che si scrive quando si esce
  dal campo invece di perderlo. Da verificare anche che la quota sotto ogni persona si aggiorni
  mentre si digita, perché è il modo in cui la schermata spiega le tre modalità di divisione
- **Lo Step 23**, che sul telefono per ora si vede in un posto solo: l'**export CSV**, che adesso ha
  sedici colonne invece di quattordici. Il resto — un negozio scritto di qua che arriva di là — non è
  provabile finché non si fa la prova sui due telefoni, ed è esattamente il criterio di «fatto» del
  piano v4. Quello che si può guardare subito è che l'app apra e mostri **le spese registrate prima**
  senza inciampare: i due campi non esistono in quei record, e sono i fallback dei reader a reggerli
- **Lo Step 24, e il rischio è la tastiera**, non l'impaginazione: la sezione nuova sta in fondo, e
  sopra il bottone «Salva la spesa» che già stava all'ultimo posto. Da guardare che il tastierino
  non copra il salva mentre si scrive un tag, che `submitBehavior="submit"` tenga davvero il fuoco
  sul campo fra un tag e l'altro (è il punto in cui un tag si perde in silenzio), e che toccando
  «Salva» con un tag scritto e **non** confermato quel tag finisca comunque nella spesa. Poi le due
  conversioni a `Chip`, che sono modifiche a punti collaudati: le tre modalità di divisione e le
  pillole delle categorie devono selezionarsi e deselezionarsi come prima, con l'icona di categoria
  al suo posto
- **Lo Step 26, ed è il primo del piano v4 che si vede.** Il tab Grafici è lungo il triplo di
  prima e disegna in SVG in otto punti nuovi. Da guardare, in ordine: che la schermata **scorra
  fluida** fino in fondo (undici grafici che si misurano da soli, un render in più ciascuno); che
  **nessuno sbordi** — ognuno si misura con `onLayout` e la prima passata avviene a larghezza zero,
  quindi il rischio è un grafico che resta vuoto, non uno storto; che **heatmap, treemap e curve si
  leggano in tema chiaro e in tema scuro**, che è il punto 5 del criterio di «fatto» del piano v4;
  che il **tocco sulla cella della heatmap e sul riquadro del treemap** scriva davvero giorno e
  importo sotto — sono la compensazione che rende leggibili quei due grafici a chi le tinte non le
  distingue, e se non funzionassero il grafico resterebbe un colore e basta; e che con **un solo
  membro** nel gruppo le sezioni che ne vogliono due semplicemente non compaiano (il messaggio che
  dice cosa manca è lo Step 28, non questo). Da provare anche con **poche spese**: un mese con due
  spese sole è il caso in cui una scala piatta o un quantile mancante si vedono subito
- **Lo Step 27, ed è il punto 3 del criterio di «fatto» del piano v4.** La prova è una sola frase e
  si vede a occhio: **cambiando un filtro devono cambiare tutti i grafici insieme**, e il totale in
  testa continuare a coincidere con la somma di ognuno. In particolare il **filtro persona**, dove
  un numero plausibile e sbagliato non si riconosce guardandolo: con «a carico di», una spesa
  divisa a metà deve contare **la metà**; con «ha pagato», per intero. Poi le cose che possono
  rompersi in silenzio: che la barra dei chip **scorra** senza rubare lo scorrimento verticale alla
  schermata; che il foglio si apra da qualunque chip e che «Fatto» lo chiuda; che scegliendo un
  intervallo di due tocchi sulla griglia il periodo sia quello **raddrizzato** anche toccando prima
  la data più avanti; che toccando una barra mensile il periodo diventi quel mese e le sei barre si
  riancorino; che con un filtro che non trova niente compaia lo **stato vuoto** con «Azzera i
  filtri» invece di undici grafici piatti; e che la **heatmap su «ultimi 12 mesi»** si trascini
  invece di sbordare. Da guardare anche il primo avvio dopo l'aggiornamento: il periodo di partenza
  è «Questo mese», cioè esattamente quello che la schermata mostrava prima
- **Lo Step 28, e sono i punti 4 e 6 del criterio di «fatto» del piano v4.** Il punto 4 è una prova
  sola e va fatta per intero: togliere un widget, **chiudere e riaprire l'app**, e ritrovarlo
  tolto; poi riordinarne uno con i chevron e ripetere il giro. È l'unica cosa che dimostra che
  `app_meta` sta davvero conservando il layout, e non lo si può vedere senza chiudere l'app. Il
  punto 6 è il gruppo con **un solo membro**: i tre widget che ne vogliono due devono dire cosa
  manca invece di sparire, e la stessa frase deve comparire nel selettore accanto al nome. Poi le
  cose che possono rompersi in silenzio: che spegnendo tutti i widget compaia lo **stato vuoto**
  con l'indicazione di dove ritrovarli, invece di una pagina bianca; che il pulsante «Componi» in
  alto a destra resti visibile con due filtri attivi (è fuori dalla riga scorrevole apposta); che
  i chevron siano disabilitati in cima e in fondo; e che **il totale in cima abbia adesso
  un'etichetta**, come tutti gli altri blocchi — è il cambiamento visivo più evidente dello step
- **Tutto lo Step 14**: che la cancellazione dal relay risponda davvero — è la prima richiesta di
  rete che parte da un gesto dell'utente e non dal motore di sync — e che dopo una rigenerazione
  l'altro telefono entri nel gruppo nuovo col link e ci ritrovi le spese di prima
- **Lo Step 29, e le due prove che contano vogliono un riavvio e una spesa vecchia.** La prima:
  scegliere una valuta in Tu, **chiudere e riaprire l'app**, e ritrovarla — il campo sta in
  `app_meta` come il layout della dashboard, e come quello non lo si vede senza chiudere. La seconda:
  che una spesa registrata **prima** dello step conservi il proprio simbolo nella lista mentre tutto
  il resto della schermata usa quello nuovo; è l'unico punto in cui le due regole convivono a video,
  e se `ExpenseRow` leggesse il profilo invece della spesa non si noterebbe finché non si cambia
  valuta. Poi le cose che si vedono a occhio: che il simbolo sia cambiato **anche nei grafici e nel
  foglio dei filtri** (sono i punti più lontani da dove si sceglie), e che le sei pillole del
  selettore stiano in larghezza senza troncarsi — «AUD A$» è la più lunga

- **Il foglio di condivisione dell'export**, che fino all'11 agosto era impossibile da provare: la
  build che lo conteneva non esisteva, e l'export ripiegava sugli appunti dichiarandolo
  nell'interfaccia. La build dello Step 30 porta `expo-file-system` ed `expo-sharing`, quindi adesso
  la prova si può fare: esportare un CSV e vedere se compare il foglio di sistema invece del ripiego
- **Lo Step 31, di cui sul telefono si vede quasi tutto subito — tranne la notifica.** Accendere
  «Promemoria spese» deve far comparire il dialogo di Android, e da lì il passaggio 15 della
  diagnostica deve passare a «permesso concesso»; l'interruttore deve sopravvivere a un riavvio, e
  negando il permesso deve **restare giù** con l'avviso che spiega perché. L'avviso vero però
  arriva **tre giorni dopo**, e non c'è modo di affrettarlo se non toccando `REMINDER_DAYS` o
  l'orologio del telefono: la logica della scadenza ha i test — incluso il cambio di ora legale — e
  quello che il telefono deve confermare è il permesso e il canale. Da guardare anche che, revocando
  il permesso dalle impostazioni di sistema, riaprendo Tu compaia la riga «Android sta bloccando»
- **Lo Step 32, che al contrario del 31 si vede in un minuto** — e proprio per questo va provato
  bene. Serve un budget basso su una categoria e una spesa che lo supera: la notifica deve comparire
  **mentre si è ancora nell'app**, ed è il pezzo che senza il gestore di primo piano non si
  vedrebbe affatto (il difetto peggiore, perché non lascia traccia). Poi le tre cose che possono
  rompersi in silenzio: che registrando una **seconda** spesa nella stessa categoria l'avviso **non**
  si ripeta, che cancellando la spesa e rifacendola non ne arrivi un altro (è il livello che non
  scende), e che nelle impostazioni di sistema il canale «Budget del mese» esista **separato** da
  «Promemoria spese». Da guardare anche l'80%: portare una categoria appena sopra la soglia senza
  superare il limite deve dare «Budget quasi finito», e il superamento successivo un secondo avviso
  diverso. E la prova che richiede un riavvio: aprire un gruppo mai guardato in questo mese con un
  budget **già** sforato **non** deve avvisare — è il primo giro silenzioso, ed è l'unica regola
  dello step che si nota solo quando manca
- **Lo Step 33, dove un caso si prova in due minuti e l'altro chiede un giorno vero.** Il caso
  **fermo** è quello facile e va provato per primo: si rigenera un gruppo da un telefono e si guarda
  l'altro, che deve ricevere «Sincronizzazione fermata» quasi subito e **in primo piano**. Il caso
  **in ritardo** richiede ventiquattr'ore effettive — o la modalità aereo tenuta accesa e l'app
  riaperta il giorno dopo — e la cosa da guardare è che il testo dica «da un giorno» e che il giorno
  successivo **non** si ripeta. Poi le tre che possono rompersi in silenzio: che riaprendo l'app la
  scadenza sia contata **anche sul tempo a app chiusa** (è la ragione per cui i segni stanno in
  `app_meta`, e in memoria non si vedrebbe mai); che dopo un sync riuscito un guasto **nuovo** possa
  avvisare di nuovo; e che nelle impostazioni di sistema il canale «Sincronizzazione» esista separato
  dagli altri due. La logica ha i test, incluso il tempo a app chiusa; quello che il telefono deve
  confermare è che l'avviso compaia davvero e che non si ripeta
- **Il selettore di widget di Android**, che la diagnostica non può guardare: tenendo premuto sulla
  home devono comparire «JuTrack — saldo» e «JuTrack — speso questo mese» con le loro descrizioni.
  `getWidgetInfo` prova che i provider **rispondono**; solo il selettore prova che etichette e
  dimensioni sono quelle scritte in `app.json`. Da qui in poi **entrambi** hanno un contenuto: un
  widget che resta vuoto adesso è un difetto, non un'attesa
- **Lo Step 34, che è il primo pezzo di JuTrack che vive fuori dall'app e non è verificabile
  altrimenti.** Nell'ordine: che il widget «JuTrack — saldo» aggiunto alla home **si popoli** invece
  di restare vuoto; che una spesa che sposta il saldo si veda sulla home **senza riaprire l'app**;
  che dopo un **riavvio del telefono** il widget si ridisegni da solo — è il caso per cui esiste il
  task headless, ed è quello che fallirebbe in silenzio se la registrazione all'ingresso del bundle
  non funzionasse; che cambiando gruppo dalla pill il widget **segua**; e che azzerando il telefono
  il saldo **sparisca dalla home**. Da guardare anche il tema scuro, disegnato da un ramo che l'app
  non percorre mai, e il tocco sul rettangolo, che deve aprire l'app. Il primo avvio dopo questo
  step è anche la prima esecuzione di `index.js` come entry: se l'app si apre, quel cambio ha
  funzionato
- **Lo Step 35, che aggiunge al 34 una prova che con un widget solo non si poteva fare**: registrare
  una spesa e guardare **quale dei due si aggiorna** — una spesa tutta mia deve muovere il totale
  del mese e lasciare fermo il saldo, un pareggio il contrario. Poi i due widget **affiancati sulla
  home**, che devono leggersi come due cose diverse e non come lo stesso rettangolo ripetuto; e il
  riavvio, che qui è il task headless con due nomi da distinguere invece di uno. La prova che chiede
  pazienza è il **primo del mese**: il totale deve ripartire da zero alla prima apertura dell'app, e
  fino ad allora la didascalia deve dire il mese giusto per il numero che mostra — è la ragione per
  cui non dice «questo mese»
- **Lo Step 36, che prima della build EAS nuova non è provabile affatto**: sulla build installata
  oggi `updatePeriodMillis` è 0 e la sveglia non suona. Dopo l'installazione, nell'ordine:
  aggiungere un widget, registrare una spesa **sull'altro telefono** e lasciar passare mezz'ora
  senza toccare il primo — il widget deve cambiare da solo. Poi il caso che vale il doppio, perché
  prova la direzione che il nome dello step non nomina: chiudere l'app in aereo dopo aver registrato
  una spesa, riaccendere la rete e **non riaprire l'app**, e vedere quella spesa arrivare all'altro
  telefono lo stesso. Infine la guardia: con l'app aperta davanti, il giro periodico non deve fare
  niente. Da tenere d'occhio nei giorni seguenti la voce di JuTrack nei consumi di sistema, che è
  l'unico modo di sapere se mezz'ora è il numero giusto
- **Lo Step 37, dove la prova facile va fatta per prima e quella difficile richiede un telefono in
  inglese.** La facile: toccare «English» in Tu e vedere cambiare **la schermata sotto le dita e le
  tre etichette dei tab** — quelle sono la prova che il cambio esce da dove lo si è toccato — poi
  chiudere e riaprire l'app e ritrovarlo, perché il campo sta in `app_meta` come la valuta e come
  quella non lo si vede senza chiudere. La difficile è l'unica cosa dello step che i test non
  possono toccare: **che `Intl` esista davvero su Hermes**. Si guarda su un telefono con la lingua
  di sistema in inglese e **nessuna scelta salvata** — cioè dopo un azzeramento: se l'app parte in
  inglese, `Intl` c'è; se parte in italiano, il ripiego ha funzionato e la lettura no. Nessuno dei
  due casi rompe niente, ma solo il telefono dice quale dei due si sta percorrendo. Poi le due che
  possono rompersi in silenzio: che la riga di stato del sync resti in italiano **di proposito**
  (è lo Step 38, non un guasto), e che i nomi di gruppi e categorie **non** cambino cambiando
  lingua — se cambiassero, vorrebbe dire che si sta traducendo il documento condiviso
- **Lo Step 38, e il rischio non è il testo ma la tastiera.** Il form della spesa è stato toccato
  in venti punti, tutti di stringhe, ma è la schermata in cui si **scrive** nel documento
  condiviso: da rifare le prove del passo 7 del redesign — che il tastierino decimale non copra
  «Salva la spesa», che la nota salvi uscendo dal campo, che un tag scritto e non confermato
  finisca comunque nella spesa. Poi le cose che si vedono solo in inglese: che «Who pays and how
  it splits» non sbordi dove «Chi paga e come si divide» stava, e che le tre pillole di divisione
  ci stiano in riga con le etichette nuove. Infine la prova che tiene insieme lo step: mettere
  l'app in inglese e **scorrere la lista spese**, dove le intestazioni dei giorni devono dire
  «Monday, August 3» e non «Monday 1 August» — e il totale del mese in cima «August», non
  «agosto»
- **Lo Step 39, e la prova che conta è una sola.** Aprire **in inglese** una spesa registrata
  prima: il campo importo deve mostrare `12.30`, non `1230`. Era il bug che lo step ha evitato,
  e salvare senza accorgersene avrebbe moltiplicato l'importo per cento. Poi le due cose di
  impaginazione: che la cifra grande in cima alle spese e ai Grafici non vada a capo col simbolo
  davanti (`€1,234.56` è più stretto di `1.234,56 €`, quindi il rischio è basso, ma è l'unico
  numero a 38 punti), e che nei grafici le etichette compatte dicano «1.2k» e non «1,2k». Da
  guardare anche un gruppo in **franchi** letto in inglese: deve dire «CHF 5.00» con lo spazio

Tutto il resto è verificato: 1088 test, convergenza CRDT, relay reale in produzione, e l'esecuzione
su un dispositivo Android reale.

> **Lo Step 25 è entrato in questa lista attraverso il 26**, come era stato scritto: la geometria
> non aveva interfaccia e non c'era niente da guardare, ma adesso quei numeri sono marche su uno
> schermo, e guardare i grafici del 26 è anche il modo di guardare il 25.

## Trappole già risolte — da non riscoprire

| Trappola                                                                                                      | Soluzione adottata                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `TextEncoder` non esiste su Hermes                                                                            | UTF-8 scritta in `crypto/encoding.ts`; vietato l'import da noble                                        |
| Yjs non fa il bundle su RN (`lib0` → `isomorphic-webcrypto`, fermo al 2022)                                   | Alias in `metro.config.js` verso uno shim su `expo-crypto`                                              |
| `storage.deleteAll()` su Durable Object SQLite cancella anche le tabelle                                      | `ensureSchema()` subito dopo, con test di regressione                                                   |
| Un blob corrotto blocca **tutti** gli update successivi di quel device                                        | Ripubblicazione dello stato completo al rilevamento                                                     |
| TypeScript bloccato a 6.x                                                                                     | `typescript-eslint` dichiara peer `typescript <6.1.0`                                                   |
| Nella flat config ESLint vince l'ultima regola                                                                | Gli override vanno **dopo** il blocco generale                                                          |
| Metro annunciava `127.0.0.1` come host del bundle                                                             | `REACT_NATIVE_PACKAGER_HOSTNAME=<ip-lan>`                                                               |
| expo-router importa **tutte** le route al boot: un modulo nativo rotto uccide l'app intera                    | `expo-camera`, `expo-file-system`, `expo-sharing` con `require` in `try/catch`                          |
| **`expo start` dalla root del monorepo**: 404 su ogni bundle, app muta                                        | Avviarlo **sempre** da `apps/mobile`; è costato giorni                                                  |
| Due copie di React (`expo-*` dichiara `"react": "*"`)                                                         | `overrides` nella root + lock rigenerato; `expo-doctor` lo vede                                         |
| `DELETE FROM sync_pending` senza `WHERE`: con due gruppi cancella la coda offline dell'altro                  | Colonna `vault_id` ovunque, e un test su SQLite vero — con un finto motore passerebbe comunque          |
| I tipi delle rotte expo-router non li rigenera `expo export`, ma `expo start`                                 | Sono in `.expo/types/`, gitignorato: in CI non esistono e il typecheck passa lo stesso                  |
| **expo-router non espone il fragment**: `useLocalSearchParams` vede il percorso e la query                    | La rotta `/join` legge il link grezzo con `Linking.useLinkingURL()`                                     |
| Uscire da un gruppo **mai sincronizzato**: `no such table: sync_state`                                        | `SqliteSyncStore.forget` passa dallo stesso `ensureSchema` di `open`                                    |
| La schermata del gruppo riselezionava il gruppo **appena abbandonato**: app ferma sul caricamento             | Guardia nella schermata **e** in `select`, che rifiuta un `vaultId` non nel registro                    |
| Spostare rotte con `.expo/types/` gitignorato: gli href obsoleti passano typecheck **e** lint                 | Grep sugli href, poi `expo start` per rigenerare i tipi e `tsc` **con quei tipi presenti**              |
| **SecureStore non sa elencare i propri slot**: cancellare `groups` per primo orfanerebbe le chiavi            | `wipeDevice` legge `registry.list()` come primissima operazione, prima di qualunque DELETE              |
| Dopo `DELETE FROM app_meta`, `ensureSchema` scambia le tabelle di sync per quelle del vecchio schema          | Innocuo di proposito: a quel punto sono vuote e `SqliteSyncStore.open` le ricrea — scritto nel codice   |
| **Un `<Redirect>` in una schermata di stack scatta anche quando non è a fuoco**: quelle sotto restano montate | Componente condiviso fra le due rotte, che non naviga — vedi `GroupHome` (passo 6)                      |
| Cambiare gruppo mentre si è su `/groups/<id>`: la guardia del layout lo riporta indietro subito               | `dismissTo('/')` **prima** di `select()`, così la guardia è già smontata                                |
| Un token di stile con `as const` non è assegnabile a `TextStyle` (`fontVariant` diventa `readonly`)           | Tipizzarlo `Pick<TextStyle, …>`; e un token che nessuno usa non compila senza che nessuno lo sappia     |
| `-shares[me]` con quota zero dà `-0`, che non è `0` e a valle si legge come debito                            | `net === 0 ? 0 : net` in `yourShareCents`, con il test che lo fissa                                     |
| Un campo nuovo letto senza fallback: un record dall'altro telefono fa saltare `listExpenses` intera           | Reader difensivi: `strList` accetta solo array e solo stringhe, e i test ci scrivono dentro un `42`     |
| Disinnescare le formule **dopo** aver unito i tag in una cella CSV: protegge solo il primo                    | `neutralizeFormula` su ciascun tag, poi il `join(';')` — e il test guarda il secondo, non il primo      |
| Testo bianco fisso dentro una tinta: metà dei colori di categoria di default sta sotto 3,7:1                  | `inkOn` confronta i **due contrasti veri**; la soglia WCAG vale contro bianco e nero puri, non qui      |
| Contare a sette per fare le colonne di una heatmap: funziona solo se il periodo comincia di lunedì            | Colonna nuova al lunedì, buchi in testa — e il test parte da un mese che comincia di sabato             |
| `Dimensions.get('window')` per dare una larghezza a un SVG: ignora i padding e il grafico sborda              | Ogni grafico si misura con `onLayout` e non disegna niente finché la larghezza è zero                   |
| Un accumulatore riassegnato dentro una `map` in fase di render                                                | `react-hooks/immutability` lo rifiuta: ciclo che scrive in un elenco locale (gli archi della ciambella) |

## Dove sta ogni schermata (Step 18, 19 e 20)

Quattro tab: **Gruppi** 👥 · **Grafici** 📊 · **Impostazioni** ⚙️ · **Profilo** 🙂. Il primo non è
una schermata ma uno **stack**: elenco dei gruppi → gruppo aperto.

> **Due cose sono cambiate dopo**, e stanno in [Redesign visivo](#redesign-visivo): il passo 4 ha
> portato Impostazioni e Profilo a un solo tab, **Tu** (tre tab, non quattro); il passo 6 ha
> invertito lo stack del primo tab — la radice sono **le spese del gruppo aperto**, e l'elenco dei
> gruppi è un foglio. Tutto il resto di questa sezione è ancora valido, **compresi gli URL**, che
> nessuno dei due passi ha toccato: è la ragione per cui sono descritti con tanta cura.

```
app/(tabs)/(gruppi)/index.tsx                      "/"                     le spese del gruppo aperto
                                                                           (era l'elenco: passo 6)
app/(tabs)/(gruppi)/groups/[vaultId]/_layout.tsx                           guardia di selezione
app/(tabs)/(gruppi)/groups/[vaultId]/index.tsx     "/groups/<id>"          le spese del gruppo dell'URL
                                                                           stesso componente della radice
app/(tabs)/(gruppi)/groups/[vaultId]/manage.tsx    "/groups/<id>/manage"   nome, persone, invito, uscita
                                                                           + le cinque NavCard qui sotto
app/(gruppo)/_layout.tsx                                                   guardia «serve un gruppo»
app/(gruppo)/categories.tsx                        "/categories"
app/(gruppo)/budget.tsx                            "/budget"
app/(gruppo)/settle.tsx                            "/settle"
app/(gruppo)/export.tsx                            "/export"
app/(gruppo)/expense/new.tsx                       "/expense/new"
app/(gruppo)/expense/[id].tsx                      "/expense/<id>"

app/(tabs)/stats.tsx                               "/stats"                Grafici del gruppo aperto
app/(tabs)/tu.tsx                                  "/tu"                   sync, diagnostica, profilo, azzeramento
app/(tabs)/settings.tsx                            "/settings"             redatto: solo un redirect verso "/tu"

app/backup.tsx                                     "/backup"               fuori: serve senza gruppo
app/pair/invite.tsx                                "/pair/invite"          fuori: `GroupRequired` in linea
app/azzera.tsx                                     "/azzera"               fuori: chi azzera resta senza gruppi
```

- **Le parentesi non compaiono nell'URL**, quindi `/groups/<vaultId>` è rimasto quello di prima: è
  l'indirizzo su cui atterra chi entra da un invito, e cambiarlo lo avrebbe rotto in silenzio. Il
  controllo che conta non è il ragionamento ma `.expo/types/router.d.ts` rigenerato da `expo start`,
  seguito da un `tsc` con quei tipi presenti — in CI non esistono e il typecheck passa comunque.
- **Lo stack sta dentro il tab, non sulla radice.** Il gruppo aperto è la schermata principale: da lì
  si va a Grafici e Impostazioni, quindi la tab bar deve restare. Le schermate-foglia (categorie,
  budget, pareggi, form spesa) restano invece sulla radice, dove coprire la tab bar è **giusto**.
- **La guardia che rende corrente il gruppo sta nel layout**, non nelle schermate: gira una volta per
  gruppo, e spese e gestione la ereditano. Sotto di essa il runtime del vault è per costruzione quello
  del `vaultId` nell'URL.
- ~~**Il gruppo non è più una pill da leggere**: è il **titolo** della schermata delle spese.~~
  **Rovesciato dal passo 6 del redesign:** il gruppo è tornato una pill, che però adesso **si tocca**
  e apre il selettore in un foglio; alla gestione porta il bottone con le leve accanto. La pill che
  lo Step 18 aveva tolto era di sola lettura, ed era quello il difetto.
- `unstable_settings = { initialRouteName: 'index' }` in entrambi i layout: senza, chi arriva a
  `/groups/<id>` da un link non ha nulla sotto nello stack, e «indietro» esce dall'app.
- **`app/(gruppo)/` è una guardia, non un tab.** Il suo layout controlla che un gruppo aperto esista
  e altrimenti mostra `GroupRequired`. Dallo **Step 21** quel ramo è vivo — al primo avvio non esiste
  alcun gruppo — ed è il **solo** punto dell'app in cui vive, invece delle condizioni sparse che lo
  Step 12 aveva eliminato apposta. La guardia è stata scritta prima dello stato vuoto che la attiva.
- **Due schermate ne restano fuori di proposito.** `backup.tsx`, perché è l'unica da cui si
  **ripristina** una chiave, cioè ciò che serve a chi un gruppo non ce l'ha; e `pair/invite.tsx`,
  perché `app/(gruppo)/pair/` e `app/pair/` convergerebbero sullo stesso segmento `/pair` — usa
  `GroupRequired` in linea, in un componente sopra quello che lavora, perché gli hook vanno chiamati
  prima di ogni uscita anticipata.
- **Tutto ciò che riguarda un gruppo si apre dal gruppo** (Step 19): categorie, budget, pareggi,
  backup della chiave ed export sono cinque `NavCard` in `manage`. Prima stavano in Impostazioni,
  dove sembravano riguardare l'app: chi apriva «Backup della chiave» non poteva sapere di **quale**
  chiave si trattasse. Dallo **Step 20** non sono più duplicate in Impostazioni.
- **Le tre cose che erano mescolate in Impostazioni sono separate** (Step 20): l'app resta lì (sync,
  diagnostica, versione), il gruppo sta nella sua gestione, e **io** ho un tab mio. Il profilo non è
  una preferenza dell'app: è l'unica cosa che attraversa tutti i gruppi, ed è il `profileId` a
  rendermi la stessa persona in ognuno.
- **Impostazioni legge il motore con `useVaultStatus()`, che non solleva** — non con
  `useVaultRuntime()`, che solleva — e non tocca `useGroups().current`: con zero gruppi (Step 21)
  funziona, e «Sincronizza adesso» è semplicemente disabilitato. È l'unica condizione che quel tab
  avrà mai.
- **`/azzera` è nata allo Step 20 e spiegava soltanto** — che cosa sparisce e che cosa no — perché lo
  Step 22 restasse tutto codice distruttivo e niente impaginazione. Adesso ha anche l'interruttore,
  l'`Alert` e la cancellazione vera: vedi [Azzera questo telefono](#azzera-questo-telefono-step-22).

## Nessun gruppo è uno stato normale (Step 21)

Al primo avvio non esiste alcun gruppo, e uscire dall'ultimo non ne crea più uno vuoto. Lo Step 12
aveva fatto il contrario apposta — per togliere un ramo condizionale da mezza dozzina di schermate —
e il prezzo si è visto provando l'app a mano: ci si trovava dentro un gruppo chiamato «Le mie spese»
mai chiesto, senza capire se fosse quello condiviso.

- **Fase `absent` dentro `VaultProvider`, mai `<VaultProvider>` montato condizionalmente.** Montarlo
  solo quando c'è un gruppo cambierebbe il tipo di un antenato dello `Stack`: React rimonterebbe
  l'**intero navigatore** proprio nell'istante in cui si crea il primo gruppo. Con la fase, l'albero
  dei provider è stabile per tutta la vita del processo e `VaultRuntime.keys` resta non nullable.
- **`absent` è derivato dal gruppo corrente, non uno stato scritto dall'effetto** (lo vieta
  `react-hooks/set-state-in-effect`, a ragione). Nel derivarlo si è chiusa anche una finestra che
  c'era già: un runtime `ready` il cui `vaultId` non è più quello corrente vale `loading`, altrimenti
  fra il cambio di gruppo e il rimontaggio del motore le schermate leggono lo store di prima.
- **`VaultGate` lascia passare `absent`**: non c'è niente da attendere. Le schermate che vogliono il
  vault sono già dietro `app/(gruppo)/` o dentro lo stack `[vaultId]`, irraggiungibile senza gruppi.
- **`useCurrentGroup()` è nullabile e non ha un gemello che solleva**: due hook quasi uguali sarebbero
  il posto in cui qualcuno usa quello sbagliato. Cambiarne la firma è ciò che ha fatto trovare al
  compilatore tutti i chiamanti da sistemare.
- **La logica è in `state/current-group.ts`** (`chooseCurrentGroup`, `nextAfterLeave`), fuori dal
  provider perché è l'unica parte provabile senza React Native. **Si tocca solo il ramo
  `list.length === 0`**: nessuna migrazione, nessun bump di `CURRENT_SCHEMA_VERSION` — alzarlo
  farebbe scattare `ensureSchema`, che è scritto per **cancellare**. Il test che protegge chi ha già
  dei dati è `stored === null` con lista piena → il primo.
- **Tre stati vuoti, e nessun altro**: l'elenco gruppi (crea · invito · ripristina da un backup), i
  Grafici, e `app/(gruppo)/_layout.tsx`.
- **`backup.tsx` senza gruppo mostra solo il ripristino**, e si intitola «Ripristina una chiave». È
  la conferma pratica della scelta dello Step 19 di tenerla fuori da `(gruppo)`.

## Azzera questo telefono (Step 22)

`src/app/azzera.tsx` → `useWipeDevice()` → `wipeDevice()`. Il gesto meno reversibile dell'app, e
l'unico posto del progetto dove si cancella tutto: **l'ordine delle operazioni è il contenuto dello
step**, non un dettaglio di implementazione.

- **`registry.list()` è la primissima operazione, sempre.** Le chiavi stanno in SecureStore sotto
  `groupKeyStorageKey(vaultId)`, ed `expo-secure-store` **non sa elencare i propri slot**: l'unico
  modo di nominarle è leggere i `vaultId` dal registro. Cancellare `groups` prima lascerebbe nel
  Keystore di sistema chiavi innominabili **per sempre**.
- **Il profilo per ultimo.** Così ogni prefisso interrotto della sequenza è «profilo presente, zero
  gruppi» — lo stato vuoto dello Step 21, che l'app sa già disegnare. Nell'ordine inverso ci sarebbe
  una finestra con nessun profilo ma i gruppi ancora in elenco: l'app manderebbe all'onboarding e poi
  farebbe **riapparire i gruppi di prima**.
- **Se un `forget` fallisce ci si ferma prima del profilo**, con l'errore mostrato in schermata: chi
  riprova trova i gruppi rimasti ancora in elenco, quindi le loro chiavi ancora nominabili. È il test
  «un'interruzione a metà lascia uno stato coerente».
- **Il motore va spento prima.** `closeCurrent()` (nuovo su `GroupsProvider`: il gruppo resta in
  elenco, semplicemente non è più corrente) → il cleanup del `VaultProvider` ferma engine e
  persistenza → **si attende `phase === 'absent'`** → solo allora si cancella. Attendere invece di
  sperare è la differenza fra un progetto e un `setTimeout(…, 300)`.
- **La fase di `useWipeDevice` è derivata**, non scritta da un `setState` nell'effetto: «il motore è
  spento» si legge già dallo stato del vault. Stessa regola dello Step 21.
- **Non si tocca il relay.** Azzerare è un gesto locale: le copie sono cifrate, scadono col TTL di
  trenta giorni, e cancellarle riguarda tutti gli altri. Chi le vuole via esce da ogni gruppo con
  l'interruttore _Cancella anche la copia sul relay_ **prima**. C'è un test con la spia sul
  `RelayGateway`: zero `deleteVault`.
- **`SqliteSyncStore.forgetAll`** è l'unico `DELETE` senza `WHERE` ammesso nel progetto, e sta dentro
  la classe che possiede quelle tabelle. Altrove il `WHERE vault_id` è ciò che impedisce a un gruppo
  di svuotare la coda offline di un altro.
- **È anche riparatore:** la spazzata delle `y_updates_*` orfane conclude oggi un tentativo
  interrotto ieri. Solo i nomi nella forma esatta di `updatesTableName` vengono eliminati — quello
  che arriva da `sqlite_master` finisce in un `DROP TABLE`, dove non esistono parametri.
- **`ensureSchema` chiude la sequenza**, perché `DELETE FROM app_meta` porta via anche
  `schema_version` e qui non si riavvia l'app. Trovandosi senza versione, `ensureSchema` prende le
  tabelle di sync per quelle del vecchio schema — hanno gli stessi nomi — e le elimina: va bene, sono
  vuote da un istante prima e `SqliteSyncStore.open` le ricrea.
- **Il ritorno all'onboarding senza riavvio** è `forgetProfile()`: il `ProfileGate` smonta
  `GroupsProvider` e `VaultProvider` con tutto il loro stato in memoria, e registrando un profilo
  nuovo quelli rimontano su tabelle vuote. Prima di smontare si fa `router.replace('/')`: il
  navigatore sparisce per intero, e al ritorno riaprirebbe l'ultima rotta — cioè «Azzera questo
  telefono».

## Come si entra in un gruppo (Step 7 e 13)

Quattro strade, una sola conferma — quella di `useAdoptPairing`:

1. **Link condiviso** — `Share.share` dalla schermata d'invito, aperto dall'altro su `/j` e
   riportato nell'app dalla rotta `/join`
2. **Scanner interno** — Gruppi → «Incolla un invito o scansiona»
3. **Lettore QR di sistema** — apre `jutrack://pair?…`, raccolto dalla rotta `/pair`
4. **Incolla** — link o URI, sempre disponibile, unica via se la fotocamera non c'è

Tutte trasportano **solo la chiave**: `vaultId`, `contentKey` e `authKey` sono derivate. Dallo Step
12 non serve più alcun riavvio, e l'ingresso **aggiunge** un gruppo invece di sostituirlo.

**Il link mette la chiave nel fragment**
(`https://<relay>/j#v=1&k=<base64url>&n=<nome>&e=<scadenza>`): è la parte dell'indirizzo che i
browser non trasmettono, quindi non arriva al Worker, non entra nei log di Cloudflare e non compare
nelle anteprime generate dalle chat. La pagina `/j` è statica, non fa richieste di rete e non
istanzia alcun Durable Object — con i test che lo verificano.

`parseInvite` legge **tre forme**: il link, `jutrack://join#…` e il vecchio `jutrack://pair?…` dei
QR già in circolazione. Una funzione sola, perché chi incolla un codice non sa in quale forma sia, e
tre grammatiche separate divergerebbero.

**Il fragment non passa da expo-router.** Il router instrada sul percorso e trasforma la query in
parametri; ciò che sta dopo il `#` non è né l'uno né l'altra. La rotta `/join` legge il link grezzo
con `Linking.useLinkingURL()`. È il punto in cui questo pezzo poteva fallire in silenzio.

**Chiunque abbia il link o il QR entra nel gruppo.** Rischio accettato, dichiarato
nell'interfaccia **prima** di generare l'invito e ampliato nel threat model: un link inoltrabile è
più esposto di un QR mostrato a schermo per cinque minuti. La scadenza è una cortesia, non una
difesa: sta dentro l'URL, quindi è rimovibile. Il rimedio a un invito finito male è **rigenerare il
gruppo** (Step 14): chiave nuova, storia intatta, chi resta reinvitato. Un protocollo autenticato
(SAS/PAKE) toglierebbe il segreto dal trasporto, ed è fra i miglioramenti futuri.

## Chi sono io (Step 11)

Il **profilo** è uno per persona e vive in `app_meta`, una tabella di SQLite — non in SecureStore,
che resta riservato al materiale crittografico. `{ profileId, name, color, identity? }`.

- **`profileId` è casuale e opaco**, mai derivato dal nome né dalla chiave. È il seam per agganciare
  un giorno un provider d'identità senza cambiare la chiave con cui i membri sono scritti nei vault:
  cambiarla dopo vorrebbe dire riscrivere `paidBy` e le quote di ogni spesa.
- **Il membro nasce dal profilo**: `VaultStore.setMember(id, …)` scrive con un id scelto da chi
  chiama. È idempotente, quindi rieseguirla a ogni avvio non duplica nulla e un cambio di nome
  raggiunge l'altro telefono da solo.
- **`ProfileProvider` sta sopra `VaultProvider`**, non accanto: il profilo deve esistere prima che il
  vault si monti, altrimenti resta una finestra in cui l'app funziona ma «io» non esisto — ed è lì
  che nascevano i duplicati.
- **L'origine del vault (`created` / `joined`) si registra quando si crea o si adotta la chiave**, non
  dopo: guardando un documento pieno di dati sincronizzati i due casi sono indistinguibili. Chi entra
  non semina le categorie, le riceve col primo sync.
- **Le persone non si aggiungono a mano.** Una persona senza telefono dietro non potrebbe registrare
  una spesa né vedere il saldo: l'elenco è in sola lettura, e ognuno si aggiunge collegando il
  proprio telefono.

Il ricollegamento a un membro esistente è arrivato allo **Step 12**, in una forma diversa da quella
prevista qui: la domanda si fa **prima** di scrivere il membro, non dopo. Vedi sotto.

## I gruppi (Step 12)

**Un gruppo = un vault = una `vaultKey` = un `vaultId` = un Durable Object = un documento Yjs.**
«Casa» e «Viaggio in Grecia» convivono sullo stesso telefono e non si mescolano.

- **Registro locale:** una chiave per gruppo in SecureStore (`jutrack.groupKey.<vaultId>`), una riga
  per gruppo nella tabella `groups`, e un `y_updates_<vaultId>` per documento. Il `vaultId` è 32
  caratteri esadecimali **derivati dalla chiave**, quindi è un identificatore SQL valido per
  costruzione: nessun testo scelto dall'utente finisce in un nome di tabella.
- **Il nome autorevole sta dentro il vault** (`Y.Map` `meta`), così rinominare raggiunge l'altro
  telefono da solo. Il registro ne tiene una copia per disegnare la lista senza aprire ogni
  documento; quando divergono, è la copia ad aggiornarsi.
- **Il `WHERE vault_id` di `setPending` è il punto pericoloso di tutto il piano.** Senza, una
  scrittura in un gruppo cancellerebbe la coda offline dell'altro: spese registrate in aereo perse
  in silenzio. Il test gira su **SQLite vero**, perché un finto motore che ignori il `WHERE` farebbe
  passare esattamente quel bug.
- **C'è sempre almeno un gruppo.** Al primo avvio ne nasce uno («Le mie spese»): costa 32 byte
  casuali e nessuna richiesta di rete. Sparisce così lo stato «nessun vault», che era un ramo
  condizionale in mezza dozzina di schermate.
- **Il runtime è rimontabile:** l'effetto dipende da `vaultId`, non da `[]`. Cambiare gruppo smonta
  engine e persistenza e ne monta altri — ed è questo che fa sparire il «riavvia l'app» dopo il
  pairing. Un solo motore attivo per volta, sul gruppo aperto.
- **Gli hook di `state/hooks.ts` non hanno cambiato firma**, quindi le undici schermate che consumano
  dati non sono state toccate. È la ragione per cui lo step era fattibile senza riscrivere l'app.

**«Chi sei in questo gruppo?»** Chi **entra** in un gruppo altrui risponde a una domanda prima che
gli venga scritto un membro: è nuovo, oppure è già dentro con un altro telefono e ha appena
ripristinato la chiave. La domanda si fa **prima**, non dopo, perché i membri non hanno tombstone e
quello creato per sbaglio resterebbe lì per sempre. Chi **crea** un gruppo non vede nulla.

**Ripartenza pulita, non migrazione.** `schema_version` in `app_meta`: trovando lo schema a vault
unico si eliminano quelle tabelle, la vecchia chiave e le chiavi di `app_meta` che la riferivano. Il
profilo sopravvive. Il vault vecchio sul relay resta e scade col TTL di 30 giorni — cancellarlo
richiederebbe la chiave che si sta eliminando, e una richiesta di rete durante l'avvio.

## Uscire da un gruppo, e rigenerarlo (Step 14)

Sono due gesti diversi, e la differenza è l'unica cosa che conta capire.

| Gesto                  | Cosa fa                                                      | Chi resta fuori                          |
| ---------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **Esci dal gruppo**    | Cancella da **questo telefono** chiave, spese e coda di sync | Nessuno: solo tu esci                    |
| + cancella dal relay   | Svuota anche la copia sul server                             | Nessuno, ma si fermano gli aggiornamenti |
| **Rigenera il gruppo** | Chiave nuova, `vaultId` nuovo, tutta la storia dentro        | Chiunque non venga reinvitato            |

- **Cancellare dal relay non è revocare.** Non toglie a nessuno ciò che ha già scaricato, e poiché
  la cancellazione azzera anche il token registrato al primo accesso, il `vaultId` torna libero: chi
  conserva la chiave può ricominciare a scriverci, in un vault che però nessun altro legge. Il relay
  finto dei test replica anche questo, così nessun test può concludere che cancellare escluda
  qualcuno.
- **L'interruttore «cancella anche dal relay» è spento di default**, e vale per entrambi i gesti:
  è irreversibile e vale per tutti, non solo per chi lo tocca.
- **Prima il relay, poi il locale.** La cancellazione remota si autentica con il token derivato
  dalla chiave, che sta per essere eliminata da questo telefono. Se la rete non risponde non si
  tocca nulla: meglio un gruppo ancora in elenco, da cui riprovare, che un vault orfano sul relay
  che nessuno può più cancellare.
- **La rigenerazione tiene tutti i membri, escluso compreso.** Le spese li riferiscono con `paidBy`
  e con le quote: toglierne uno cambierebbe i saldi già calcolati. Chi è escluso resta nella storia,
  e smette solo di ricevere aggiornamenti.
- **Il gruppo vecchio non viene toccato dalla rigenerazione**: uscirne è una chiamata separata, così
  un'interruzione a metà lascia due gruppi leggibili invece di nessuno. Al termine si arriva alla
  schermata d'invito, perché un gruppo rigenerato e non reinviato a nessuno è un gruppo da soli.

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

## Se un giorno si vuole pubblicare

Non è stato fatto, per scelta: si sta ancora provando la development build.

```bash
cd apps/mobile && npx eas-cli build -p android --profile preview      # APK autonomo, senza Metro
cd apps/mobile && npx eas-cli build -p android --profile production   # app bundle per il Play Store
```

- Piano EAS Free: **15 build Android al mese**, concorrenza 1, timeout 45 minuti. Al 2026-08-01 ne è
  stata consumata **una** (la development build, 19 minuti).
- Il keystore è custodito da EAS ed è quello che lega gli aggiornamenti all'app già installata:
  perderlo significa non poter più aggiornare quell'installazione.
- Il profilo `preview` è quello che serve per far provare l'app a qualcun altro: gira senza Metro,
  quindi senza il computer acceso.
