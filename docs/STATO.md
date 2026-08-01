# Stato del progetto — punto di partenza

Aggiornato: 2026-08-01, fine Step 6.

Documento di orientamento: cosa è fatto, cosa manca, cosa è bloccato. Per il dettaglio di ogni
passaggio c'è [devlog.md](devlog.md), ma **questo file basta per riprendere il lavoro**.

## Avanzamento

| Step                              | Stato           | Cosa contiene                                           |
| --------------------------------- | --------------- | ------------------------------------------------------- |
| 0 — Repo e documentazione         | ✅              | Monorepo npm workspaces, toolchain, ADR, threat model   |
| 1 — Scheletro Expo                | ✅              | SDK 57, expo-router, tema chiaro/scuro, componenti base |
| 2 — Crypto                        | ✅              | HKDF, XChaCha20-Poly1305, backup con passphrase         |
| 3 — Modello Yjs e persistenza     | ✅              | VaultStore, SQLite, convergenza CRDT verificata         |
| 4 — UI spese e categorie          | ✅              | Lista, form, categorie, persone — funzionante offline   |
| 5 — Relay Cloudflare              | ✅              | **In produzione**, verificato end-to-end                |
| 6 — Motore di sincronizzazione    | ✅              | Push/pull cifrato, coda offline, recupero via snapshot  |
| **7 — Pairing via QR**            | ⏭️ **prossimo** | Come il secondo telefono riceve la chiave               |
| 8 — Split, saldo, budget, grafici | ⬜              |                                                         |
| 9 — CI, export, build, doc finale | ⬜              |                                                         |

**277 test verdi** (215 core + 27 app + 35 relay), typecheck e lint puliti.

## Riferimenti operativi

- Repo: https://github.com/FRFAL99/JuTrack (privato)
- Relay in produzione: **https://jutrack-relay.jutrack-relayfrfal.workers.dev**
- Account Cloudflare: `francesco.fallavena@gmail.com`, già autenticato in `wrangler`

```bash
npm run typecheck && npm test && npm run lint    # verifica completa
cd services/relay && npm run e2e                 # prova cifrata contro il relay
cd apps/mobile && npx expo export --platform android   # il bundle regge?
```

`expo export` va eseguito a ogni step: ha già intercettato una trappola che né typecheck né test
vedevano.

## Bloccante aperto: l'app non parte sul telefono

**La causa è esterna al codice.** Prove e ragionamento completi in
[troubleshooting-avvio-app.md](troubleshooting-avvio-app.md).

Il dato decisivo: `curl http://localhost:8081/json/list` è **sempre** rimasto vuoto. Quell'endpoint
elenca i motori JavaScript collegati a Metro — il telefono non ha mai eseguito una riga del nostro
codice. Escluso con prove il codice (app ridotta a solo React Native: crasha comunque), la
compilazione, il bytecode Hermes e la rete (tunnel pubblico verificato dall'esterno).

Restano due spiegazioni, entrambe fuori dal progetto: l'Expo Go installato non è realmente SDK 57
(Android rifiuta in silenzio l'installazione se le firme confliggono), oppure Expo Go crasha su
quel dispositivo.

**Prossimo tentativo — development build, già configurata:**

```bash
cd apps/mobile
npx eas login
npx eas build --platform android --profile development
```

Build nel cloud (non serve l'SDK Android in locale), produce un APK autonomo che aggira Expo Go.
Una volta installato, la prima cosa da aprire è **Impostazioni → Diagnostica**: carica un
sottosistema alla volta e mostra dove si interrompe.

## Cosa non è ancora stato verificato su hardware reale

Va detto con precisione, perché è la differenza fra «testato» e «funzionante»:

- Che il crypto giri su **Hermes** — coperto da `hermes-compat.test.ts`, che rimuove i global assenti
  su Hermes, ma mai eseguito su un telefono
- Che `expo-sqlite` persista fra due riavvii dell'app
- Il ciclo di sync completo **fra due telefoni fisici**
- Il costo di `scrypt` con `logN = 16` su mobile (default da calibrare, in
  `packages/core/src/crypto/backup.ts`)

Tutto il resto è verificato: 277 test, convergenza CRDT, relay reale in produzione.

## Trappole già risolte — da non riscoprire

| Trappola                                                                    | Soluzione adottata                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `TextEncoder` non esiste su Hermes                                          | UTF-8 scritta in `crypto/encoding.ts`; vietato l'import da noble |
| Yjs non fa il bundle su RN (`lib0` → `isomorphic-webcrypto`, fermo al 2022) | Alias in `metro.config.js` verso uno shim su `expo-crypto`       |
| `storage.deleteAll()` su Durable Object SQLite cancella anche le tabelle    | `ensureSchema()` subito dopo, con test di regressione            |
| Un blob corrotto blocca **tutti** gli update successivi di quel device      | Ripubblicazione dello stato completo al rilevamento              |
| TypeScript bloccato a 6.x                                                   | `typescript-eslint` dichiara peer `typescript <6.1.0`            |
| Nella flat config ESLint vince l'ultima regola                              | Gli override vanno **dopo** il blocco generale                   |
| Metro annunciava `127.0.0.1` come host del bundle                           | `REACT_NATIVE_PACKAGER_HOSTNAME=<ip-lan>`                        |

## Step 7 — cosa serve

Il secondo telefono deve ricevere la **stessa** chiave del vault: generarne una propria creerebbe due
vault separati che non si sincronizzerebbero mai.

- QR con `jutrack://pair?v=1&k=<chiave base64url>` — il `vaultId` **non** serve, viene derivato
- Scansione con `expo-camera`, poi `adoptVaultKey()` (già implementata in `src/state/vault-key.ts`)
- Scadenza breve e conferma esplicita prima di mostrare il QR

**Il QR contiene la chiave in chiaro: chi lo fotografa entra nel vault.** È un rischio accettato e
documentato nel threat model — l'interfaccia deve dirlo, non nasconderlo. Un protocollo autenticato
(SAS/PAKE) lo eliminerebbe, ed è tracciato fra i miglioramenti futuri.
