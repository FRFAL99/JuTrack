# Devlog

Registro cronologico dell'avanzamento. Entry in ordine cronologico inverso (più recente in alto).

---

## 2026-08-01 — Step 4: UI spese e categorie (offline)

**Fatto**

`VaultProvider` apre il database, ricostruisce il `Y.Doc` e lo espone all'app. Lista spese
raggruppata per giorno con totali, form di creazione e modifica, eliminazione con conferma,
gestione categorie, gestione persone. Categorie di default create al primo avvio.

**Decisioni prese**

- **Il rendering è bloccato finché il vault non è caricato.** Senza, la lista comparirebbe vuota per
  un istante prima di popolarsi — e in caso di errore sembrerebbe un vault senza dati, nascondendo
  il guasto. Ora un errore di apertura del database si vede, con il messaggio selezionabile.
- **Le categorie si archiviano, non si cancellano.** Le spese passate continuano a riferirle e
  resterebbero orfane. La conferma dice quante spese usano quella categoria e che restano invariate.
- **Il seed controlla se esiste già qualcosa.** Senza, ogni avvio aggiungerebbe un set di categorie
  e dopo il sync i due dispositivi ne avrebbero il doppio.
- **L'errore sull'importo compare solo dopo il primo tentativo di invio**, non mentre si digita la
  prima cifra.
- **Anteprima delle quote nel form** («5,00 € / 5,01 € a testa» quando l'importo è dispari): mostrare
  la differenza di un centesimo evita che sembri un errore di calcolo.
- La schermata di modifica gestisce il caso in cui la spesa **non esiste più**: può succedere
  davvero, se l'altro dispositivo l'ha cancellata mentre la schermata era aperta.

**Reattività: la trappola di `useSyncExternalStore`**

`getSnapshot` deve restituire un valore **stabile** fra un cambiamento e l'altro. Restituire
direttamente la lista delle spese darebbe un array nuovo a ogni chiamata, che React interpreta come
"cambiato": ciclo di render infinito. Si restituisce quindi un contatore di versione, e le liste si
derivano con `useMemo`.

Il contatore vive nel `VaultProvider` e non in un hook: l'observer sul documento va registrato una
volta sola. La prima stesura lo registrava dentro `getSnapshot`, che React chiama in fase di render —
un effetto collaterale nel render, riscritto prima di committare.

`exhaustive-deps` segnalava `version` come dipendenza inutile, perché non compare nel corpo del memo.
Ma è l'unica cosa che rende reattivo il calcolo: le liste si leggono da un `Y.Doc` mutabile, la cui
identità non cambia mai. Risolto con una funzione `dependsOnDocument(version)` che la legge
esplicitamente, invece di disabilitare la regola — così il motivo resta scritto nel codice.

**Trappola di fuso orario nelle date**

`todayIso` costruisce la data dai componenti **locali**, non da `toISOString()`. Quest'ultimo
converte in UTC: alle 23:30 in Italia restituirebbe già il giorno successivo, e una spesa registrata
la sera comparirebbe sotto «domani». C'è un test dedicato. `formatDayTitle` costruisce le date a
mezzogiorno per la stessa ragione: a mezzanotte l'ora legale può spostare il giorno.

**Verifica:** typecheck pulito, 187 test verdi (172 core + 15 app), lint pulito senza warning,
bundle Android da 1354 moduli.

**Non ancora verificato: l'esecuzione su Hermes**

In questo ambiente non c'è un SDK Android né un emulatore, quindi l'app non è mai stata _eseguita_.
Il bundle si risolve, ma il bundle non è l'esecuzione. **Va provata sul telefono** con `npm start`
in `apps/mobile` e la scansione del QR con Expo Go. Le cose da confermare: che noble giri su Hermes,
che `expo-sqlite` persista davvero fra due avvii, e quanto impiega `scrypt` con `logN = 16`.

**Prossimo:** Step 5 — relay Cloudflare.

---

## 2026-08-01 — Step 3: modello dati Yjs e persistenza SQLite

**Fatto**

`packages/core/src/model/`: `money` (centesimi interi, parsing e split), `types`, `ids`, `doc`
(accessori tipati sulle `Y.Map`), `store` (API applicativa con le invarianti).
`packages/core/src/persistence/`: `y-sqlite` (log append-only con compattazione), `memory-db`
(implementazione in memoria per i test). `apps/mobile/src/platform/`: adattatori expo-sqlite,
expo-crypto, expo-secure-store.

**Decisioni prese**

- **`split` memorizzato come valore unico, non come `Y.Map` annidata.** Tutto il resto del record è
  a merge per-campo, ma `mode` e `shares` devono restare coerenti fra loro: una fusione campo per
  campo potrebbe combinare il `mode` di un dispositivo con le `shares` dell'altro, producendo quote
  che non sommano al totale — cioè un saldo sbagliato che nessuno dei due utenti ha chiesto.
  Trattandolo come unità atomica, in caso di conflitto vince uno dei due split per intero e
  l'invariante regge. C'è un test dedicato.
- **Resto dei centesimi distribuito in modo deterministico** (metodo dei maggiori resti, a parità di
  resto vince l'indice più basso). Deterministico e non casuale perché i due dispositivi devono
  calcolare la stessa suddivisione senza consultarsi.
- **`updateExpense` rifiuta un cambio di importo che lascerebbe lo split incoerente.** Portare una
  spesa da 10 a 20 euro lasciando le quote a 5+5 falserebbe il saldo in silenzio.
- **Ordinamento con criterio finale sull'id**: senza, due spese create nello stesso istante
  comparirebbero in ordine diverso sui due telefoni.

**Un bug vero, trovato dai test: `destroy()` perdeva le scritture in coda**

`destroy()` impostava `this.destroyed = true` in modo sincrono e _poi_ attendeva il flush. Ma gli
update Yjs arrivano sincroni e vengono accodati come microtask: quando quei microtask partivano
trovavano il flag già alzato e uscivano subito. Risultato: **ogni scrittura non ancora eseguita
andava persa**, cioè l'app avrebbe perso i dati recenti a ogni chiusura pulita.

Tre test falliti, una sola causa. Corretto l'ordine: prima si smette di osservare il documento, poi
si svuota la coda, e solo alla fine si marca l'oggetto come distrutto. Il perché è ora un commento
nel codice, perché è il tipo di ordine che qualcuno "sistemerebbe" nella direzione sbagliata.

**Trappola risolta: Yjs non fa il bundle su React Native senza intervento**

Yjs genera il clientID con `lib0/random`, che importa `getRandomValues` da `lib0/webcrypto`. Sotto
la condizione `react-native` l'export map di lib0 punta a un file che richiede
**`isomorphic-webcrypto`, fermo al 2022**: il bundle non si risolve.

Non installato — sarebbe una dipendenza abbandonata da quattro anni sul percorso dell'integrità dei
dati, la stessa ragione per cui avevamo scartato `y-expo-sqlite`. `metro.config.js` reindirizza a uno
shim su `expo-crypto`. Verificate le firme: lib0 chiama `getRandomValues(new Uint32Array(1))` ed
expo-crypto accetta qualunque TypedArray, riempiendolo in place.

Trovato dal bundler, non dal typecheck né dai test: è la conferma che `expo export` va eseguito a
ogni step e non solo alla fine.

**Verificato, non assunto**

- **I due dispositivi convergono davvero.** 7 test dedicati riproducono lo scenario che giustifica
  l'architettura: spese create offline su entrambi si uniscono senza perdite; modifiche a campi
  diversi si fondono; modifiche allo stesso campo convergono su un valore identico su entrambi; una
  cancellazione non viene annullata da una modifica concorrente; gli update sono commutativi
  (applicati in ordine inverso danno lo stesso stato) e idempotenti (applicarli due volte non
  duplica).
- **La persistenza sopravvive a una compattazione interrotta a metà.** L'ordine INSERT → DELETE è
  deliberato: se il processo muore fra le due, restano vecchi update _più_ lo snapshot, e
  l'idempotenza di Yjs rende il risultato corretto. L'ordine inverso svuoterebbe la tabella.
- `expo-sqlite` gestisce i BLOB come `Uint8Array` in entrambe le direzioni: nessuna conversione.
  Rimosso il cast su `SQLiteBindValue`, che poteva mascherare una futura incompatibilità.
- `expo-crypto` **non** installa un polyfill globale di `crypto.getRandomValues`: conferma che la
  dependency injection nel core era la scelta giusta.

**Verifica:** typecheck pulito su 3 workspace, 172/172 test verdi, lint pulito, bundle Android
risolto (1305 moduli).

**Ancora da verificare sul dispositivo:** che l'insieme giri su Hermes. Il bundle non è l'esecuzione.
Verifica allo Step 4.

**Prossimo:** Step 4 — UI spese e categorie, con la prima prova reale sul telefono.

---

## 2026-08-01 — Step 2: layer crypto

**Fatto**

`packages/core/src/crypto/`: `encoding` (base64url senza Buffer né atob), `types` (interfacce
`RandomSource` e `SecureKeyStore` iniettate dalla piattaforma), `keys` (generazione e derivazione),
`seal` (cifratura dei blob di sync), `backup` (export/import protetto da passphrase).

**Decisioni prese**

- **`vaultId` derivato dalla chiave**, non generato a parte:
  `HKDF(vaultKey, "jutrack/vault-id/v1", 16)`. Il QR di pairing trasporta così solo la chiave, e non
  esiste un identificatore da tenere sincronizzato fra i dispositivi.
- **Byte di versione in testa a entrambi i formati binari.** Permette di cambiare cifrario in futuro:
  un client vecchio rifiuta esplicitamente un blob nuovo invece di decifrare spazzatura.
- **AAD = versione ‖ vaultId** sui blob di sync. Un relay ostile che travasi blob fra vault ottiene
  solo errori di autenticazione. Nel backup l'AAD include i parametri scrypt, così non si possono
  riscrivere per abbassare il costo e facilitare il brute force.
- **`scryptAsync` invece di `scrypt`.** La variante sincrona bloccherebbe il thread JS per secondi,
  congelando l'interfaccia durante export e import del backup.
- **Passphrase normalizzata NFKC.** Senza, la stessa passphrase con accenti digitata su due tastiere
  diverse (forma composta vs decomposta) fallirebbe il ripristino. Il test lo verifica con due
  stringhe realmente diverse a livello di codepoint — controllato che non fossero identiche nel
  sorgente, altrimenti il test sarebbe passato senza verificare nulla.
- **`generateVaultKey` fallisce se la `RandomSource` restituisce meno byte del richiesto.** Una
  sorgente difettosa che degrada in silenzio produrrebbe chiavi deboli senza alcun segnale.

**Il vincolo di indipendenza dalla piattaforma ora è verificato, non solo scritto**

Finora «`packages/core` non importa nulla di react-native» era una convenzione nei commenti. Ora è
una regola ESLint su `packages/core/src/**` che vieta gli import di `react-native`/`expo`/`node:*` e
i global `Buffer`, `window`, `document`, `localStorage`, `TextEncoder`, ciascuno con il messaggio che
indica l'alternativa. I test sono esclusi, perché usano `Buffer` di proposito come implementazione di
riferimento indipendente per validare la nostra base64url.

Verificato che le regole mordano davvero, scrivendo un file di prova con le violazioni: 3 errori
segnalati come atteso. Una guardia che non si verifica non è una guardia.

**Verificato, non assunto**

- `equalBytes` di `@noble/ciphers` **è a tempo costante**: accumula le differenze con XOR senza
  uscita anticipata. Letto il sorgente prima di usarla per confrontare token.
- `@noble/hashes` espone **`scryptAsync`**, che cede il controllo periodicamente.
- Il crypto **entra nel bundle React Native**: `expo export` passa da 1237 a 1254 moduli.
- 67 test, di cui buona parte verifica direttamente le garanzie del threat model: rifiuto di
  ciphertext manomesso, di AAD errata, di blob destinati ad altri vault, e il fatto che `authKey`
  (che il relay conosce) **non** riesce a decifrare i contenuti.

**Ancora da verificare sul dispositivo**

Il bundle non è l'esecuzione: che noble giri correttamente su **Hermes** va confermato sul telefono.
Verifica prevista allo Step 4, quando l'app avrà schermate reali. Va calibrato anche `logN` di
scrypt: il default 16 è ~175 ms su desktop, ignoto su telefono.

**Verifica:** typecheck pulito su 3 workspace, 67/67 test verdi, lint pulito, bundle Android OK.

**Prossimo:** Step 3 — modello dati Yjs e persistenza SQLite.

---

## 2026-08-01 — Step 1: scheletro app Expo

**Fatto**

- `apps/mobile` con Expo SDK 57 (React Native 0.86.2, React 19.2.3) ed expo-router.
- Navigazione a tab: Spese · Statistiche · Impostazioni, con route in `src/app/(tabs)/`.
- Design token in `src/theme/tokens.ts` con palette **semantica** (`expense`, `income`, `danger`)
  invece che cromatica: i nomi dicono a cosa serve il colore, così cambiare palette non impone di
  riscrivere le schermate. Tema chiaro e scuro, seguendo l'impostazione di sistema.
- Componenti base: `Button`, `Card`, `Screen`, `EmptyState`.
- `eslint-plugin-react-hooks` limitato ad `apps/**`: `exhaustive-deps` intercetta le dipendenze
  mancanti negli effetti, che in RN si manifestano come stato stantio difficile da diagnosticare.

**Verificato, non assunto**

- **Metro risolve e transpila `@jutrack/core`** attraverso il symlink del workspace, pur essendo
  TypeScript sorgente non compilato. Era il rischio principale dell'impianto monorepo — di norma
  Metro non transpila i package dentro `node_modules`. Provato importando `CORE_VERSION` in una
  schermata reale: il bundle passa da 1236 a 1237 moduli. Questo de-rischia gli Step 2 e 3.
- **L'app fa davvero il bundle**, non solo il typecheck: `expo export --platform android` produce
  un bundle Hermes da 2.6 MB. Il typecheck da solo non avrebbe dimostrato nulla sul grafo dei moduli.
- Dal **SDK 52 Metro auto-configura i monorepo**: nessun `metro.config.js` da scrivere e mantenere.
- Dal **SDK 56 expo-router non consente più di importare da `@react-navigation/*`**: gli import vanno
  verso `expo-router`. Vincolo da ricordare quando aggiungeremo navigazione più complessa.
- Il template Expo usa esso stesso `typescript ~6.0.3`, il che conferma indipendentemente la scelta
  fatta allo Step 0 di bloccare TS a 6.x.
- `eslint-plugin-react-hooks` v7 espone la flat config sotto `.configs.flat.recommended`;
  `.configs.recommended` è ancora in formato eslintrc ed ESLint 10 la rifiuta.

**Vulnerabilità npm: 10 moderate, non risolvibili e non rilevanti**

Causa unica: `expo → @expo/config-plugins → xcode → uuid@7` (GHSA-w5hq-g745-h8pq, bounds check
mancante nei codepath v3/v5/v6 di `uuid`). `xcode` manipola i progetti iOS durante il prebuild:
è tooling di build, **non finisce nel bundle runtime**.

npm suggerisce «aggiorna expo alla major successiva», ma **la 57 è l'ultima esistente**: il fix
proposto non è applicabile. Nessuna azione: rivalutare al prossimo SDK.

**Verifica:** typecheck pulito su 3 workspace, 12/12 test verdi, lint pulito, bundle Android
esportato con successo.

**Prossimo:** Step 2 — layer crypto in `packages/core`.

---

## 2026-08-01 — Step 0: repo, workspace e documentazione

**Fatto**

- `git init` e struttura monorepo con npm workspaces: `apps/`, `packages/`, `services/`, `docs/`.
- Toolchain condivisa: TypeScript 5.7 in modalità strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), ESLint 9 flat config, Prettier.
- Documentazione iniziale: `README.md`, `docs/architecture.md`, `docs/threat-model.md` e due ADR.
- Repo GitHub privato `FRFAL99/JuTrack`.

**Decisioni prese**

- **Yjs invece di Automerge** (ADR 0001). Automerge gira su WebAssembly e Hermes non lo esegue senza
  un binding nativo custom: sarebbe stata una dipendenza nativa fatta in casa sul componente da cui
  dipende l'integrità dei dati. Yjs è JS puro.
- **Y.Doc in memoria come sorgente di verità per la UI** (ADR 0002), con SQLite come solo livello di
  durabilità. Evita la doppia sorgente di verità. Reversibile senza toccare modello dati né sync.
- **Chiave del vault casuale, non derivata da passphrase.** Derivarla da una passphrase avrebbe reso
  la sicurezza dell'intero vault pari alla robustezza di una stringa scelta da un umano. La
  passphrase serve solo a cifrare il backup esportabile.
- **Due chiavi derivate separate** con HKDF: `contentKey` (cifratura, mai vista dal relay) e
  `authKey` (appartenenza al vault, vista dal relay ma a senso unico).

**Verificato, non assunto**

- I Durable Objects **sono** disponibili sul piano Workers Free, con backend SQLite obbligatorio:
  100k richieste/giorno, 5 GB storage, 100k righe scritte/giorno. Per due utenti sono due ordini di
  grandezza di margine.
- `y-expo-sqlite` esiste ma è un fork con 2 commit e nessuna garanzia di manutenzione. **Non
  adottato**: il provider di persistenza è ~60 righe e ci serve comunque customizzato per il cursore
  di sync. Nessuna dipendenza non manutenuta sul percorso critico.
- `@noble/hashes` sconsiglia Argon2 in JavaScript (manca un `Uint64Array` veloce) e raccomanda
  scrypt. Adottato scrypt.

**Toolchain: vincoli emersi installando**

- Le versioni correnti sono TypeScript 7, ESLint 10, vitest 4, wrangler 4. Ma
  **typescript-eslint 8.x dichiara peer `typescript <6.1.0`**: TS 7 (il port in Go) romperebbe il
  linting. Bloccato TS a `^6.0.3`, la più recente compatibile. Annotato in `package.json`.
- Con le versioni iniziali `npm audit` riportava 10 vulnerabilità (1 critica in vitest 2.x, alta in
  wrangler 3.x). Dopo l'allineamento alle correnti: **0 vulnerabilità**.
- `eslint.config.js` → `.mjs` per eliminare il warning `MODULE_TYPELESS_PACKAGE_JSON` senza mettere
  `"type": "module"` nella root (che avrebbe interferito con la toolchain Expo allo Step 1).

**API di @noble 2.x — verificata, non assunta**

Sondate le primitive prima di costruirci sopra. Una differenza rispetto alla 1.x:
`hkdf(...)` richiede che `info` sia `Uint8Array`; le stringhe ora sollevano `TypeError`.

Verificato funzionante: separazione di dominio HKDF, round-trip XChaCha20-Poly1305, rifiuto di
ciphertext manomesso di 1 bit, **rifiuto di AAD errata** (è ciò che lega ogni blob al proprio
vault), rifiuto di chiave errata. Il tutto congelato in `packages/core/src/crypto/primitives.test.ts`:
12 test che fanno da guardia di regressione sugli upgrade di libreria.

`scrypt` con N=2^17 impiega ~350 ms su desktop. Sul telefono sarà diversi secondi: i parametri vanno
calibrati sul dispositivo allo Step 2. Serve solo per export/import del backup, non nel flusso
quotidiano, quindi qualche secondo è accettabile.

**Nota su `packages/core`:** niente `TextEncoder` — richiederebbe il lib `DOM` in TypeScript, che
porterebbe `window` e `localStorage` in un package che deve restare indipendente dalla piattaforma.
Si usa `utf8ToBytes` di `@noble/hashes/utils.js`, già dipendenza.

**Verifica:** `npm run typecheck` pulito, `npm test` 12/12 verdi, `npm run lint` pulito,
`npm audit` 0 vulnerabilità.

**Prossimo:** Step 1 — scheletro dell'app Expo con navigazione a tab.
