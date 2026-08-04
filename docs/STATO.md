# Stato del progetto — punto di partenza

Aggiornato: 2026-08-04 — **i tre piani funzionali e il redesign visivo sono finiti nel codice.**
Tutti e sette i passi del redesign sono chiusi ([visualdesign.md](visualdesign.md)). **Quello che
resta, per tutto quanto, è la prova su due telefoni veri**: non c'è più codice previsto in attesa.

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

**641 test verdi** (387 core + 211 app + 43 relay), typecheck, lint e `format:check` puliti.

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
[visualdesign.md](visualdesign.md) e la sezione [Redesign visivo](#redesign-visivo) qui sotto. **Non
c'è un quarto piano, e non è il momento di scriverne uno:** il seguito è
[la prova sui due telefoni](piano-v3-tab-gruppi-azzeramento-sync.md#criterio-di-fatto-end-to-end),
che manca a tutti e tre i piani e ora anche al redesign. Le WebSocket sul Durable Object restano una
possibilità dichiarata fuori perimetro, **da valutare solo dopo** aver provato sul campo la taratura
degli Step 16 e 17.

> **Non resta codice da scrivere: resta la prova sul campo.** Vale per i tre piani e ora anche per il
> redesign. Dallo Step 10 in poi nulla è mai stato visto funzionare su un telefono: quello che manca è
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

Development build EAS installata su Android. **Diagnostica: 14 passaggi su 14, «TUTTO OK»** — Yjs,
`Y.Doc` con lo shim lib0/webcrypto, crypto su Hermes vero, XChaCha20-Poly1305, SQLite, SecureStore,
relay in produzione, invito di pairing, QR, fotocamera.

- Progetto EAS: `@frfal/jutrack`, build con `npx eas-cli build -p android --profile development`
- Il keystore Android è custodito da EAS: serve per ogni aggiornamento futuro dell'app installata

## Cosa non è ancora stato verificato su hardware reale

Va detto con precisione, perché è la differenza fra «testato» e «funzionante». Dopo la diagnostica
la lista si è accorciata parecchio, ma non è vuota — e con il redesign chiuso è tornata a essere
**la sola cosa che resta da fare su questo progetto**.

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
- **Tutto lo Step 14**: che la cancellazione dal relay risponda davvero — è la prima richiesta di
  rete che parte da un gesto dell'utente e non dal motore di sync — e che dopo una rigenerazione
  l'altro telefono entri nel gruppo nuovo col link e ci ritrovi le spese di prima

> **La development build installata sul telefono non contiene i due moduli nuovi.** È stata
> compilata prima che venissero aggiunti. L'app si apre lo stesso — sono caricati con `require` in
> `try/catch` proprio per questo — e l'export ripiega sugli appunti, dichiarandolo nell'interfaccia.
> Il foglio di condivisione comparirà solo dopo una build aggiornata.

Tutto il resto è verificato: 577 test, convergenza CRDT, relay reale in produzione, e l'esecuzione
su un dispositivo Android reale.

## Trappole già risolte — da non riscoprire

| Trappola                                                                                                      | Soluzione adottata                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `TextEncoder` non esiste su Hermes                                                                            | UTF-8 scritta in `crypto/encoding.ts`; vietato l'import da noble                                      |
| Yjs non fa il bundle su RN (`lib0` → `isomorphic-webcrypto`, fermo al 2022)                                   | Alias in `metro.config.js` verso uno shim su `expo-crypto`                                            |
| `storage.deleteAll()` su Durable Object SQLite cancella anche le tabelle                                      | `ensureSchema()` subito dopo, con test di regressione                                                 |
| Un blob corrotto blocca **tutti** gli update successivi di quel device                                        | Ripubblicazione dello stato completo al rilevamento                                                   |
| TypeScript bloccato a 6.x                                                                                     | `typescript-eslint` dichiara peer `typescript <6.1.0`                                                 |
| Nella flat config ESLint vince l'ultima regola                                                                | Gli override vanno **dopo** il blocco generale                                                        |
| Metro annunciava `127.0.0.1` come host del bundle                                                             | `REACT_NATIVE_PACKAGER_HOSTNAME=<ip-lan>`                                                             |
| expo-router importa **tutte** le route al boot: un modulo nativo rotto uccide l'app intera                    | `expo-camera`, `expo-file-system`, `expo-sharing` con `require` in `try/catch`                        |
| **`expo start` dalla root del monorepo**: 404 su ogni bundle, app muta                                        | Avviarlo **sempre** da `apps/mobile`; è costato giorni                                                |
| Due copie di React (`expo-*` dichiara `"react": "*"`)                                                         | `overrides` nella root + lock rigenerato; `expo-doctor` lo vede                                       |
| `DELETE FROM sync_pending` senza `WHERE`: con due gruppi cancella la coda offline dell'altro                  | Colonna `vault_id` ovunque, e un test su SQLite vero — con un finto motore passerebbe comunque        |
| I tipi delle rotte expo-router non li rigenera `expo export`, ma `expo start`                                 | Sono in `.expo/types/`, gitignorato: in CI non esistono e il typecheck passa lo stesso                |
| **expo-router non espone il fragment**: `useLocalSearchParams` vede il percorso e la query                    | La rotta `/join` legge il link grezzo con `Linking.useLinkingURL()`                                   |
| Uscire da un gruppo **mai sincronizzato**: `no such table: sync_state`                                        | `SqliteSyncStore.forget` passa dallo stesso `ensureSchema` di `open`                                  |
| La schermata del gruppo riselezionava il gruppo **appena abbandonato**: app ferma sul caricamento             | Guardia nella schermata **e** in `select`, che rifiuta un `vaultId` non nel registro                  |
| Spostare rotte con `.expo/types/` gitignorato: gli href obsoleti passano typecheck **e** lint                 | Grep sugli href, poi `expo start` per rigenerare i tipi e `tsc` **con quei tipi presenti**            |
| **SecureStore non sa elencare i propri slot**: cancellare `groups` per primo orfanerebbe le chiavi            | `wipeDevice` legge `registry.list()` come primissima operazione, prima di qualunque DELETE            |
| Dopo `DELETE FROM app_meta`, `ensureSchema` scambia le tabelle di sync per quelle del vecchio schema          | Innocuo di proposito: a quel punto sono vuote e `SqliteSyncStore.open` le ricrea — scritto nel codice |
| **Un `<Redirect>` in una schermata di stack scatta anche quando non è a fuoco**: quelle sotto restano montate | Componente condiviso fra le due rotte, che non naviga — vedi `GroupHome` (passo 6)                    |
| Cambiare gruppo mentre si è su `/groups/<id>`: la guardia del layout lo riporta indietro subito               | `dismissTo('/')` **prima** di `select()`, così la guardia è già smontata                              |
| Un token di stile con `as const` non è assegnabile a `TextStyle` (`fontVariant` diventa `readonly`)           | Tipizzarlo `Pick<TextStyle, …>`; e un token che nessuno usa non compila senza che nessuno lo sappia   |
| `-shares[me]` con quota zero dà `-0`, che non è `0` e a valle si legge come debito                            | `net === 0 ? 0 : net` in `yourShareCents`, con il test che lo fissa                                   |

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
