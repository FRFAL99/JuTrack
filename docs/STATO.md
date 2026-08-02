# Stato del progetto — punto di partenza

Aggiornato: 2026-08-02, a Step 19 chiuso — **piano v3 in corso, restano gli Step 20–22**.

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
| 20 — Quattro tab                    | ⬜    | Gruppi, Grafici, Impostazioni, Profilo                       |
| 21 — Nessun gruppo al primo avvio   | ⬜    | Fase `absent`, l'utente crea o entra con un invito           |
| 22 — Azzera questo telefono         | ⬜    | Wipe totale e ritorno all'onboarding, senza riavvio          |

**563 test verdi** (387 core + 133 app + 43 relay), typecheck, lint e `format:check` puliti.

**I piani chiusi sono due.** Il piano originale (Step 0–9), e
[piano-v2-profili-gruppi-sync.md](piano-v2-profili-gruppi-sync.md) (**Step 10–14**), nato dalla prima
prova con due dispositivi che aveva fatto emergere due bug sui numeri e tre limiti di prodotto.

**Il terzo è in corso:** [piano-v3-tab-gruppi-azzeramento-sync.md](piano-v3-tab-gruppi-azzeramento-sync.md),
**Step 16–22**, di cui **16, 17, 18 e 19 sono fatti**. Nasce dalla prova a mano delle funzionalità: la
gestione dei gruppi non è intuitiva, il gruppo di default al primo avvio genera confusione, e il poll
del relay va tarato. **Uno step per sessione.** La taratura del motore è finita, e **gli spostamenti
di rotte pure**: erano i due step più delicati del piano — quelli che potevano rompere in silenzio
l'ingresso da un invito — e sono chiusi entrambi con gli URL intatti (vedi sotto). Da qui in poi si
riorganizzano i tab (20), si toglie il gruppo di default (21) e si scrive l'azzeramento (22).

> **Non resta codice da scrivere per i piani v1 e v2, resta la prova sul campo.** Dallo Step 10 in poi
> nulla è mai stato visto funzionare su un telefono: quello che manca è il [criterio di «fatto»
> end-to-end](piano-v2-profili-gruppi-sync.md#criterio-di-fatto-end-to-end) su due dispositivi
> fisici. Finché non è stato fatto, «i test passano» e «funziona» restano due frasi diverse. **Gli
> Step 18 e 19 hanno appena spostato tutte le rotte dell'app**: gli URL sono rimasti quelli di prima
> e i tipi generati da expo-router lo confermano, ma è una ragione in più per farla adesso. Gli
> spostamenti di file sono finiti: da qui in poi la struttura delle rotte non si tocca più.
>
> **Con un telefono solo si fa quasi tutto lo stesso:** `npm run prova` esegue la checklist da sola
> — due dispositivi senza schermo che montano **i moduli veri dell'app** su SQLite vero contro il
> relay in produzione, una trentina di controlli in ~90 s — e `npm run peer` è la versione
> interattiva, per le prove che hanno bisogno del telefono dall'altra parte. Cosa copre e cosa no in
> [prova-con-un-telefono-solo.md](prova-con-un-telefono-solo.md).

**La pagina `/j` è in produzione** (deploy del 2026-08-02, versione `b351a959`): risponde 200 con
gli header attesi — `Referrer-Policy: no-referrer`, CSP `default-src 'none'`, `noindex` — e l'HTML
servito è quello del repo, senza risorse esterne. Resta da provare col telefono in mano.

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
la lista si è accorciata parecchio, ma non è vuota:

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
  della chiave — mai toccate con un dito
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
- **Tutto lo Step 14**: che la cancellazione dal relay risponda davvero — è la prima richiesta di
  rete che parte da un gesto dell'utente e non dal motore di sync — e che dopo una rigenerazione
  l'altro telefono entri nel gruppo nuovo col link e ci ritrovi le spese di prima

> **La development build installata sul telefono non contiene i due moduli nuovi.** È stata
> compilata prima che venissero aggiunti. L'app si apre lo stesso — sono caricati con `require` in
> `try/catch` proprio per questo — e l'export ripiega sugli appunti, dichiarandolo nell'interfaccia.
> Il foglio di condivisione comparirà solo dopo una build aggiornata.

Tutto il resto è verificato: 563 test, convergenza CRDT, relay reale in produzione, e l'esecuzione
su un dispositivo Android reale.

## Trappole già risolte — da non riscoprire

| Trappola                                                                                          | Soluzione adottata                                                                             |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `TextEncoder` non esiste su Hermes                                                                | UTF-8 scritta in `crypto/encoding.ts`; vietato l'import da noble                               |
| Yjs non fa il bundle su RN (`lib0` → `isomorphic-webcrypto`, fermo al 2022)                       | Alias in `metro.config.js` verso uno shim su `expo-crypto`                                     |
| `storage.deleteAll()` su Durable Object SQLite cancella anche le tabelle                          | `ensureSchema()` subito dopo, con test di regressione                                          |
| Un blob corrotto blocca **tutti** gli update successivi di quel device                            | Ripubblicazione dello stato completo al rilevamento                                            |
| TypeScript bloccato a 6.x                                                                         | `typescript-eslint` dichiara peer `typescript <6.1.0`                                          |
| Nella flat config ESLint vince l'ultima regola                                                    | Gli override vanno **dopo** il blocco generale                                                 |
| Metro annunciava `127.0.0.1` come host del bundle                                                 | `REACT_NATIVE_PACKAGER_HOSTNAME=<ip-lan>`                                                      |
| expo-router importa **tutte** le route al boot: un modulo nativo rotto uccide l'app intera        | `expo-camera`, `expo-file-system`, `expo-sharing` con `require` in `try/catch`                 |
| **`expo start` dalla root del monorepo**: 404 su ogni bundle, app muta                            | Avviarlo **sempre** da `apps/mobile`; è costato giorni                                         |
| Due copie di React (`expo-*` dichiara `"react": "*"`)                                             | `overrides` nella root + lock rigenerato; `expo-doctor` lo vede                                |
| `DELETE FROM sync_pending` senza `WHERE`: con due gruppi cancella la coda offline dell'altro      | Colonna `vault_id` ovunque, e un test su SQLite vero — con un finto motore passerebbe comunque |
| I tipi delle rotte expo-router non li rigenera `expo export`, ma `expo start`                     | Sono in `.expo/types/`, gitignorato: in CI non esistono e il typecheck passa lo stesso         |
| **expo-router non espone il fragment**: `useLocalSearchParams` vede il percorso e la query        | La rotta `/join` legge il link grezzo con `Linking.useLinkingURL()`                            |
| Uscire da un gruppo **mai sincronizzato**: `no such table: sync_state`                            | `SqliteSyncStore.forget` passa dallo stesso `ensureSchema` di `open`                           |
| La schermata del gruppo riselezionava il gruppo **appena abbandonato**: app ferma sul caricamento | Guardia nella schermata **e** in `select`, che rifiuta un `vaultId` non nel registro           |
| Spostare rotte con `.expo/types/` gitignorato: gli href obsoleti passano typecheck **e** lint     | Grep sugli href, poi `expo start` per rigenerare i tipi e `tsc` **con quei tipi presenti**     |

## Dove sta ogni schermata (Step 18 e 19)

Il primo tab non è una schermata ma uno **stack**: elenco dei gruppi → gruppo aperto.

```
app/(tabs)/(gruppi)/index.tsx                      "/"                     elenco dei gruppi
app/(tabs)/(gruppi)/groups/[vaultId]/_layout.tsx                           guardia di selezione
app/(tabs)/(gruppi)/groups/[vaultId]/index.tsx     "/groups/<id>"          le spese del gruppo
app/(tabs)/(gruppi)/groups/[vaultId]/manage.tsx    "/groups/<id>/manage"   nome, persone, invito, uscita
                                                                           + le cinque NavCard qui sotto
app/(gruppo)/_layout.tsx                                                   guardia «serve un gruppo»
app/(gruppo)/categories.tsx                        "/categories"
app/(gruppo)/budget.tsx                            "/budget"
app/(gruppo)/settle.tsx                            "/settle"
app/(gruppo)/export.tsx                            "/export"
app/(gruppo)/expense/new.tsx                       "/expense/new"
app/(gruppo)/expense/[id].tsx                      "/expense/<id>"

app/backup.tsx                                     "/backup"               fuori: serve senza gruppo
app/pair/invite.tsx                                "/pair/invite"          fuori: `GroupRequired` in linea
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
- **Il gruppo non è più una pill da leggere**: è il **titolo** della schermata delle spese, e toccarlo
  porta alla sua gestione.
- `unstable_settings = { initialRouteName: 'index' }` in entrambi i layout: senza, chi arriva a
  `/groups/<id>` da un link non ha nulla sotto nello stack, e «indietro» esce dall'app.
- **`app/(gruppo)/` è una guardia, non un tab.** Il suo layout controlla che un gruppo aperto esista
  e altrimenti mostra `GroupRequired`. Oggi la condizione è sempre vera; dallo **Step 21**, in cui al
  primo avvio non esiste alcun gruppo, sarà il **solo** punto dell'app in cui quel ramo vive — ed è
  per questo che la guardia è stata scritta prima dello stato vuoto che la attiva.
- **Due schermate ne restano fuori di proposito.** `backup.tsx`, perché è l'unica da cui si
  **ripristina** una chiave, cioè ciò che serve a chi un gruppo non ce l'ha; e `pair/invite.tsx`,
  perché `app/(gruppo)/pair/` e `app/pair/` convergerebbero sullo stesso segmento `/pair` — usa
  `GroupRequired` in linea, in un componente sopra quello che lavora, perché gli hook vanno chiamati
  prima di ogni uscita anticipata.
- **Tutto ciò che riguarda un gruppo si apre dal gruppo** (Step 19): categorie, budget, pareggi,
  backup della chiave ed export sono cinque `NavCard` in `manage`. Prima stavano in Impostazioni,
  dove sembravano riguardare l'app: chi apriva «Backup della chiave» non poteva sapere di **quale**
  chiave si trattasse. Le voci restano anche in Impostazioni fino allo Step 20, che ripulisce i tab.

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
