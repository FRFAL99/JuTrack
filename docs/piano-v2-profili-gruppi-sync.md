# JuTrack — Piano v2: profili, gruppi, inviti, sync veloce

> **Avanzamento al 2026-08-02.**
> Completati: **Step 0–9** (il piano originale) e gli **Step 10, 11, 12 e 13** di questo documento.
> Resta lo **Step 14**.
>
> Nasce dalla prima prova reale con **due dispositivi**, che ha fatto emergere due bug con
> conseguenze sui numeri e tre limiti di prodotto che il piano originale non copriva.
>
> Punto d'ingresso del progetto: [STATO.md](STATO.md). Piano originale approvato:
> `~/.claude/plans/vorrei-progettare-ora-la-compiled-breeze.md`.

## Contesto

Il piano originale si fermava a «due telefoni, un vault, pairing via QR». Alla prova sul campo quel
modello si è rivelato insufficiente su tre fronti — e, sotto, nascondeva due difetti veri.

### I due bug

**1. La sincronizzazione è unilaterale.**

`SyncEngine.start()` (`packages/core/src/sync/engine.ts:88-91`) registra l'observer e riprende la
coda, ma **non pubblica mai lo stato già presente nel documento**. La persistenza locale viene
caricata prima (`apps/mobile/src/state/VaultProvider.tsx:75`) con `origin = persistence`, quindi non
passa da `onLocalUpdate`.

Conseguenza: tutto lo storico di un telefono — categorie, membri, spese registrate prima di creare o
adottare il vault — non finisce mai nel relay. Parte solo ciò che si scrive _dopo_ quel boot. Il
telefono che aveva già dati resta muto e l'altro sembra funzionare.

Peggio: gli update ricevuti che dipendono da struct mai trasmessi restano _pending_ dentro Yjs e non
vengono applicati, mentre il cursore avanza lo stesso. Il ciclo riporta `synced`, e la UI non mostra
niente. È il motivo per cui la sync sembrava «funzionare, ma in una sola direzione».

Nessun test lo copre: `makeDevice()` in `engine.test.ts` parte sempre da un `Y.Doc` vuoto e chiama
`start()` prima di scrivere. Lo scenario «motore avviato su un documento che ha già contenuto» non
esiste nella suite.

**2. I membri si duplicano, e il saldo è sbagliato.**

`apps/mobile/src/state/seed.ts:41-45` crea al primo avvio un membro «Io» con un **id casuale
proprio**, su ogni dispositivo. Dopo il sync esistono due membri «Io» distinti: le spese di A puntano
all'id di A, quelle di B all'id di B. L'app crede siano due persone diverse, quindi **il calcolo di
chi deve quanto all'altro è già errato** — non è solo la lista Persone che sembra strana.

Lo stesso meccanismo duplica le otto categorie di default in sedici.

La radice è che dentro il vault non esiste un identificatore stabile di «me». Non è un problema di
autenticazione: è il modello dati che non ha mai avuto una nozione di _profilo_.

### I tre limiti di prodotto

**Un solo vault per dispositivo.** Non è una convenzione, è cablato in quattro punti: lo slot unico
in SecureStore (`apps/mobile/src/platform/keystore.ts:23`), il `useEffect([])` che monta il runtime
una volta per vita dell'app (`apps/mobile/src/state/VaultProvider.tsx:61`), le tabelle di sync senza
colonna vault, e `adoptVaultKey` che **sovrascrive** la chiave
(`apps/mobile/src/state/vault-key.ts:70-74`). Entrare in un vault significa uscire dal precedente.

**Il pairing via QR non è chiaro, e non si torna indietro.** Richiede i due telefoni nello stesso
posto, impone un riavvio manuale dell'app
(`apps/mobile/src/features/pairing/useAdoptPairing.ts:33-40`), e non esiste alcun modo di
disaccoppiarsi.

**La sync è lenta.** Poll fisso a 15 s (`packages/core/src/sync/engine.ts:15`) e **nessun trigger
sulla modifica locale**: una spesa nuova aspetta la fine del sonno in corso. Due hop → latenza media
~15 s, peggiore ~30 s.

### Esito voluto

Un profilo per persona, gruppi di spesa multipli sullo stesso telefono, inviti condivisibili come
link, la possibilità di uscire da un gruppo, e una sincronizzazione che si vede arrivare in pochi
secondi **in entrambe le direzioni**.

---

## Decisioni prese

| Ambito             | Scelta                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| Identità           | **Profilo locale**, `profileId` casuale e opaco. Niente account, niente login    |
| Auth di Google     | **Esclusa**, con il campo `identity` lasciato aperto per il futuro               |
| Persone nel gruppo | **Solo profili.** Nessun membro «ospite» aggiunto a mano                         |
| Dati esistenti     | **Si riparte puliti.** Niente migrazione di schema, niente fusione dei duplicati |
| Gruppo             | **Un gruppo = un vault = una `vaultKey` = un `vaultId` = un Durable Object**     |
| Relay              | **Non cambia struttura.** Si aggiunge solo la pagina di atterraggio degli inviti |
| Invito             | Link `https://…/j#…`, **chiave nel fragment**                                    |
| Velocità di sync   | **Polling adattivo.** I WebSocket si valutano dopo aver misurato                 |
| Build              | **Nessuna nuova build EAS**: nessun modulo nativo aggiunto                       |

### Perché non l'auth di Google

È la domanda che tornerà, quindi vale la pena fissare il ragionamento.

**Non risolverebbe il problema.** La duplicazione dei membri è un difetto di modello dati, non di
autenticazione. Google restituirebbe un id account, che andrebbe comunque scritto dentro il CRDT come
chiave del membro — esattamente ciò che fa un id casuale generato sul telefono, che però non richiede
nulla.

**Costerebbe parecchio per nulla in cambio:** un modulo nativo (`expo-auth-session` o
`@react-native-google-signin`) e quindi una **nuova build EAS**; un progetto Google Cloud con OAuth
consent screen; un client ID Android col fingerprint SHA-1 del keystore custodito da EAS; un secondo
client ID per iOS in futuro.

**E soprattutto non sarebbe nemmeno verificata.** Un Google Sign-In solo lato client è
inverificabile: senza un backend che validi l'`id_token`, chiunque può dichiararsi chiunque. Quel
backend darebbe al relay un ruolo di identità — cioè romperebbe il principio portante del progetto,
per cui il relay non sa nulla di nessuno (`docs/architecture.md`, «Principio non negoziabile»). Ed è
esattamente il punto in cui prima o poi arrivano i costi.

**Il seam resta aperto.** Il profilo prevede un campo opzionale `identity?: { provider, subject }`, e
`profileId` è **opaco** — mai derivato da altro. Agganciare Google (o qualunque altro provider) più
avanti non richiederà di cambiare la chiave con cui i membri sono scritti nel vault, che è la parte
costosa da modificare a posteriori.

### Perché si riparte con dati puliti

I dati attualmente sui due telefoni sono dati di prova. Ripartire elimina in un colpo la migrazione
di schema e lo strumento di fusione dei membri duplicati: erano i due pezzi più rischiosi del piano,
e uno dei due (la riscrittura di `paidBy` e delle quote su tutte le spese) è anche quello dove un
errore si nota tardi e sui numeri.

---

## Step di implementazione

Ogni step termina con: **test verdi → documentazione aggiornata → commit**. Nessuno step lascia il
repo in stato non compilante.

> **Lo Step 10 è indipendente dagli altri quattro.** Non tocca profili né gruppi, e da solo risolve
> la sincronizzazione unilaterale. Se una sessione futura ha tempo per una cosa sola, è quella.

### Step 10 — Motore di sync: correttezza e velocità ✅

**Fatto.** Realizzato come previsto, con due aggiunte emerse strada facendo: `RelayError.fatal`
(401/403) distinto da `permanent`, e il nuovo stato `blocked` nella UI — un 403 non è un errore che
passerà, e dirlo «non sincronizzato, riprovo» sarebbe una bugia. Il resoconto è nel
[devlog](devlog.md). Restano da vedere su hardware i 2-3 secondi promessi.

Tutto in `packages/core/src/sync/`, più due file di `apps/mobile/src/platform/`.

**Il fix del bug principale — catch-up al boot**

`SyncCursorStore` (`packages/core/src/sync/types.ts`) acquista `getPushedStateVector(): Promise<Uint8Array | null>`
e `setPushedStateVector(sv)`.

- In `start()`:
  `const delta = Y.encodeStateAsUpdate(doc, (await store.getPushedStateVector()) ?? undefined)`.
  Se il delta è non banale va accodato in `pending`. Soglia: `delta.length > 2` — un documento vuoto
  ne produce esattamente 2.
- Alla fine di un ciclo riuscito **in cui `pending` si è svuotata**, salvare
  `setPushedStateVector(Y.encodeStateVector(doc))`. La condizione non è un dettaglio: aggiornare lo
  state vector con la coda ancora piena perderebbe gli update non accettati dal relay.
- Gli update ricevuti dal relay sono per definizione già pubblicati, quindi includerli nello state
  vector è corretto e impedisce che il boot successivo li rimandi indietro.

Copre tutti i casi che oggi sfuggono: storico precedente alla creazione del vault, seed eseguito
prima di `start()`, adozione di una chiave su un documento già pieno, update generati mentre il
motore era spento.

**Velocità**

- **Push immediato sulla modifica locale.** `onLocalUpdate`
  (`packages/core/src/sync/engine.ts:48-54`) oggi accoda e basta. Va aggiunto un `syncOnce()` con
  debounce (`debounceMs`, default 400 ms) che si resetta a ogni update, così una raffica di scritture
  produce una richiesta sola.
- **Sonno interrompibile.** `runForever` fa un `await this.sleep(...)` fisso
  (`packages/core/src/sync/engine.ts:227`): serve un `wake()` che risolva la promise in corso — una
  race fra il timer e una promise risolvibile dall'esterno. Senza, il push immediato non ha effetto.
- **Poll adattivo.** `SyncEngineOptions` guadagna `activePollMs` (3 000), `idlePollMs` (30 000),
  `activeWindowMs` (120 000). Si è «attivi» se negli ultimi due minuti c'è stata una modifica locale
  o un pull con contenuto.
- **`pause()` / `resume()`** e un listener `AppState` nell'app: `active` → `resume()` (che azzera il
  backoff, risveglia il loop e fa subito un ciclo), `background` → `pause()`. Risolve anche il caso
  odierno in cui il backoff arriva a 5 minuti e non si azzera al ritorno della connettività.

Quota: due telefoni a 20 richieste/minuto nelle sole finestre attive restano due ordini di grandezza
sotto le 100 000 richieste/giorno del piano free.

**Correttezza e diagnosi**

- **Bug del cursore.** `packages/core/src/sync/engine.ts:165-170`: se un'intera pagina è
  indecifrabile il cursore salta a `result.head`, cioè alla fine dell'**intero log**, non della
  pagina. Con `hasMore = true` si perdono in silenzio tutti gli update validi in mezzo, e il ciclo
  riporta `synced`. `RelayClient.pull` deve restituire anche l'ultimo `seq` **visto** nella pagina
  (decifrabile o no), e il cursore avanza a quello.
- **`phase: 'offline'` non viene mai emesso.** Il tipo esiste in `packages/core/src/sync/types.ts` ed
  è già gestito nella UI, ma il motore non lo produce: gli errori di rete finiscono in `error` col
  messaggio grezzo dell'eccezione. Vanno mappati su `offline`.
- **Il 403 cicla all'infinito.** È permanente, ma porta solo il backoff a 5 minuti
  (`packages/core/src/sync/engine.ts:129-132`): il dispositivo resta muto per sempre ripetendo la
  stessa richiesta. Va fermato il loop, con un messaggio comprensibile.
- **Timeout più lungo dell'intervallo.** `REQUEST_TIMEOUT_MS` (`apps/mobile/src/platform/http.ts:4`)
  è 20 s contro i 15 s di poll: portarlo a 10 s.
- **`setPending` senza transazione.** `apps/mobile/src/platform/sync-store.ts:55-63` fa DELETE + N
  INSERT a ogni singolo edit: avvolgere in `BEGIN`/`COMMIT`.

_Verifica:_ un test che avvia il motore su un `Y.Doc` **già popolato** e controlla che l'altro
dispositivo riceva tutto — è lo scenario che oggi nessun test copre. Poi, sui due telefoni: una spesa
creata su A compare su B in 2-3 secondi, **e viceversa**.

### Step 11 — Profili: chi sono io ✅

**Fatto**, con una differenza dichiarata: il **ricollegamento a un membro esistente** («sei già in
questo gruppo con un altro nome?») è rinviato allo Step 12. `my_member_id` è già scritto e letto per
vault, ma la domanda va posta **dopo** il primo sync — al boot il documento di chi è appena entrato è
ancora vuoto, quindi non c'è nulla a cui legarsi — e il momento giusto è l'apertura di un gruppo.
Servirebbe inoltre poter cancellare il membro creato per sbaglio, e i membri non hanno tombstone.

Non essendoci ancora i gruppi, «createGroup / joinGroup» qui sono `createVault` e l'adozione di una
chiave (pairing o ripristino del backup): è lì che viene registrata l'origine del vault. Il
resoconto è nel [devlog](devlog.md).

**Il profilo.** Uno per persona, **condiviso fra tutti i gruppi**:
`{ profileId, name, color, identity? }`.

- `profileId` è casuale e **opaco**, mai derivato da altro: è il seam che permetterà di agganciare un
  provider d'identità senza cambiare la chiave con cui i membri sono scritti nel vault.
- Vive in una tabella `app_meta` di SQLite, **non in SecureStore**: non è materiale crittografico, e
  tenere SecureStore riservato alle sole chiavi conserva la separazione già in essere.

**Onboarding al primo avvio.** Una schermata sola, prima di tutto il resto: «Come ti chiami?» più un
colore. Il profilo esiste già quando si crea il primo gruppo, quindi non esistono stati intermedi in
cui «tu» non esisti.

**Il membro nasce dal profilo.**

- Su `createGroup` e su `joinGroup` il dispositivo scrive da solo `members[profileId] = { name, color }`
  nel vault di quel gruppo. L'altra persona compare quando apre il gruppo dal suo telefono.
- Due profili non collidono mai: gli id sono casuali e generati una volta sola per persona.
- **Il seed non crea più alcun membro.** Le categorie di default restano, ma **solo su `createGroup`,
  mai su `joinGroup`**: chi entra le riceve col primo sync. Oggi girano a ogni boot su ogni
  dispositivo, ed è la ragione delle 16 categorie invece di 8.
- Il tipo `Member` (`packages/core/src/model/types.ts:61-65`) **non cambia**: cambia solo come viene
  scelto l'`id`. Nessuna modifica al modello dati né al calcolo del saldo.

**Via la gestione manuale delle persone.** La card «Persone» col campo di inserimento
(`apps/mobile/src/app/(tabs)/settings.tsx:111-165`) sparisce. Al suo posto: in Impostazioni una card
«Il tuo profilo» (nome e colore, modificabili), e nel dettaglio del gruppo l'elenco **in sola
lettura** di chi ne fa parte. Rinominarsi aggiorna `members[profileId].name` nel gruppo aperto
subito, e negli altri quando li si apre. Nel form spesa il `paidBy` di default diventa il proprio
`profileId`.

**Recupero su un telefono nuovo.** Ripristinare il backup della chiave su un telefono nuovo dà un
`profileId` nuovo, che creerebbe **un secondo membro** — di nuovo il bug che stiamo togliendo. La via
d'uscita è piccola: la tabella `groups` porta una colonna `my_member_id` (di norma uguale a
`profileId`); all'apertura di un gruppo in cui `members[profileId]` non esiste **ma esistono altri
membri**, l'app chiede una volta «sei già in questo gruppo con un altro nome?» e permette di legarsi
a un membro esistente. Tutte le spese già registrate restano riferite correttamente.

_Verifica:_ due dispositivi con profili distinti producono **due** membri e un saldo corretto, non
quattro membri. Chi entra in un gruppo non risemina le categorie: 8, non 16.

### Step 12 — Più gruppi sullo stesso telefono ✅

**Fatto**, con tre scostamenti dichiarati.

1. **Non esiste più lo stato «nessun vault».** Al primo avvio nasce un gruppo da solo («Le mie
   spese»): costa 32 byte casuali e nessuna richiesta di rete, e in cambio `keys` smette di essere
   nullable in tutta l'app. Il piano lo dava per scontato senza dirlo.
2. **Il ricollegamento al membro esistente si chiede _prima_ di scrivere il membro, non dopo.** Lo
   Step 11 prevedeva la domanda dopo il primo sync, ma i membri non hanno tombstone: quello scritto
   nel frattempo sarebbe rimasto lì per sempre. Per chi _entra_ in un gruppo altrui non viene scritto
   alcun membro finché non ha risposto.
3. **«Esci dal gruppo» è già qui**, non allo Step 14: `GroupRegistry.forget` cancella chiave, righe
   di sync, tabella del documento e riga di registro, ed era la controparte naturale del registro. Ciò
   che resta allo Step 14 è l'eliminazione dal relay e la rigenerazione del gruppo.

Il resoconto è nel [devlog](devlog.md). Sotto, il piano com'era stato scritto.

Il core è già pronto: `seal`/`open` prendono il `vaultId`, `VaultStore` riceve il `Doc` per
iniezione, e `SqliteYPersistence` **supporta già** `tableName`
(`packages/core/src/persistence/y-sqlite.ts:28`, con tanto di commento «Consente più documenti nello
stesso database»). Il lavoro è quasi tutto in `apps/mobile`.

**Registro dei gruppi**

- SecureStore: da `jutrack.vaultKey` a `jutrack.groupKey.<vaultId>`, una voce per gruppo.
- SQLite: tabella `groups(vault_id TEXT PRIMARY KEY, name TEXT NOT NULL, my_member_id TEXT, created_at TEXT NOT NULL, last_opened_at TEXT)`.
  Il `name` qui è solo **cache**, per disegnare la lista senza aprire tutti i documenti.
- **Il nome autorevole sta dentro il vault**: una `Y.Map` `meta` in `packages/core/src/model/doc.ts`
  con `name`, così rinominare un gruppo si propaga all'altro telefono. All'apertura, se `meta.name`
  differisce dalla cache, si aggiorna la riga.
- `apps/mobile/src/state/vault-key.ts` diventa `state/groups.ts`: `listGroups`, `createGroup(name)`,
  `joinGroup(key, name)`, `renameGroup`, `leaveGroup(vaultId, { wipeRelay })`,
  `loadGroupKeys(vaultId)`, `loadGroupKeyBytes(vaultId)`.

**Tabelle per vault — il punto pericoloso**

- `y_updates` → `y_updates_<vaultId>`, passando `tableName` al costruttore. Nessuna modifica al core.
- `sync_state` e `sync_pending` (`apps/mobile/src/platform/sync-store.ts:15-25`) acquistano una
  colonna `vault_id`; `sync_state` con chiave primaria composta `(vault_id, key)`;
  `SqliteSyncStore.open(db, vaultId)`.
- **`setPending` fa oggi `DELETE FROM sync_pending` senza `WHERE`**
  (`apps/mobile/src/platform/sync-store.ts:59`). Con due gruppi attivi cancellerebbe la coda offline
  dell'altro: spese registrate offline perse senza che nulla lo segnali. È l'unico punto di tutto il
  piano dove un errore distrugge dati.

**Ripartenza pulita.** Niente migrazione. Una `schema_version` in `app_meta`: se all'avvio si trova
uno schema vecchio (tabelle senza `vault_id`), si eliminano quelle tabelle e si cancella
`jutrack.vaultKey` da SecureStore. Operazione una-tantum e idempotente, molto più corta di una
migrazione reale. Il vecchio vault sul relay si elimina con `DELETE /v1/vault/<vecchioVaultId>/vault`
— che **esiste già** (`services/relay/src/index.ts:11`) — oppure si lascia scadere col TTL di 30
giorni, dato che nessuno avrà più la chiave per leggerlo.

**Runtime rimontabile.** `apps/mobile/src/state/VaultProvider.tsx` si divide in due: un
`GroupsProvider` (profilo, registro dei gruppi, gruppo corrente) e il runtime del gruppo corrente,
montato in un `useEffect` con dipendenza **`[currentVaultId]`** invece di `[]`. Cambiare gruppo
smonta engine e persistenza e ne monta altri.

> Effetto collaterale importante: **sparisce il «riavvia l'app»** dopo il pairing e dopo la creazione
> del vault (`apps/mobile/src/features/pairing/useAdoptPairing.ts:33-40`,
> `apps/mobile/src/app/(tabs)/settings.tsx:78-80`).

Un solo motore attivo per volta, sul gruppo corrente; gli altri si allineano con un ciclo immediato
quando li si apre.

`VaultRuntime` guadagna `vaultId`, `groupName` e `myMemberId`. **Gli hook di
`apps/mobile/src/state/hooks.ts` non cambiano firma** — leggono dal runtime corrente — quindi le 11
schermate che consumano dati (`(tabs)/index.tsx`, `stats.tsx`, `budget.tsx`, `categories.tsx`,
`settle.tsx`, `expense/*`, `export.tsx`) **non si toccano**. È la ragione per cui questo step è
fattibile senza riscrivere l'app.

**UI**

- Nuova rotta `/groups`: lista, gruppo corrente evidenziato, «Crea gruppo», «Entra con un invito».
- Nuova rotta `/groups/[vaultId]`: rinomina, chi ne fa parte, «Invita», «Esci dal gruppo».
- Selettore nell'header della tab Spese: nome del gruppo corrente, tap → `/groups`.
- La card «Vault condiviso» (`apps/mobile/src/app/(tabs)/settings.tsx:167-221`) diventa «Gruppi».

_Verifica:_ due gruppi sullo stesso telefono con spese separate; si cambia gruppo **senza riavviare
l'app**; una spesa registrata offline in un gruppo sopravvive a una scrittura nell'altro.

### Step 13 — Inviti via link ✅

**Fatto**, con tre scostamenti dichiarati.

1. **Il QR continua a portare il vecchio `jutrack://pair?…`**, non il link nuovo. Codificare
   l'https allungherebbe il codice di una cinquantina di caratteri per un guadagno nullo: chi
   inquadra col lettore interno arriva allo stesso posto, e chi lo fa col lettore di sistema
   passerebbe da un giro in più nel browser. I QR già in circolazione restano validi.
2. **`parseInvite` non è una terza funzione accanto alle due esistenti**, ma quella che l'app usa
   ovunque: query di `jutrack://pair?…` e fragment di `https://…/j#…` hanno la stessa grammatica, e
   tenerne due significherebbe lasciare che una diventi più permissiva dell'altra senza accorgersene.
   `parsePairingUri` resta come caso particolare, con i suoi test.
3. **La rotta `/join` legge il link grezzo, non i parametri di expo-router.** Il router instrada sul
   percorso e trasforma la query in parametri, ma il fragment non è né l'uno né l'altra: si legge
   con `Linking.useLinkingURL()`. È il punto in cui questo step poteva fallire in silenzio.

Il resoconto è nel [devlog](devlog.md). Sotto, il piano com'era stato scritto.

**Formato**

```
https://jutrack-relay.jutrack-relayfrfal.workers.dev/j#v=1&k=<base64url>&n=<nome>&e=<epoch>
                                                      ▲
                                    fragment: mai inviato al server
```

La chiave sta nel **fragment**, che i browser non trasmettono: non finisce nei log di Cloudflare, né
nelle anteprime dei link generate dalle chat. Il relay continua a non poter leggere nulla.

In `packages/core/src/pairing/uri.ts`: `createInviteLink(key, { name, now, ttlMs })` e un
`parseInvite(uri, now)` che accetta **tre** forme — `https://…/j#…`, `jutrack://join#…` e il vecchio
`jutrack://pair?…` per i QR già generati. Restano valide le regole già scritte: prima occorrenza di
ogni parametro vince, tolleranza di un minuto sugli orologi, esito tipizzato senza `throw`.

**Pagina di atterraggio nel Worker.** `GET /j` in `services/relay/src/index.ts` → HTML statico e
autoconsistente che legge `location.hash` in JS e costruisce un bottone verso `jutrack://join#…`.
Vincoli da coprire con un test: la pagina **non deve mai rimandare il fragment al server** (nessun
fetch, form o redirect che lo propaghi), nessuna risorsa esterna, `Referrer-Policy: no-referrer`, e
`/j` non deve istanziare alcun Durable Object.

**Condivisione e ingresso**

- La schermata invito usa `Share.share({ message: link })` — API core di React Native, **già presente
  nella build installata**, a differenza di `expo-sharing` che manca. Sotto, ripiegati, restano il QR
  esistente e l'incolla manuale: servono ancora quando i due telefoni sono uno di fronte all'altro e
  non si vuole far passare l'invito da una chat.
- Nuova rotta `/join` per `jutrack://join#…`; `/pair` resta per i QR in circolazione.
- La conferma **aggiunge** un gruppo invece di sostituirlo: sparisce l'avviso «lascerai il vault X»
  (`apps/mobile/src/features/pairing/useAdoptPairing.ts:70-77`). Se il gruppo c'è già ci si entra,
  invece di dare errore (`useAdoptPairing.ts:59-62`).
- Entrando, il profilo si scrive fra i membri (Step 11): l'altra persona ti vede comparire da sola.

**La UI deve dichiarare che chiunque abbia il link entra nel gruppo.** Va aggiornato
[threat-model.md](threat-model.md): un link inoltrabile in chat cambia il modello di minaccia
rispetto a un QR mostrato a schermo per cinque minuti, non solo il trasporto. La scadenza resta
quello che era già dichiarata di essere — una cortesia, non una difesa.

_Verifica:_ il link generato su A, mandato in chat e aperto su B, fa entrare B nel gruppo **senza**
fargli perdere i gruppi che aveva già. Un test verifica che `/j` non tocchi il Durable Object.

### Step 14 — Uscire da un gruppo, rigenerare

- **«Esci dal gruppo»**: cancella la chiave da SecureStore, elimina `y_updates_<vaultId>` e le righe
  di sync di quel vault, rimuove la voce dal registro. Con conferma esplicita — senza backup della
  chiave i dati di quel gruppo diventano irrecuperabili da questo telefono.
- Opzione **«elimina anche dal relay»**: `DELETE /v1/vault/:id/vault` esiste già
  (`services/relay/src/index.ts:11`).

**Uscire tu non caccia l'altro, e l'interfaccia deve dirlo.** Chi ha la chiave continua a leggere:
non esiste revoca in un sistema dove la chiave _è_ il diritto di accesso. Per escludere davvero
qualcuno serve **rigenerare il gruppo** — nuovo vault, copia dello stato (`Y.encodeStateAsUpdate` →
`Y.applyUpdate` su un documento nuovo), nuovo invito a chi resta. Sono poche righe, data la
struttura, ma è l'ultima cosa da fare: prima va provato tutto il resto.

_Verifica:_ uscendo da un gruppo su un telefono, l'altro non ne risente e continua a sincronizzare.

---

## Criterio di «fatto» end-to-end

Il piano v2 è riuscito quando, su due telefoni fisici:

1. Ciascuno ha il proprio profilo, e in un gruppo condiviso compaiono **due** membri — non quattro,
   non uno.
2. Una spesa divisa a metà produce lo **stesso saldo** sui due telefoni, e coincide col calcolo a
   mano. È il numero che oggi è sbagliato.
3. Una spesa creata su A compare su B in **2-3 secondi**, e una creata su B compare su A nello stesso
   tempo. Entrambe le direzioni, che è ciò che oggi non funziona.
4. Un invito mandato in chat fa entrare l'altra persona in un gruppo **senza** farle perdere i gruppi
   che aveva già, e senza riavviare l'app.
5. Due gruppi sullo stesso telefono tengono le spese separate, e si passa dall'uno all'altro senza
   riavvio.
6. Un telefono in aereo che registra spese le invia al rientro in foreground, **senza attendere il
   backoff**.
7. Uscendo da un gruppo, l'altro telefono non ne risente.

Restano da confermare anche i punti mai verificati su hardware elencati in
[STATO.md](STATO.md#cosa-non-è-ancora-stato-verificato-su-hardware-reale), in particolare che
`expo-sqlite` persista fra due riavvii dell'app.

---

## Rischi noti

| Rischio                                                                       | Mitigazione                                                                                                                       |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ~~`setPending` senza `WHERE` cancella la coda offline dell'altro gruppo~~     | **Chiuso allo Step 12**: colonna `vault_id` ovunque, e un test su SQLite vero — con un finto motore sarebbe passato comunque      |
| Un link di invito inoltrato resta valido per sempre                           | Chiave nel fragment, scadenza nell'URI, avviso esplicito nella UI, threat model aggiornato. Revoca = rigenerazione                |
| Poll a 3 s che moltiplica le richieste                                        | Solo in finestra attiva e in foreground; a riposo 30 s, in background sospeso. Due ordini sotto il limite free                    |
| ~~Il ripristino del backup su un telefono nuovo ricrea il bug dei duplicati~~ | **Chiuso allo Step 12**: `groups.my_member_id`, e la domanda posta **prima** di scrivere il membro — i membri non hanno tombstone |
| Cambiare gruppo a runtime lascia engine o persistenza appesi                  | Lo smontaggio passa da `engine.stop()` e `persistence.destroy()`, già esistenti; test sul ciclo monta/smonta                      |
| Il log del relay cresce: la compattazione server documentata non esiste       | `docs/architecture.md` la promette ma non c'è codice che la faccia. Per ora regge il TTL di 30 giorni                             |

---

## Fuori perimetro

- **Auth di Google** — escluso, con il seam `identity` lasciato aperto nel profilo.
- **WebSocket sul Durable Object** — la Hibernation API porterebbe la latenza sotto il secondo ed è
  gratuita sul piano free, ma si valuta **dopo** aver misurato i 2-3 secondi del polling.
- **Membri ospite** (dividere una spesa con chi non ha l'app) — non previsti.
- **App Links veri** (il link `https://` che apre l'app senza passare dalla pagina) — richiedono
  `intentFilters` in `app.json` e `assetlinks.json` col fingerprint del keystore EAS, quindi una
  nuova build Android.
- **Nuove build EAS** — nessuna: `AppState` e `Share` sono API core di React Native, già presenti
  nella development build installata.
- **Compattazione lato relay** — resta il TTL di 30 giorni.
