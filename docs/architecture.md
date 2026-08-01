# Architettura

## Obiettivo

Due persone registrano spese condivise su due telefoni. I dispositivi si sincronizzano
automaticamente, funzionano offline e si riconciliano senza conflitti al ritorno online. Nessun
servizio di terzi può leggere i dati.

## Principio non negoziabile

Il relay riceve `(vaultId, authToken, blob)`. `blob` è `nonce ‖ ciphertext` e la chiave di cifratura
non lascia mai i dispositivi. Il server non può decifrare — non per policy, ma perché non ha il
materiale crittografico per farlo.

Ogni scelta che seguirà è subordinata a questo vincolo.

## Livelli

```
UI React Native
    ↕  hooks reattivi
Y.Doc (in memoria)         ← sorgente di verità per la UI
    ↕  ydoc.on('update')
SqliteYPersistence         ← durabilità (log di update binari)
    ↕
SyncEngine                 ← cifra in uscita, decifra in ingresso
    ↕  HTTPS
Cloudflare Worker → Durable Object per vault
```

## Gestione delle chiavi

Una sola radice: `vaultKey`, 32 byte casuali generati sul primo telefono. Da lì due chiavi derivate
con HKDF-SHA256.

| Chiave       | Derivazione                            | Uso                            | Il relay la vede?      |
| ------------ | -------------------------------------- | ------------------------------ | ---------------------- |
| `vaultKey`   | 32 byte random (CSPRNG)                | radice, in SecureStore         | **mai**                |
| `contentKey` | `HKDF(vaultKey, "jutrack/content/v1")` | cifra i blob Yjs               | **mai**                |
| `authKey`    | `HKDF(vaultKey, "jutrack/auth/v1")`    | prova di appartenenza al vault | sì, ma è a senso unico |

**Perché due chiavi derivate e non una sola.** Riusare la stessa chiave per cifrare e per autenticarsi
è un antipattern: il relay deve poter verificare che chi scrive appartiene al vault, e per farlo deve
vedere _qualcosa_. Separando i domini, quel qualcosa (`authKey`) è crittograficamente scollegato dalla
chiave che protegge i contenuti. Conoscere `authKey` non dà alcun vantaggio per risalire a
`contentKey`.

Il relay memorizza `SHA-256(authKey)` alla prima scrittura (trust-on-first-use) e poi confronta in
tempo costante.

**Perché la vaultKey non deriva da una passphrase.** Sarebbe comodo, ma renderebbe la sicurezza
dell'intero vault pari alla robustezza di una passphrase scelta da un umano. La chiave è casuale;
la passphrase (con scrypt) serve solo a cifrare un backup esportabile — recupero manuale, non uso
quotidiano.

**Il `vaultId` è derivato, non generato.** `vaultId = HKDF(vaultKey, "jutrack/vault-id/v1", 16)`,
in esadecimale. Due conseguenze utili: il QR di pairing trasporta solo la chiave (i due dispositivi
calcolano lo stesso `vaultId` da soli), e non esiste un identificatore da tenere sincronizzato. La
derivazione è a senso unico: dal `vaultId` pubblico non si risale alla chiave.

> Le etichette di dominio (`jutrack/content/v1`, `jutrack/auth/v1`, `jutrack/vault-id/v1`) sono
> **normative**. Modificarle rende illeggibili tutti i dati già cifrati e invalida i vault esistenti.

## Formati binari

Entrambi i formati iniziano con un byte di versione. Serve a poter cambiare cifrario in futuro senza
ambiguità: un client nuovo riconosce i dati vecchi, uno vecchio rifiuta esplicitamente i nuovi invece
di decifrare spazzatura.

### Blob di sync (`crypto/seal.ts`)

```
byte 0        versione dello schema (0x01)
byte 1..24    nonce (24 byte, casuale per messaggio)
byte 25..     ciphertext + tag Poly1305 (16 byte)
```

**AAD = `versione ‖ vaultId`.** Autenticata ma non cifrata. Lega il blob al proprio vault: un relay
ostile che travasi blob da un vault a un altro produce solo errori di autenticazione.

### Backup con passphrase (`crypto/backup.ts`)

92 byte, poi base64url con prefisso `JTBK1.`

```
byte 0        versione del formato (0x01)
byte 1        log2(N) di scrypt
byte 2        r di scrypt
byte 3        p di scrypt
byte 4..19    salt (16 byte)
byte 20..43   nonce (24 byte)
byte 44..91   vaultKey cifrata (32 byte + tag 16)
```

I parametri scrypt viaggiano dentro il backup, così un file esportato oggi resta importabile anche
dopo che avremo alzato il costo di default. Sono anche nella AAD: non si possono riscrivere per
abbassare il costo e rendere banale un attacco a forza bruta sulla passphrase.

Default `logN = 16` (~175 ms su desktop, qualche secondo su telefono). **Da calibrare sul
dispositivo reale.** Si usa `scryptAsync`, non la variante sincrona, per non congelare l'interfaccia
durante la derivazione.

## Modello dati (Y.Doc)

Cinque `Y.Map` top-level. Ogni record è a sua volta una `Y.Map`: due edit su campi diversi dello
stesso record si fondono invece di sovrascriversi a vicenda.

| Mappa         | Chiave                   | Valore                                                                                          |
| ------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| `expenses`    | `id`                     | `amountCents, currency, date, categoryId, note, paidBy, split, createdAt, updatedAt, deletedAt` |
| `categories`  | `id`                     | `name, icon, color, archived`                                                                   |
| `budgets`     | `<categoryId>:<YYYY-MM>` | `limitCents`                                                                                    |
| `members`     | `id`                     | `name, color`                                                                                   |
| `settlements` | `id`                     | `fromMember, toMember, amountCents, date`                                                       |

### Due regole ferree

**1. Denaro in centesimi interi.** Mai float. `12,30 €` è `1230`. I float in base 2 non rappresentano
esattamente i decimali in base 10: `0.1 + 0.2 !== 0.3`. In un'app che calcola saldi tra persone quegli
errori si accumulano e diventano discrepanze visibili — «mi devi 24,99» invece di «25,00».

**2. Cancellazione = tombstone.** Si imposta `deletedAt`, non si cancella la chiave. In un sistema
distribuito la rimozione fisica su un dispositivo non si propaga in modo affidabile: un altro
dispositivo che non ha ancora visto la cancellazione re-invierebbe il record, facendolo ricomparire.

## Protocollo di sync

Gli update Yjs sono **idempotenti e commutativi**: applicarli due volte o in ordine diverso porta allo
stesso stato. Questo elimina la necessità di un handshake stateful — bastano un log append-only e un
cursore per dispositivo.

```
POST /v1/vault/:vaultId/updates    { blobs: [base64] }     → { head: seq }
GET  /v1/vault/:vaultId/updates?since=<seq>                → { updates: [{seq, blob}], head }
```

Ciclo client:

1. `GET` da `since = cursoreLocale`
2. Decifra ogni blob e applica l'update al `Y.Doc`
3. Salva `head` come nuovo cursore
4. `POST` degli update locali non ancora inviati

Riordini e duplicati sono innocui per costruzione.

### Compattazione

Il log cresce indefinitamente. Due contromisure:

- **Snapshot:** periodicamente un client invia lo stato completo del `Y.Doc`; il relay pota gli update
  precedenti allo snapshot.
- **TTL:** il relay elimina gli update più vecchi di 30 giorni. Lo stato completo vive comunque su
  ogni telefono, quindi il relay è solo una cache di transito.

## Trade-off accettati

**La UI legge dal Y.Doc in memoria, non da tabelle SQL.** SQLite è il livello di durabilità, non di
query. Per qualche migliaio di spese è la scelta giusta e semplifica enormemente. Se il volume
crescesse, si aggiunge una proiezione su tabelle SQLite senza toccare né il modello né il sync.
Decisione tracciata in [adr/0002-ydoc-in-memory.md](adr/0002-ydoc-in-memory.md).

**Nessuna dipendenza non manutenuta sul percorso critico.** `y-expo-sqlite` esiste ma è un fork con 2
commit: il provider di persistenza è ~60 righe e ci serve comunque customizzato per il cursore di
sync, quindi lo scriviamo noi.

## Trappola: Yjs, lib0 e webcrypto su React Native

Yjs genera il clientID del documento con `lib0/random`, che importa `getRandomValues` da
`lib0/webcrypto`. Sotto la condizione `react-native`, l'export map di `lib0` punta a un file che
richiede **`isomorphic-webcrypto`**, un pacchetto fermo al 2022. Senza intervento il bundle React
Native non si risolve nemmeno.

Non lo installiamo: metterebbe una dipendenza abbandonata da quattro anni esattamente sul percorso da
cui dipende l'integrità dei dati. Al suo posto, `metro.config.js` reindirizza `lib0/webcrypto` a
[`src/platform/lib0-webcrypto-shim.js`](../apps/mobile/src/platform/lib0-webcrypto-shim.js), che
espone `getRandomValues` appoggiandosi a `expo-crypto` — mantenuto da Expo, già nostra dipendenza,
e collegato al CSPRNG di sistema.

Verificata la compatibilità delle firme: `lib0/random` chiama `getRandomValues(new Uint32Array(1))`
ed `expo-crypto` dichiara
`getRandomValues<T extends IntBasedTypedArray | UintBasedTypedArray>(typedArray: T): T`, che riempie
in place e restituisce lo stesso array.

`SubtleCrypto` non è fornita: Yjs non la usa. Lo shim espone un proxy che, se qualcuno dovesse
richiederla, solleva un errore esplicito invece di lasciare un `undefined` che esploderebbe molto
più a valle.

> **Nota:** `expo-crypto` non installa un polyfill globale di `crypto.getRandomValues`. È il motivo
> per cui `packages/core` riceve la sorgente casuale per dependency injection invece di leggerla da
> un global che su React Native potrebbe non esistere.

## Vincoli del free tier Cloudflare

Verificati sulla documentazione ufficiale:

| Risorsa                  | Limite free          |
| ------------------------ | -------------------- |
| Richieste Durable Object | 100.000 / giorno     |
| Storage SQLite           | 5 GB totali          |
| Righe scritte            | 100.000 / giorno     |
| Durata compute           | 13.000 GB-s / giorno |

Sul piano free è obbligatorio il **backend SQLite** per i Durable Objects. Per due utenti l'uso reale
è di qualche centinaio di richieste al giorno: due ordini di grandezza sotto il limite.
