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
