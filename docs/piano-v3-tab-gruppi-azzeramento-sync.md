# JuTrack — Piano v3: quattro tab, il gruppo come luogo, azzeramento, sync tarato

> **Avanzamento al 2026-08-02.**
> Completati: **Step 0–9** (piano originale), **Step 10–14** ([piano v2](piano-v2-profili-gruppi-sync.md)),
> lo **Step 15** — questo documento — e gli **Step 16 e 17**. Da fare: **Step 18–22**, uno per
> sessione.
>
> Nasce dalla prova a mano delle funzionalità già scritte: la gestione dei gruppi non è intuitiva, il
> gruppo di default al primo avvio genera duplicati e confusione, e il relay sembra interrogato in
> continuazione.
>
> Punto d'ingresso del progetto: [STATO.md](STATO.md). Piano approvato:
> `~/.claude/plans/ho-provato-diverse-funzionalit-kind-snowflake.md`.

## Contesto

I due piani precedenti hanno risolto **come funziona** l'app. Questo risolve **dov'è ogni cosa**, più
tre difetti del motore che si vedono solo misurando.

### I tre problemi di prodotto

**1. Il gruppo non è un luogo, è un parametro implicito.**

Oggi i gruppi vivono in una schermata modale (`app/groups/index.tsx`) raggiunta da una pill in cima
alla lista spese o da un bottone in Impostazioni. Tutto ciò che riguarda un gruppo è invece sparso
altrove: `Categorie`, `Backup della chiave` ed `Esporta i dati` stanno in **Impostazioni**, dove
sembrano riguardare l'app mentre riguardano **un** gruppo solo. Chi apre «Backup della chiave» non ha
modo di sapere di quale chiave si stia parlando.

**2. Il gruppo di default al primo avvio.**

`GroupsProvider.tsx:84-92` crea «Le mie spese» quando l'elenco è vuoto. Era una scelta deliberata
dello Step 12 — eliminava lo stato «nessun vault», che era un ramo condizionale in mezza dozzina di
schermate — ma alla prova produce l'effetto opposto a quello voluto: **due telefoni, due gruppi
diversi, nessuno dei due condiviso**, e l'utente che deve capire da solo che quello che ha davanti non
è il gruppo dell'altro. Chi installa l'app deve creare un gruppo e invitare, oppure entrare con un
invito ricevuto. Non ritrovarsene uno già lì.

**3. Il relay sembra interrogato in continuazione.**

È il sospetto che ha aperto questa revisione, e il numero misurato prima di decidere è questo:

| Situazione                         | Frequenza    | Richieste                                     |
| ---------------------------------- | ------------ | --------------------------------------------- |
| Primi 120 s dopo l'ultima attività | 1 GET / 3 s  | 40 in due minuti                              |
| Oltre i 120 s, app in primo piano  | 1 GET / 30 s | 120 all'ora                                   |
| App in background                  | —            | **zero** (`AppState` mette in pausa il ciclo) |

Un ciclo a vuoto è **una sola GET**, nessuna POST. Con due telefoni e qualche ora d'uso al giorno sono
circa **1.500 richieste al giorno contro il limite free di 100.000**: non è un problema di quota — è
batteria e traffico dati. Vale comunque la pena intervenire, ma sapendo cosa si sta ottimizzando.

### E la coda offline?

**Esiste già ed è durevole**, contrariamente al dubbio che ha originato la domanda. Ogni update locale
finisce in `sync_pending` (una riga per blob, colonna `vault_id`), scritto **subito** e **in
transazione**; si rimuovono solo i blob che il relay ha accettato; e `pushedStateVector` non avanza
finché la coda non è vuota, così un riavvio a coda piena non perde nulla. Questo piano la tocca in un
punto solo, per un difetto di concorrenza descritto allo Step 17.3.

### Esito voluto

Quattro tab — **Gruppi, Grafici, Impostazioni, Profilo** — con il gruppo che diventa il contenitore di
tutto ciò che lo riguarda; nessun gruppo al primo avvio; un azzeramento totale del telefono; e un poll
che scende da ~1.500 a ~400 richieste al giorno senza perdere reattività.

---

## Decisioni prese

| Ambito               | Scelta                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| Tab                  | **Quattro**: Gruppi (stack elenco → gruppo), Grafici, Impostazioni, Profilo   |
| Grafici              | **Del gruppo aperto.** Resta il concetto di «gruppo corrente»                 |
| Schermate di gruppo  | **Tutte dentro il gruppo**: categorie, budget, pareggi, backup, export        |
| Primo avvio          | **Nessun gruppo.** L'utente ne crea uno o entra con un invito                 |
| «Logout»             | **Non esiste un account.** Al suo posto: «Azzera questo telefono»             |
| Cancellazione remota | L'azzeramento **non** tocca il relay: quello è `wipeRelay`, un gesto diverso  |
| Sync                 | **Solo taratura lato client.** Il relay non si tocca                          |
| WebSocket            | **Rinviati al piano v4**, dopo la prova sul campo di questo                   |
| Connettività         | **Nessun listener** (sarebbe un modulo nativo): al suo posto `offlineRetryMs` |
| Build                | **Nessuna nuova build EAS**: nessun modulo nativo aggiunto                    |
| Icone dei tab        | **Emoji in un `<Text>`**, come oggi. Nessuna libreria di icone                |

### Perché il tab Grafici resta sul gruppo aperto

L'alternativa — un tab Grafici che aggreghi **tutti** i gruppi — è più coerente col principio «tutto
ciò che è di gruppo sta nel gruppo», ma richiederebbe di montare più `Y.Doc` contemporaneamente per
leggerli. Oggi l'intera architettura poggia su **un solo runtime attivo per volta**
(`docs/architecture.md`, «Un gruppo, un vault»), ed è quella scelta che tiene il consumo di rete e di
memoria proporzionale a ciò che si sta guardando. Aggregare è un piano a sé, non una riga di questo.

### Perché si torna a «nessun gruppo», che lo Step 12 aveva eliminato

Lo Step 12 aveva ragione sul costo: quello stato era un ramo condizionale sparso ovunque. Ma la
soluzione di allora — crearne sempre uno — sposta il costo sull'utente, che si ritrova un gruppo che
non ha chiesto e che non è quello dell'altra persona.

La differenza rispetto ad allora è **strutturale, non di opinione**: con i tab di questo piano, tutte
le schermate che leggono il vault stanno o dentro lo stack del gruppo (irraggiungibile senza gruppi) o
dietro l'unica guardia `(gruppo)/_layout.tsx`. Il ramo condizionale esiste in **tre punti dichiarati**
invece che in mezza dozzina sparsi, ed è per questo che lo Step 19 (la guardia) viene **prima** dello
Step 21 (lo stato vuoto): quando arriva il ramo, il posto dove metterlo esiste già.

### Perché «Azzera questo telefono» e non «logout»

Non c'è un account da cui uscire: l'identità è un `profileId` casuale in `app_meta`, e la sicurezza è
la `vaultKey` in SecureStore. L'unica azione con un significato reale è cancellare tutto e tornare
all'onboarding, e va chiamata con il suo nome. La schermata deve dire due cose che nessun'altra app
deve dire:

- **le copie sul relay restano** e scadono da sole col TTL di 30 giorni — cancellarle è un altro
  gesto (`wipeRelay`, un gruppo per volta), e non è comunque una revoca;
- **senza un backup della chiave i dati non tornano**: non esiste un reset lato server, per
  costruzione.

### Perché nessun listener di connettività

Sarebbe la cosa giusta: `@react-native-community/netinfo` o `expo-network` notificano il ritorno della
rete e il motore riparte all'istante. Sono entrambi **moduli nativi**, quindi una nuova build EAS —
che è esattamente ciò che questo piano si vieta, per poter essere provato sulla development build già
installata.

Il sostituto è `offlineRetryMs` (Step 17.1): quando la rete manca, la richiesta fallisce **localmente**
senza toccare il relay, quindi ritentare presto non costa nulla a nessuno. È un listener di
connettività fatto col polling, e in questo caso specifico è quasi altrettanto buono.

---

## Step di implementazione

Ogni step termina con: **test verdi → `expo export` → documentazione aggiornata → commit e push**.
Nessuno step lascia il repo in stato non compilante.

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
cd apps/mobile && npx expo export --platform android
```

> **Gli Step 16 e 17 sono indipendenti da tutti gli altri.** Stanno in `packages/core/src/sync/` e non
> toccano una sola schermata. Se una sessione ha tempo per una cosa sola, sono quelle: rischio nullo
> sull'app e guadagno immediato su batteria e traffico. **Fatti entrambi.**

> **Gli Step 18 e 19 sono spostamenti di file, e sono i due più delicati del piano** — non per la
> logica, che non cambia, ma perché rompono rotte in silenzio. Vanno fatti uno per commit, con
> `expo export` come giudice.

### Step 15 — Questo documento ✅

Il piano nel repo, e la tabella di avanzamento di [STATO.md](STATO.md) estesa alle righe 15–22. Ha lo
stesso ruolo che `piano-v2` ha avuto per gli Step 10–14: è il documento da cui riprende ogni sessione
successiva. Senza, «uno step per sessione» non funziona.

### Step 16 — Il poll diventa una scala, e l'app dichiara quando qualcuno guarda ✅

> **Fatto il 2026-08-02**, come descritto qui salvo un dettaglio: `useEngineActivity()` legge
> `useVaultStatus()` invece di `useVaultRuntime()`, che solleva se il gruppo non è pronto — una
> schermata a fuoco mentre il vault si monta è normale. `pollIntervalFor` e il tipo `PollStep` sono
> esportati dal barrel di `@jutrack/core`. Il test `rallenta il poll fuori dalla finestra attiva` è
> verde senza essere stato toccato.

Sostituire il gradino binario 3 s/30 s con una scala progressiva, e dare al motore un modo esplicito
di sapere che una schermata di dati condivisi è a fuoco.

**File:** `packages/core/src/sync/types.ts`, `packages/core/src/sync/engine.ts`,
`packages/core/src/sync/engine.test.ts`, `apps/mobile/src/features/sync/useEngineActivity.ts` (nuovo),
`apps/mobile/src/app/(tabs)/index.tsx` e `(tabs)/stats.tsx`.

**La scala.** Nuova opzione in `SyncEngineOptions`:

```ts
/** Da `afterMs` di inattività in poi, si interroga il relay ogni `pollMs`. */
export interface PollStep {
  afterMs: number;
  pollMs: number;
}
pollSchedule?: readonly PollStep[];
```

Default: `[{ 0, 2_000 }, { 15_000, 5_000 }, { 60_000, 15_000 }, { 300_000, 60_000 }]`.

- **Una tabella, non una formula esponenziale.** Si vuole poter dire «dopo un minuto sono quindici
  secondi» leggendo quattro righe. E una tabella si prova con `it.each`.
- **`activePollMs` / `idlePollMs` / `activeWindowMs` restano, e vincono se passate.** Se ne arriva
  anche una sola, si costruisce la scala a due gradini `[{ 0, active }, { activeWindow + 1, idle }]`.
  Serve perché il test esistente `rallenta il poll fuori dalla finestra attiva`
  (`engine.test.ts:605`) resti **identico parola per parola**: riscrivere un test insieme al
  comportamento che verifica è il modo classico di perdere copertura senza accorgersene.
- **Validazione nel costruttore**, non al primo uso: scala vuota, primo `afterMs ≠ 0`, soglie non
  crescenti, `pollMs <= 0` → `throw`. Una scala malformata scoperta dentro `pollIntervalMs`
  diventerebbe un `undefined` passato a `sleep`, cioè un ciclo che gira a piena velocità.
- **Funzione pura esportata** `pollIntervalFor(schedule, idleForMs): number` — l'ultima soglia
  superata. `pollIntervalMs()` diventa una riga, e la logica si prova senza costruire un motore.
- Nel ramo `paused` di `runForever` si dorme l'**ultimo** `pollMs` della scala invece di
  `idlePollMs`: è un sonno senza rete, tanto vale il più lungo.

**`markActive()`.** Cinque righe in `engine.ts`: `this.lastActivityAt = this.now(); this.wake();`.
Nell'app, un hook `useEngineActivity()` che lo chiama in `useFocusEffect`, **solo** nelle schermate
che mostrano dati condivisi: la lista spese del gruppo e i Grafici.

> **Perché non l'opposto — sospendere il poll quando nessuna schermata di dati è a fuoco.** `pause()`
> non sospende solo il pull: mette in sonno tutto il ciclo, quindi anche il **push**. Una pausa
> rimasta appesa — un `useFocusEffect` che non si ripulisce, un ordine di smontaggio inatteso, la tab
> Profilo lasciata aperta — sarebbe una spesa scritta che non parte, in silenzio. È la classe di
> guasto che questo progetto ha già pagato due volte. Con `markActive` il rischio è **invertito**:
> dimenticarlo da qualche parte produce un poll più lento, mai un sync fermo. E il caso grosso — app
> in background — lo copre già `AppState`.

_Verifica:_ `pollIntervalFor` a tabella (0 → 2000, 14 999 → 2000, 15 000 → 5000, 300 000 → 60 000);
`la scala allunga il poll man mano che l'attività si allontana`, con `now`/`sleep` iniettati e
`waited === [2000, 5000, 15000, 60000]`; `una scala malformata viene rifiutata alla costruzione`;
`markActive riporta il poll al gradino più stretto`; `markActive sveglia un'attesa in corso`. Il test
605 resta verde senza essere toccato.

### Step 17 — Offline non è un errore del relay ✅

> **Fatto il 2026-08-02**, con una deviazione deliberata sul 17.3: **la catena di promesse è per
> connessione e non per istanza** (`WeakMap<SqliteDatabase, Promise<void>>` statica, non `private
tail`). La transazione appartiene alla connessione, che i due store dei due gruppi condividono:
> cambiando gruppo, la `setPending` in volo del gruppo che si chiude e la prima del gruppo che si
> apre sono esattamente il caso da escludere, e `VaultProvider` non attende la prima. C'è un secondo
> test (`nemmeno se arrivano da due gruppi diversi`) che con `tail` per istanza fallirebbe.
>
> Riordinato anche il `catch` di `runCycle`: il ramo «non è un `RelayError`» esce **prima** di
> toccare il backoff, invece di modificarlo e poi uscire — il vecchio ordine era la ragione per cui
> il difetto esisteva. Entrambi i test di `sync-store` sono stati **visti fallire** senza la
> correzione.

Tre sprechi distinti, tutti dentro il motore.

**File:** `packages/core/src/sync/{types,engine}.ts`, `apps/mobile/src/platform/sync-store.ts`, e i
rispettivi test.

**17.1 — `offlineRetryMs` (default 15 s).**

Oggi il ramo `!(error instanceof RelayError)` di `runCycle` (`engine.ts:255`) raddoppia `backoffMs`
fino a cinque minuti prima di emettere `offline`. Ma una `fetch` che fallisce perché non c'è rete
**non tocca il relay**: non c'è niente da proteggere, e cinque minuti sono cinque minuti in cui il
ritorno della connettività non produce nulla. Non potendo avere un listener di connettività, **è
questo il modo in cui ci accorgiamo che la rete è tornata**.

- Nuovo campo `retryDelayMs`, distinto da `backoffMs`. `runForever` dorme
  `outcome === null ? this.retryDelayMs : this.pollIntervalMs()`.
- Errore **non**-`RelayError` → **`backoffMs` non si tocca**, e
  `retryDelayMs = Math.max(offlineRetryMs, pollIntervalMs())`.
  - Non toccare `backoffMs` è la parte che conta: se il relay stava rispondendo 500 e poi cade la
    rete, tornando su non si deve ricominciare da 2 s a martellare un relay ancora in difficoltà.
  - Il `Math.max` evita l'assurdo di ritentare ogni 15 s mentre a riposo il poll normale sarebbe di 60. Quando nessuno guarda, la rete che torna viene comunque intercettata entro un minuto, e
    `AppState → active` fa `resume()` con giro immediato appena si riapre l'app.
- `RelayError` → come oggi. `resume()` azzera entrambi.

**17.2 — Lo state vector si riscrive solo se è cambiato.**

`engine.ts:336-338` chiama `setPushedStateVector` a **ogni** ciclo, anche a vault fermo: un `fsync`
inutile ogni tre secondi, per ore. Campo `lastPushedStateVector`, valorizzato in `start()` con la
lettura che **già avviene lì** (nessuna lettura in più), e confronto byte a byte prima di scrivere.

> **Trappola.** La cache in memoria va aggiornata **dopo** che la scrittura è riuscita, mai prima. Se
> `setPushedStateVector` fallisce e la cache è già avanzata, il giro dopo crede di aver pubblicato ciò
> che non ha pubblicato, e al riavvio il catch-up di `start()` salta quel delta. È il tipo di errore
> che fa sparire spese in silenzio, e c'è un test apposta.

**17.3 — Le scritture della coda non si accavallano.**

`onLocalUpdate` (`engine.ts:94`) fa `void this.store.setPending(this.pending)` **senza `await`**, e
`SqliteSyncStore.setPending` (`sync-store.ts:121-136`) apre una transazione `BEGIN … COMMIT`. Due
update ravvicinati — due `store.addExpense` non racchiusi in una `transact` — intrecciano due `BEGIN`
sulla stessa connessione: il secondo fallisce con `cannot start a transaction within a transaction`, e
il suo `catch` esegue un `ROLLBACK` che annulla la transazione **del primo**.

Conseguenza reale: una promessa rigettata senza gestore, e una coda su disco temporaneamente
sbagliata. Non è perdita di dati certa — il catch-up dello state vector la recupera, perché
`setPushedStateVector` non avanza a coda non vuota — ma quella è l'**ultima** rete di sicurezza, e non
va sprecata su un guasto evitabile.

Rimedio: catena di promesse dentro `SqliteSyncStore` (`private tail: Promise<void> = Promise.resolve()`,
ogni `setPending` si accoda). Sta nella classe che possiede quelle tabelle, accanto al commento sul
`WHERE vault_id`, e non richiede di cambiare il motore.

_Verifica:_ `senza rete si riprova presto invece di salire a cinque minuti`
(`waited === [15000, 15000, 15000]`); `un guasto di rete non gonfia il backoff degli errori del relay`
(500, 500 → backoff a 8 s; due giri senza rete; poi 500 → riprende da 16 s, non da 4 s); `lo state
vector non viene riscritto se il documento non è cambiato` (tre giri a vuoto →
`pushedStateVectorWrites === 1`); `una scrittura fallita non fa credere di aver pubblicato`; e in
`sync-store.test.ts`, su SQLite vero, `due scritture della coda avviate insieme non si accavallano`. Il
test esistente `il ritorno in primo piano azzera il backoff` (scala `[4000, 8000, 16000]`) resta
identico.

### Step 18 — Il tab Gruppi: elenco → gruppo, con le spese dentro

Il primo tab diventa uno stack «elenco dei gruppi → gruppo aperto», **senza cambiare gli URL già in
uso**.

```
app/_layout.tsx                                        Stack radice (invariato)
app/(tabs)/_layout.tsx                                 Tabs
app/(tabs)/(gruppi)/_layout.tsx            [nuovo]     Stack del tab 1
app/(tabs)/(gruppi)/index.tsx              [git mv da app/groups/index.tsx]            URL "/"
app/(tabs)/(gruppi)/groups/[vaultId]/_layout.tsx [nuovo]  guardia di selezione + Stack
app/(tabs)/(gruppi)/groups/[vaultId]/index.tsx   [git mv da app/(tabs)/index.tsx]      URL "/groups/<id>"
app/(tabs)/(gruppi)/groups/[vaultId]/manage.tsx  [git mv da app/groups/[vaultId].tsx]  URL "/groups/<id>/manage"
```

**Le parentesi non compaiono nell'URL** — è la stessa proprietà per cui oggi `(tabs)/index.tsx`
risponde a `/`. Mettendo il dettaglio sotto `(gruppi)/groups/[vaultId]/`, l'URL resta **esattamente**
`/groups/<vaultId>`: `useAdoptPairing`, `backup.tsx` e la lista continuano a funzionare **senza essere
toccati**. Non è un dettaglio estetico — sono i percorsi con cui si entra in un gruppo dopo un invito,
e sono difficili da riprovare.

**Perché uno stack dentro il tab e non sullo stack radice.** Il dettaglio del gruppo è la schermata
principale: da lì si va ai Grafici, alle Impostazioni, al Profilo. Se fosse una `push` sulla radice
coprirebbe la tab bar, e per cambiare tab bisognerebbe prima chiudere il gruppo. Le schermate-foglia
(categorie, budget, pareggi, export, form spesa) restano invece sulla radice, dove coprire la tab bar
è **giusto**: sono compiti che si aprono e si chiudono, ed è per loro che esiste `ModalScreen` con
«Chiudi».

**Perché l'elenco sta a `/`.** Qualcosa deve rispondere a `/`, che è l'URL iniziale su nativo: senza,
il primo avvio finisce su `+not-found`. Si perde `/groups` come elenco, quindi i tre
`router.push('/groups')` (pill delle spese, Impostazioni, `join.tsx:78`) diventano `router.push('/')`,
e il `router.replace('/(tabs)')` di `[vaultId].tsx:121` diventa `router.replace('/')`.

Altre decisioni:

- **`unstable_settings = { initialRouteName: 'index' }`** in entrambi i layout nuovi. Senza, chi
  arriva a `/groups/<id>` da un link non ha nulla sotto nello stack, e il gesto «indietro» esce
  dall'app invece di tornare all'elenco.
- **La guardia di selezione sale nel layout.** Tutto il blocco di `groups/[vaultId].tsx:37-58`
  (l'effetto che chiama `select`, il controllo `stillExists`, lo spinner `Switching`) va in
  `[vaultId]/_layout.tsx`: gira una volta per gruppo invece che una per schermata, e `index` e
  `manage` la ereditano. Aprire il gruppo continua a renderlo corrente.
- **La pill «gruppo corrente» sparisce** dalla lista spese: adesso il titolo della schermata **è** il
  nome del gruppo.
- `ModalScreen` guadagna una prop opzionale `closeLabel` (default `'Chiudi'`), per usare
  `'‹ Indietro'` su `manage.tsx`, che è spinta dentro lo stack del tab e quindi mantiene la tab bar.
- In `(tabs)/_layout.tsx`, `(gruppi)` va dichiarato **per primo**: l'ordine dei tab è l'ordine di
  dichiarazione.

**Trappole:**

1. **Rotte duplicate.** Nell'istante in cui esistono sia `app/groups/index.tsx` sia
   `(tabs)/(gruppi)/index.tsx`, expo-router protesta. Lo spostamento dev'essere completo in **un solo
   commit**, e `npx expo export --platform android` è l'unica cosa in CI che se ne accorge.
2. **`typedRoutes` non protegge in CI.** `.expo/types/router.d.ts` è gitignorato e lo rigenera solo
   `expo start`: un `router.push('/groups')` rimasto lì passa typecheck **e** lint. Passaggio
   obbligatorio dello step: `grep -rn "'/groups'\|\"/groups\"\|'/(tabs)'" apps/mobile/src` deve dare
   zero risultati. Poi `expo start` da `apps/mobile` per una decina di secondi, per rigenerare i tipi.
3. **Deep link.** `/join`, `/pair`, `/pair/scan`, `/pair/invite` non si spostano. `jutrack://join#…`
   continua a passare da `join.tsx` con `Linking.useLinkingURL()`.

_Verifica:_ nessuna logica pura nuova obbligatoria. Consigliato estrarre in
`apps/mobile/src/features/groups/list.ts` l'etichettatura dell'elenco («Aperto adesso» contro
`vault xxxxxxxx…`): è piccola, pura, e tre test la coprono.

### Step 19 — Dentro il gruppo c'è tutto il gruppo

Portare categorie, budget, pareggi ed export dentro il gruppo, e mettere le rotte che richiedono un
vault dietro **un'unica** guardia.

Il gruppo, dopo questo step:

- **`/groups/<id>`** — spese: totale, elenco per giorno, FAB `+`, e in testa il nome del gruppo che
  porta a…
- **`/groups/<id>/manage`** — nome, chi ne fa parte, «Invita qualcuno», poi le `NavCard` **Categorie**,
  **Budget**, **Pareggi**, **Backup della chiave**, **Esporta i dati**; e in fondo, come oggi,
  «Rigenera con una chiave nuova» ed «Esci dal gruppo» con l'interruttore `wipeRelay` spento di
  default.
- `stats.tsx` **mantiene** le scorciatoie verso `/settle` e `/budget`: sono statistiche del gruppo
  corrente, e da lì quei due gesti sono naturali. Sono scorciatoie verso le stesse rotte, non una
  seconda casa.

**La guardia, in un file solo.** Una cartella-gruppo `app/(gruppo)/` che contiene `categories.tsx`,
`budget.tsx`, `settle.tsx`, `export.tsx`, `expense/new.tsx`, `expense/[id].tsx`. **Gli URL non
cambiano** — le parentesi non compaiono — quindi nessun `router.push` da correggere. Il
`(gruppo)/_layout.tsx` controlla `useGroups().current !== null` e altrimenti mostra un `EmptyState`.

Oggi quella condizione è sempre vera: è una rete di sicurezza inerte. Ma allo **Step 21** diventa il
**solo** punto dell'app in cui quel ramo esiste. È la risposta al «non sparpagliare condizioni in
mezza dozzina di schermate», ed è la ragione per cui questo step viene prima del 21.

Il layout deve rendere `<Stack screenOptions={{ headerShown: false, contentStyle: … }}>` come fa la
radice: con `<Slot />` si perderebbero le animazioni di push e la pila di ritorno.

**Due esclusioni deliberate, ed è la parte da non sbagliare:**

- **`backup.tsx` resta fuori da `(gruppo)`.** È l'unica schermata da cui si **ripristina** una chiave,
  cioè la cosa che serve a chi **non ha nessun gruppo**: dopo un azzeramento, o su un telefono nuovo.
  Metterla dietro «serve un gruppo» renderebbe irraggiungibile il ripristino proprio quando serve.
  Legge solo `useGroups`/`useCurrentGroup`, mai il runtime del vault, quindi allo Step 21 le basta un
  ramo: con `current === null` mostra la sola sezione «Ripristina da un backup». Va raggiunta anche
  dallo stato vuoto dell'elenco gruppi.
- **`pair/invite.tsx` non si sposta.** Serve un gruppo (legge `useCurrentGroup` e `registry.keyBytes`),
  ma metterla in `app/(gruppo)/pair/invite.tsx` lasciando `pair/index.tsx` e `pair/scan.tsx` in
  `app/pair/` farebbe convergere due cartelle diverse sullo stesso segmento `/pair`. Funziona,
  probabilmente; è anche esattamente il tipo di ambiguità che si paga con un'ora di debug su una rotta
  che non risolve. Usa in linea il componente condiviso `GroupRequired`.

**File nuovi:** `app/(gruppo)/_layout.tsx`, `apps/mobile/src/features/groups/GroupRequired.tsx`.

Trappole: le stesse dello Step 18 — un solo commit per lo spostamento, `expo export` come giudice,
grep sugli href.

### Step 20 — Quattro tab: Gruppi, Grafici, Impostazioni, Profilo

**File:** `app/(tabs)/_layout.tsx`, `app/(tabs)/profile.tsx` (nuovo), `app/(tabs)/settings.tsx`,
`app/(tabs)/stats.tsx`.

Quattro `Tabs.Screen`: `(gruppi)` 👥 «Gruppi», `stats` 📊 «Grafici», `settings` ⚙️ «Impostazioni»,
`profile` 🙂 «Profilo». Le icone restano **emoji dentro un `<Text>`**, come oggi: nessuna libreria
nuova, nessuna build nuova.

**Profilo** — nome (`TextInput` con commit su `onBlur`, riusando `commitName` di `settings.tsx:77-85`
così com'è), `ColorChoice`, **identificativo** (`profileId`, `selectable`, con la frase che spiega che
è casuale e opaco e che non è un account), **elenco dei gruppi di cui fai parte** in sola lettura
(tocco → `/groups/<id>`), e in fondo, staccata e in `colors.danger`, la voce «Azzera questo telefono»
→ `/azzera`. In questo step la voce porta a una schermata che spiega e basta: lo Step 22 la riempie,
così è tutto codice distruttivo e niente impaginazione.

**Impostazioni** — resta: `SyncBadge` + «Sincronizza adesso», `NavCard` Diagnostica, riga versione.
Spariscono la card «Gruppi» (è il tab 1), «Il tuo profilo» (è il tab 4), «Backup della chiave» ed
«Esporta i dati» (sono nel gruppo), «Categorie» (è nel gruppo).

**Decisione.** Impostazioni resta **fuori** da `(gruppo)`: allo Step 21 dovrà funzionare senza alcun
gruppo. L'engine si legge con `useVaultStatus()` (che non solleva) invece di `useVaultRuntime()` (che
solleva), e con il vault non pronto il bottone «Sincronizza adesso» è disabilitato. È l'unica
condizione che questo tab avrà mai.

### Step 21 — Al primo avvio non esiste nessun gruppo

Reintrodurre lo stato «nessun gruppo» — eliminato apposta dallo Step 12, vedi il commento a
`GroupsProvider.tsx:20-24` — **senza** rendere nullable `VaultRuntime.keys` e senza condizioni sparse.

1. **`GroupsData.current: GroupRecord | null`**, e `groups` che può essere vuoto. Il commento del
   provider va **sostituito** con la motivazione nuova, non cancellato: chi lo leggerà fra sei mesi
   deve trovare entrambe le ragioni.
2. **Via la creazione automatica**, in `boot` (`GroupsProvider.tsx:84-92`) e in `leave` (`:190`).
3. **`VaultProvider` resta sempre montato**, e guadagna una fase: `VaultStatus | { phase: 'absent' }`.
   Con `current === null` l'effetto esce subito e pubblica `absent`.

   > **Contro l'alternativa «montare `<VaultProvider>` solo se `current !== null`».** Montarlo
   > condizionalmente cambia il tipo di un antenato dello `Stack`: React smonterebbe e rimonterebbe
   > l'**intero navigatore** nell'istante in cui si crea il primo gruppo, azzerando la pila di
   > navigazione proprio durante il gesto in cui l'utente ha appena creato qualcosa. Con la fase
   > `absent` l'albero dei provider è stabile per tutta la vita del processo, e `keys` resta non
   > nullable perché il runtime o esiste intero o non esiste affatto.

4. **`VaultGate`** continua a bloccare su `loading` ed `error` e a mostrare `GroupIdentityGate` su
   `pending`; su `absent` **lascia passare**. Le schermate che vogliono il vault sono già tutte dietro
   la guardia dello Step 19, o dentro lo stack `[vaultId]` che senza gruppi non è raggiungibile.
5. **Tre stati vuoti in tutto:** l'elenco gruppi («Non hai ancora nessun gruppo» + «Crea un gruppo» +
   «Ho un invito» + «Ripristina da un backup»), i Grafici (`EmptyState` «Nessun gruppo aperto»), e
   `(gruppo)/_layout.tsx`, già scritto allo Step 19.
6. **Logica pura estratta e testata**, in `apps/mobile/src/state/current-group.ts`:
   `chooseCurrentGroup(list, stored): string | null` e `nextAfterLeave(list, leftVaultId): string | null`.
   Il provider si riduce a chiamarle. È l'unico modo di far crescere i test su questo step, visto che
   i provider non sono testabili senza React Native.
7. **`useCurrentGroup(): GroupRecord | null`** — cambiare la firma fa trovare al compilatore i tre
   chiamanti. Meglio che affiancare un `useCurrentGroupOrNull`: due hook quasi uguali diventano il
   posto dove qualcuno userà quello sbagliato.
8. **`leave` che svuota:** se non resta nulla → `currentId = null` e `meta.delete(CURRENT_GROUP_KEY)`,
   e la schermata torna a `/`. Il testo dell'Alert cambia: non più «al suo posto ne verrà creato uno
   vuoto» ma «resterai senza gruppi: potrai crearne uno o entrare con un invito».

**Il caso di ripristino — dove un errore distrugge dati.** Chi ha già «Le mie spese» con dentro delle
spese **non deve accorgersi di nulla**. La modifica tocca **solo il ramo `list.length === 0`**: quel
ramo si cancella, non si aggiunge logica che guardi i gruppi esistenti. In particolare:

- **nessuna migrazione e nessun bump di `CURRENT_SCHEMA_VERSION`** — alzarlo qui farebbe scattare
  `ensureSchema`, che è scritto per **cancellare**;
- `chooseCurrentGroup` con lista non vuota si comporta esattamente come oggi (`list.find(…) ?? list[0]`),
  ed è un test a fissarlo;
- niente pulizia dei gruppi «vuoti»: un gruppo appena creato e uno svuotato dall'utente sono
  indistinguibili.

_Verifica_ (`apps/mobile/src/state/current-group.test.ts`): lista vuota → `null` (il caso nuovo); lo
`stored` c'è → `stored`, anche se non è il primo; lo `stored` non c'è più → il primo della lista
(regressione del gruppo abbandonato); **`stored === null` con lista piena → il primo** — è il caso del
ripristino, ed è quello che protegge chi ha già dei dati; `nextAfterLeave` con un solo gruppo → `null`,
con tre → il primo dei rimasti.

Trappole: `VaultProvider` destruttura `const { vaultId, origin, myMemberId } = current` a riga 89 — con
`current` nullable diventa `current?.vaultId ?? null`, e le dipendenze dell'effetto devono restare
**primitive**, altrimenti si rimonta il motore a ogni render. Il terzo effetto legge `current.name` e va
reso condizionale. `useSyncState()` con `absent` deve restituire `{ phase: 'idle' }`, non l'ultimo stato
del gruppo di prima.

### Step 22 — Azzera questo telefono

Un azzeramento totale, in un ordine tale che qualunque interruzione lasci il telefono in uno stato che
l'app **sa già gestire**.

**La funzione, pura e testabile** — `apps/mobile/src/state/wipe.ts`:

```ts
export async function wipeDevice(deps: {
  db: SqliteDatabase;
  meta: KeyValueStore;
  keyStore: SecureKeyStore;
  registry: GroupRegistry;
}): Promise<{ groupsRemoved: number }>;
```

Import puntuali da `@/platform/key-names` e `@/platform/sync-store`, **mai** dal barrel `@/platform`:
è la stessa regola di `state/groups.ts`, altrimenti il test si tira dietro i moduli nativi e non si
apre nemmeno.

**L'ordine, e la ragione di ognuno:**

1. **`const list = await registry.list()`, prima di tutto.** Le chiavi in SecureStore si trovano solo
   tramite `groupKeyStorageKey(vaultId)`, ed `expo-secure-store` **non sa elencare i propri slot**.
   Cancellare la tabella `groups` prima di aver letto i `vaultId` lascerebbe nel Keystore di sistema
   chiavi che **nessuno potrà più nominare, per sempre**. È il punto più pericoloso dello step.
2. **Per ogni gruppo, `registry.forget(vaultId, { wipeRelay: false })`.** Si riusa il percorso già
   scritto e già testato — chiave → righe di sync → `DROP TABLE y_updates_<id>` → riga di registro, in
   quest'ordine — invece di scrivere SQL nuovo per una cosa che esiste. Il `false` è esplicito e
   commentato: **l'azzeramento non cancella dal relay**, perché è un gesto locale e cancellare dal
   relay riguarda tutti gli altri. Se un `forget` fallisce si raccoglie l'errore e si prosegue con gli
   altri, rilanciando alla fine: un gruppo che non si cancella non deve salvare gli altri.
3. **Spazzata degli orfani:** `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE
'y_updates_%'` → `DROP` di quel che resta. Rende l'azzeramento **riparatore**: un tentativo
   interrotto ieri si conclude oggi.
4. **`SqliteSyncStore.forgetAll(db)`** — nuovo metodo statico accanto a `forget`, che passa dallo
   stesso `ensureSchema` (uscire da un gruppo mai sincronizzato è già costato un `no such table`) e
   poi fa `DELETE FROM sync_state / sync_pending / sync_meta` **senza `WHERE`**. È l'unico posto del
   progetto in cui quel DELETE nudo è lecito, e sta dentro la classe che possiede quelle tabelle,
   sotto il commento che spiega perché altrove non lo è.
5. **`DELETE FROM groups`** — residui.
6. **`DELETE FROM app_meta` per ultimo**, e subito dopo `ensureSchema(db, meta, keyStore)`.
   - **Perché il profilo va per ultimo.** Finché il profilo esiste, ogni prefisso interrotto di questa
     sequenza è uno stato che l'app **sa già disegnare**: profilo presente, zero gruppi — cioè lo
     stato vuoto dello Step 21. Nell'ordine inverso ci sarebbe una finestra con «nessun profilo» ma
     gruppi ancora in elenco, che manda all'onboarding e poi fa **riapparire i gruppi di prima**: la
     peggior cosa che possa capitare a una funzione che si chiama «azzera».
   - **Perché `ensureSchema` subito dopo.** `DELETE FROM app_meta` porta via anche `schema_version`, e
     non si riavvia l'app, quindi `ProfileProvider` non lo ricalcolerà da solo. `ensureSchema` è
     idempotente ed è già testato.

**Il motore va spento prima.** Mentre si cancella, il `SyncEngine` del gruppo corrente sta girando: un
ciclo in volo può applicare update scaricati dal relay su una `y_updates_<id>` appena eliminata, o
`setPending` può ricreare righe dopo la spazzata. Piccola macchina a stati in
`apps/mobile/src/features/profile/useWipeDevice.ts`:

- `'idle'` → doppia conferma → `closeCurrent()` (nuovo metodo di `GroupsProvider`: `currentId = null`,
  `meta.delete(CURRENT_GROUP_KEY)`) → `'closing'`;
- il cleanup dell'effetto di `VaultProvider` fa `engine.stop()` e `persistence.destroy()` (che attende
  il flush ed è già scritto per questo), e lo stato del vault diventa `absent`;
- un `useEffect` osserva `'closing' && vaultStatus.phase === 'absent'` → `'wiping'` → `wipeDevice`;
- al termine `appData.forgetProfile()` (nuovo metodo di `ProfileProvider`, che fa `setProfile(null)`):
  il `ProfileGate` mostra `ProfileOnboarding` e **smonta `GroupsProvider` e `VaultProvider` con tutto
  il loro stato in memoria**. Registrando un profilo nuovo, `GroupsProvider` rimonta e trova le
  tabelle vuote: identico a un'installazione nuova, **senza riavvio**.

Attendere `absent` invece di sperare che lo smontaggio sia già avvenuto è la differenza fra un
progetto e un `setTimeout(…, 300)`.

**La schermata** — `app/azzera.tsx` (`ModalScreen`, fuori da `(gruppo)`: deve funzionare anche con zero
gruppi). Doppia conferma **senza** `Alert.prompt`, che su Android non esiste:

1. la schermata elenca cosa sparisce (profilo, N gruppi con i loro nomi, tutte le spese, tutte le
   chiavi) e cosa **no**: «Le copie sul relay restano e scadono da sole dopo trenta giorni. Se vuoi
   cancellarle, esci da ogni gruppo con l'interruttore _Cancella anche la copia sul relay_ prima di
   azzerare»; e «Senza un backup della chiave questi dati non tornano: non esiste un reset lato
   server»;
2. un `Switch` «Ho capito che non si torna indietro» che abilita il bottone `variant="danger"`;
3. il bottone apre l'`Alert` finale con `style: 'destructive'`.

Un link «Fai prima un backup della chiave» → `/backup` in cima: costa una riga ed è l'unica cosa che
rende reversibile il gesto.

_Verifica_ (`apps/mobile/src/state/wipe.test.ts`, su `NodeSqliteDatabase` e store in memoria, come
`groups.test.ts` e `schema.test.ts`): `cancella chiavi, tabelle e profilo di due gruppi`; `non lascia
tabelle y_updates orfane` (se ne crea una a mano, senza riga di registro, e deve sparire); `azzera
anche le righe di sync di ogni vault`; **`non chiede nulla al relay`** — spia sul `RelayGateway`: zero
`deleteVault`; `lascia lo schema alla versione corrente`; `un'interruzione a metà lascia uno stato
coerente` (`keyStore.delete` che solleva sul secondo gruppo: il primo è sparito del tutto, il profilo
c'è ancora, l'errore risale — e rieseguendo si conclude); `su un telefono senza gruppi non solleva`
(mai sincronizzato → le tabelle di sync non esistono: è il `no such table` già visto una volta).

---

## Trappole, in un posto solo

| Step  | Trappola                                                                    | Come si evita                                                                                                       |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 18/19 | Rotte duplicate durante uno spostamento                                     | Un solo commit per spostamento; `npx expo export --platform android` è l'unico giudice in CI                        |
| 18/19 | Href obsoleti che typecheck e lint non vedono (`.expo/types` è gitignorato) | `grep -rn "'/groups'\|'/(tabs)'" apps/mobile/src` come passaggio dello step, poi `expo start` per rigenerare i tipi |
| 19    | `backup.tsx` finita dietro «serve un gruppo»                                | Resta fuori: è la sola via per **ripristinare** una chiave da zero                                                  |
| 19    | `app/pair/` diviso fra due cartelle                                         | `pair/invite.tsx` non si sposta: usa `GroupRequired` in linea                                                       |
| 21    | Montare `<VaultProvider>` condizionalmente                                  | Fase `absent` dentro il provider: albero stabile, navigazione non azzerata, `keys` non nullable                     |
| 21    | Toccare qualcosa oltre il ramo `list.length === 0`                          | Nessuna migrazione, nessun bump di `CURRENT_SCHEMA_VERSION`, test su `chooseCurrentGroup` con lista piena           |
| 22    | **Cancellare `groups` prima di aver letto i `vaultId`**                     | Chiavi in SecureStore impossibili da nominare per sempre: leggere la lista come **primissima** operazione           |
| 22    | Motore vivo durante la cancellazione                                        | `closeCurrent()` → attendere `phase === 'absent'` → solo allora `wipeDevice`                                        |
| 22    | `DELETE` senza `WHERE` sulle tabelle di sync                                | Ammesso **solo** in `SqliteSyncStore.forgetAll`, a motore spento; altrove il `WHERE vault_id` resta intoccabile     |
| 17    | Cache dello state vector aggiornata prima della scrittura                   | Aggiornarla **dopo** il successo, con un test che lo fissa                                                          |
| 17    | `setPending` non serializzata                                               | Catena di promesse in `SqliteSyncStore`, con test su SQLite vero                                                    |
| 16    | Scala di poll malformata → `undefined` a `sleep` → ciclo a piena velocità   | Validazione nel costruttore, con tre test                                                                           |

---

## Criterio di «fatto» end-to-end

Il piano v3 è riuscito quando, su due telefoni fisici:

1. **Primo avvio da azzerato:** si arriva all'onboarding del profilo, poi a **zero gruppi**, e i tre
   ingressi funzionano tutti e tre — crea, ho un invito, ripristina da backup.
2. **La navigazione regge:** il gesto «indietro» dentro il tab Gruppi torna all'elenco e non esce
   dall'app; la tab bar resta visibile sul dettaglio del gruppo e sparisce sulle schermate-foglia.
3. **Un invito ricevuto in chat apre ancora `/groups/<id>` col gruppo giusto.** È il percorso che gli
   Step 18 e 19 rischiano di rompere in silenzio, e l'unico modo di saperlo è provarlo.
4. **Con due gruppi**, aprendo l'uno e l'altro i Grafici seguono il gruppo aperto e le spese non si
   mescolano.
5. **Il sync, misurato:** una spesa scritta su un telefono compare sull'altro entro pochi secondi
   mentre entrambi sono aperti, e ancora entro un minuto dopo che uno è rimasto fermo cinque minuti —
   è la scala dello Step 16 che lavora. Poi: **telefono in aereo, due spese, rete riaccesa** → partono
   entro ~15 s senza toccare nulla. È la prova di `offlineRetryMs`, cioè del sostituto del listener di
   connettività che non possiamo avere.
6. **«Azzera questo telefono»:** doppia conferma, ritorno all'onboarding **senza riavviare l'app**, e
   registrando un profilo nuovo non riappare nulla di prima.

Resta valido, e **viene prima di tutto questo**, il
[criterio di «fatto» del piano v2](piano-v2-profili-gruppi-sync.md#criterio-di-fatto-end-to-end): il
sync fra due telefoni fisici in entrambe le direzioni, con due membri e non quattro, non è mai stato
visto funzionare. Questo piano non lo sostituisce.

---

## Rischi noti

| Rischio                                                                 | Mitigazione                                                                                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Uno spostamento di rotte rompe l'ingresso da invito, in silenzio        | `expo export` a ogni step, grep sugli href, e il punto 3 del criterio di «fatto». È il rischio numero uno del piano                    |
| Il ritorno di «nessun gruppo» rimette rami condizionali ovunque         | Tre punti dichiarati e nessun altro, e lo Step 19 (la guardia) precede lo Step 21 apposta                                              |
| L'azzeramento lascia chiavi orfane nel Keystore di sistema              | La lista dei `vaultId` si legge come primissima operazione; test `non lascia tabelle y_updates orfane`                                 |
| L'azzeramento interrotto lascia l'app in uno stato non disegnabile      | Profilo cancellato per ultimo: ogni prefisso interrotto è «profilo presente, zero gruppi», che è uno stato normale. Test dedicato      |
| La scala di poll rallenta troppo e la sync sembra rotta                 | `markActive()` sulle schermate di dati e `resume()` da `AppState` riportano subito al gradino stretto. Punto 5 del criterio di «fatto» |
| `offlineRetryMs` martella quando la rete è intermittente                | Fallisce localmente senza toccare il relay, e il `Math.max(…, pollIntervalMs())` non scende mai sotto il ritmo di poll corrente        |
| Un utente con dati esistenti li perde passando allo Step 21             | Si tocca **solo** il ramo `list.length === 0`; nessuna migrazione, nessun bump di schema; test `stored === null` con lista piena       |
| Il log del relay cresce: la compattazione server documentata non esiste | Invariato dal piano v2: `docs/architecture.md` la promette ma non c'è codice. Per ora regge il TTL di 30 giorni                        |

---

## Fuori perimetro

- **WebSocket sul Durable Object** — è il piano v4. La Hibernation API porterebbe la propagazione
  sotto il secondo e azzererebbe quasi il polling, e `WebSocket` è API core di React Native, quindi
  **non richiederebbe una build EAS nuova**. Ma è un cambio di protocollo sul relay, con riconnessione
  e fallback al polling da scrivere e testare: si valuta **dopo** aver provato sul campo la taratura
  degli Step 16 e 17.
- **Grafici aggregati su più gruppi** — richiederebbero di montare più `Y.Doc` contemporaneamente, che
  è la scelta architetturale che l'intero progetto ha evitato finora.
- **Listener di connettività** — modulo nativo, quindi build nuova. Sostituito da `offlineRetryMs`.
- **Endpoint «niente di nuovo» a costo ridotto sul relay** — il relay non si tocca in questo piano,
  quindi un ciclo a vuoto resta **una GET**.
- **Nuove build EAS** — nessuna. `AppState`, `Share` e `WebSocket` sono API core di React Native, già
  presenti nella development build installata.
- **Coalescere le scritture della coda nel motore** (una per finestra di debounce invece di una per
  update) — sarebbe il seguito naturale dello Step 17.3, e la finestra di crash è coperta dal catch-up
  dello state vector, ma è un cambiamento di semantica: se servirà, sarà uno step suo.
- **Auth di Google, membri ospite, App Links veri** — restano esclusi come nel
  [piano v2](piano-v2-profili-gruppi-sync.md#fuori-perimetro).
