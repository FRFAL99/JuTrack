# Stato del progetto — punto di partenza

Aggiornato: 2026-08-01, fine Step 7.

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
| 7 — Pairing via QR                | ✅              | QR, scanner, incolla manuale, deep link `jutrack://pair` |
| 8 — Split, saldo, budget, grafici | ✅              | Saldo, pareggi, budget mensili, barre per categoria e mese |
| **9 — CI, export, build, doc finale** | ⏭️ **prossimo** | GitHub Actions, export dei dati, build di rilascio   |

**371 test verdi** (289 core + 47 app + 35 relay), typecheck e lint puliti.

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
- Il **pairing end-to-end**: che il QR mostrato da un telefono venga davvero letto dall'altro, e che
  la fotocamera funzioni sulla build. La logica è coperta dai test, l'ottica no
- Il costo di `scrypt` con `logN = 16` su mobile (default da calibrare, in
  `packages/core/src/crypto/backup.ts`)
- **Nessuna schermata dello Step 8** è mai stata toccata con un dito: i calcoli sono coperti dai
  test, la resa dei grafici su uno schermo vero no

Tutto il resto è verificato: 371 test, convergenza CRDT, relay reale in produzione.

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
| expo-router importa **tutte** le route al boot: un modulo nativo rotto uccide l'app intera | `expo-camera` caricato con `require` in `try/catch` |

## Com'è fatto il pairing (Step 7)

Tre strade portano alla stessa conferma, in `useAdoptPairing`:

1. **Scanner interno** — Impostazioni → «Ho già un vault sull'altro telefono»
2. **Lettore QR di sistema** — apre `jutrack://pair?…`, raccolto dalla rotta `/pair`
3. **Incolla il codice** — sempre disponibile, unica via se la fotocamera non c'è

L'URI trasporta **solo la chiave** (`jutrack://pair?v=1&k=<base64url>&e=<scadenza>`): `vaultId`,
`contentKey` e `authKey` sono derivate. Dopo `adoptVaultKey()` serve un **riavvio dell'app**: il
motore di sync viene costruito all'avvio con le chiavi di allora.

**Il QR contiene la chiave in chiaro: chi lo fotografa entra nel vault.** Rischio accettato e
documentato nel threat model — l'interfaccia lo dichiara. La scadenza di cinque minuti è una
cortesia, non una difesa: sta dentro l'URI, quindi è rimovibile. Un protocollo autenticato
(SAS/PAKE) risolverebbe, ed è fra i miglioramenti futuri.

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

## Step 9 — cosa serve

- CI su GitHub Actions: typecheck, test, lint e `expo export` a ogni push
- Export dei dati (CSV o JSON) e backup della chiave, che ha già le primitive in
  `crypto/backup.ts` ma nessuna interfaccia
- Build di rilascio e documentazione finale
- **Prima di tutto questo, però, resta il bloccante**: l'app non è mai stata eseguita su un telefono
