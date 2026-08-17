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
Y.Doc (in memoria)         ← sorgente di verità per la UI, uno per gruppo aperto
    ↕  ydoc.on('update')
SqliteYPersistence         ← durabilità (log di update binari, y_updates_<vaultId>)
    ↕
SyncEngine                 ← cifra in uscita, decifra in ingresso
    ↕  HTTPS
Cloudflare Worker → Durable Object per vault
```

I tre livelli sotto la UI sono montati sul **gruppo corrente** e vengono rimontati quando si passa a
un altro: non esiste uno stato globale costruito una volta per vita del processo.

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

## Un gruppo, un vault

Un **gruppo** di spesa è un vault: una `vaultKey`, un `vaultId`, un Durable Object, un documento
Yjs. Un telefono può appartenere a più gruppi contemporaneamente, e le loro spese non si mescolano.

Sul dispositivo, per ciascun gruppo: una chiave in SecureStore (`jutrack.groupKey.<vaultId>`), una
riga nella tabella `groups`, una tabella `y_updates_<vaultId>` per il log del documento, e righe
`vault_id` nelle tabelle di sync. **Un solo motore di sincronizzazione è attivo per volta**, quello
del gruppo aperto: gli altri si riallineano quando li si apre.

Il `vaultId` è derivato dalla chiave ed è esadecimale, quindi è un identificatore SQL valido per
costruzione — nessuna stringa scelta dall'utente finisce in un nome di tabella.

## Modello dati (Y.Doc)

Cinque `Y.Map` top-level di record, più `meta` per le proprietà del gruppo. Ogni record è a sua
volta una `Y.Map`: due edit su campi diversi dello stesso record si fondono invece di
sovrascriversi a vicenda.

| Mappa         | Chiave                   | Valore                                                                                                       |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `expenses`    | `id`                     | `amountCents, currency, date, categoryId, note, store, tags, paidBy, split, createdAt, updatedAt, deletedAt` |
| `categories`  | `id`                     | `name, icon, color, archived`                                                                                |
| `budgets`     | `<categoryId>:<YYYY-MM>` | `limitCents`                                                                                                 |
| `members`     | `id`                     | `name, color`                                                                                                |
| `settlements` | `id`                     | `fromMember, toMember, amountCents, date`                                                                    |
| `meta`        | `name`                   | il nome del gruppo, condiviso: rinominarlo raggiunge l'altro telefono                                        |

Il nome del gruppo sta **dentro** il vault e non nel registro locale proprio perché va sincronizzato
come tutto il resto. Il registro ne tiene una copia per disegnare la lista dei gruppi senza aprire
ogni documento; quando le due divergono, è la copia ad aggiornarsi.

**`store` e `tags` sono campi, non entità** (Step 23). Non esistono una mappa dei negozi e una dei
tag con i propri id: il vocabolario si deriva in lettura dalle spese che li nominano
(`insights/naming.ts`), quindi un negozio esiste finché esiste una spesa che lo cita e sparisce da
solo quando non ne resta nessuna. Niente schermate di gestione, niente cancellazioni, e soprattutto
nessun orfano — un tag rinominato mentre l'altro telefono lo sta usando. Il prezzo è che non si può
dare un colore a un tag né rinominarne uno in tutte le spese insieme.

I due campi sono **additivi**: i reader hanno un fallback (`''` e `[]`), `writeRecord` scrive solo le
chiavi che riceve, e una spesa registrata prima che esistessero si legge senza che nulla la tocchi.
Nessun backfill e nessun bump di `schema_version`, che è un meccanismo di azzeramento e non di
migrazione. `tags` è scritto come **array intero** e non come `Y.Array`: due etichettature
concorrenti della stessa spesa non si fondono, vince l'ultima. La regola del valore composto in una
chiave sola vale per `split`, che ha un'invariante da rispettare; un elenco di etichette non ne ha.

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

### La pagina degli inviti — l'unica cosa che il relay serve a un browser

`GET /j` restituisce HTML statico, e non tocca alcun Durable Object. Esiste perché un link
`https://` si manda in chat e un `jutrack://` no: la pagina legge il fragment e costruisce il
bottone che riporta l'invito dentro l'app.

**Non riceve nulla dell'invito.** La chiave sta dopo il `#`, che i browser non trasmettono: non
arriva al Worker, non entra nei log e non compare nelle anteprime generate dalle chat. Perché resti
vero, la pagina non fa richieste di rete di alcun tipo e non carica risorse esterne — è una
proprietà verificata dai test, non una promessa. Il principio non negoziabile vale anche qui: il
relay non sa nulla di chi entra in quale gruppo.

## Uscire e rientrare: due strade che non sono la stessa

Ci sono due modi di riavere i propri dati dopo aver perso un telefono, e confonderli è il modo più
rapido di credersi al sicuro senza esserlo.

|                               | **Backup della chiave** (`/backup`)          | **Export JSON** (`/export` → `/importa`) |
| ----------------------------- | -------------------------------------------- | ---------------------------------------- |
| Cosa contiene                 | la `vaultKey`, cifrata con una passphrase    | i record del vault, **in chiaro**        |
| Cosa restituisce              | **quel** vault: spese dal relay, sync attivo | i dati, in un vault **nuovo**            |
| Riaggancia gli altri telefoni | sì                                           | **no**: serve un invito nuovo            |
| Se lo intercetta un terzo     | inutile senza la passphrase                  | legge tutte le vostre spese              |

**L'export JSON non contiene e non conterrà mai la chiave.** Se bastasse quel file a rientrare in un
vault, chiunque lo ricevesse — la chat da cui è passato, il servizio su cui è finito — vi entrerebbe.
Ne discende che il gruppo ricostruito da un import ha per forza una chiave nuova: non è una
limitazione dell'implementazione, è il principio non negoziabile applicato al percorso di ritorno.

**L'import è l'unica porta da cui entrano dati che l'app non ha scritto.** Tutto il resto del modello
riceve record prodotti dall'app o arrivati cifrati dall'altro dispositivo; un file d'export può
essere stato modificato a mano o troncato. Per questo `parseVaultExport` (`export/import.ts`) rifà
alla porta tutte le invarianti che `VaultStore` fa rispettare in scrittura — quote che sommano al
totale, importi interi, riferimenti a membri esistenti — e scarta i record che non le rispettano
**dicendolo**, invece di scriverli nel documento da cui si sincronizzerebbero.

`VaultStore.importSnapshot` **conserva gli id** dei record: `paidBy`, le chiavi di `split.shares` e i
membri dei pareggi sono riferimenti interni alla fotografia, e rigenerarli produrrebbe un vault di
spese pagate da nessuno. Richiede un documento vuoto: su uno già popolato, gli id coincidenti
sovrascriverebbero e gli altri si affiancherebbero, cambiando dei saldi.

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
