# Devlog

Registro cronologico dell'avanzamento. Entry in ordine cronologico inverso (più recente in alto).

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
