# JuTrack

Tracciamento di spese condivise per due persone: **local-first**, **cifrato end-to-end**, senza un
servizio cloud che veda i tuoi dati finanziari.

I dati vivono sui telefoni. Il server è un puro corriere di blob cifrati: non ha la chiave e non può
leggere nulla, nemmeno se compromesso.

## Architettura

```
  Telefono A (Expo)                              Telefono B (Expo)
  ┌───────────────────────┐                      ┌───────────────────────┐
  │ UI React Native       │                      │ UI React Native       │
  │   ↕ hooks             │                      │                       │
  │ Y.Doc  (in memoria)   │  ← sorgente di       │ Y.Doc                 │
  │   ↕                   │    verità per la UI  │                       │
  │ SqliteYPersistence    │  ← durabilità        │ SqliteYPersistence    │
  │   ↕                   │                      │                       │
  │ SyncEngine            │                      │ SyncEngine            │
  │   ↕ cifra/decifra     │                      │                       │
  │ vaultKey (SecureStore)│                      │ vaultKey              │
  └───────────┬───────────┘                      └───────────┬───────────┘
              │  blob cifrati (il relay non ha la chiave)    │
              └──────────────────────┬───────────────────────┘
                                     ▼
                    ┌────────────────────────────────────┐
                    │ Cloudflare Worker  (routing/auth)   │
                    │        ↓                            │
                    │ Durable Object per vaultId          │
                    │   SQLite: log append-only di blob   │
                    │   opachi, numerati per seq          │
                    └────────────────────────────────────┘
```

Dettagli in [docs/architecture.md](docs/architecture.md).

## Scelte tecniche

| Ambito             | Scelta                                 | Perché                                                                                  |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------- |
| App                | React Native + Expo                    | Un solo codebase Android/iOS                                                            |
| Storage locale     | `expo-sqlite`                          | Durabilità del log di update Yjs                                                        |
| Merge dei dati     | **Yjs** (CRDT)                         | JS puro: gira in RN senza moduli nativi. Automerge richiede WASM, che Hermes non esegue |
| Cifratura          | XChaCha20-Poly1305 (`@noble/ciphers`)  | AEAD moderno, JS puro, libreria auditata                                                |
| Derivazione chiavi | HKDF-SHA256 + scrypt (`@noble/hashes`) | scrypt e non Argon2: in JS Argon2 è lento per assenza di `Uint64Array` veloce           |
| Relay              | Cloudflare Workers + Durable Objects   | Disponibili sul free tier con backend SQLite                                            |

Le decisioni non ovvie sono registrate come ADR in [docs/adr/](docs/adr/).

## Struttura

```
apps/mobile/       App Expo (UI, navigazione, schermate)
packages/core/     Crypto, schema Yjs, sync client — zero import da react-native
services/relay/    Cloudflare Worker + Durable Object
docs/              Architettura, ADR, threat model, devlog
```

`packages/core` non importa nulla di React Native: le primitive specifiche di piattaforma entrano per
dependency injection. È la condizione che rende quasi gratuito un futuro client web.

## Setup

```bash
npm install
npm run format:check && npm run lint && npm run typecheck && npm test
```

Sono gli stessi passaggi che gira la CI (`.github/workflows/ci.yml`) a ogni push, seguiti da
`expo export --platform android` — l'unico controllo che risolve il grafo dei moduli con Metro, e
quindi l'unico che vede i problemi di bundling su React Native.

### Provare l'app sul telefono

```bash
cd apps/mobile && npm start
```

Poi si scansiona il QR con Expo Go.

> **Expo Go e SDK 57.** L'SDK 57 è uscito il 30 giugno 2026 e la build di Expo Go corrispondente è
> ancora in attesa di approvazione sugli store. La versione presente sul Play Store è precedente e
> rifiuta il progetto con `incompatible SDK version`.
>
> Soluzione: installare l'APK ufficiale da
> [expo.dev/go (SDK 57, Android)](https://expo.dev/go?sdkVersion=57&platform=android&device=true).
> Se l'installazione fallisce per un errore di firma, disinstallare prima l'Expo Go dello store: le
> due build usano chiavi diverse.
>
> **Attenzione:** i dati dell'app vivono nella sandbox di Expo Go. Disinstallarlo cancella anche il
> database SQLite di JuTrack — da ricordare quando si verifica la persistenza fra riavvii.

## Stato

In sviluppo. **Punto di partenza: [docs/STATO.md](docs/STATO.md)** — cosa è fatto, cosa manca, cosa è
bloccato. Il dettaglio cronologico è in [docs/devlog.md](docs/devlog.md).

Relay in produzione: https://jutrack-relay.jutrack-relayfrfal.workers.dev

## I tuoi dati escono quando vuoi

Nessun lock-in. Da Impostazioni → «Esporta i dati»:

- **CSV** delle spese e dei pareggi: si apre in Excel, Fogli Google o un notebook Python. Ogni
  importo compare due volte, in euro e in centesimi interi — la seconda colonna è quella che nessun
  locale può fraintendere.
- **JSON** integrale del vault: spese, categorie, persone, budget, pareggi, tombstone compresi. È il
  formato da conservare; il CSV, per come è fatto, perde struttura.

Entrambi escono **in chiaro**: la cifratura protegge ciò che passa dal relay, non ciò che mandi a
qualcun altro. Nessuno dei due contiene la chiave del vault.

## Sicurezza

Se perdi la chiave del vault, **i dati non sono recuperabili**: non esiste un reset lato server, è il
prezzo della cifratura end-to-end. Fai il backup della chiave — Impostazioni → «Backup della chiave»
produce un file cifrato con una passphrase che scegli tu. Serve sia il file sia la passphrase:
nessuno dei due, da solo, basta.

Modello di minaccia, garanzie e limiti reali: [docs/threat-model.md](docs/threat-model.md).

## Licenza

MIT
