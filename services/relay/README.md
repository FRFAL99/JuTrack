# JuTrack relay

Corriere di blob cifrati. Non ha la chiave e non può leggerne il contenuto: per il relay ogni
payload è una sequenza di byte opachi.

## API

| Metodo   | Rotta                                | Corpo                 | Risposta                     |
| -------- | ------------------------------------ | --------------------- | ---------------------------- |
| `GET`    | `/health`                            | —                     | `{ ok: true }`               |
| `POST`   | `/v1/vault/:vaultId/updates`         | `{ blobs: [base64] }` | `{ head, accepted }`         |
| `GET`    | `/v1/vault/:vaultId/updates?since=N` | —                     | `{ updates, head, hasMore }` |
| `DELETE` | `/v1/vault/:vaultId/vault`           | —                     | `{ deleted: true }`          |

Tutte le rotte sotto `/v1` richiedono `Authorization: Bearer <authToken>`, dove `authToken` è
`HKDF(vaultKey, "jutrack/auth/v1")` in esadecimale.

`vaultId` è 32 caratteri esadecimali, derivato dalla chiave del vault. Viene validato nel Worker
prima di raggiungere il Durable Object: senza quel controllo, chiunque potrebbe far istanziare un
Durable Object per ogni stringa inventata, consumando quota.

## Autenticazione

Trust-on-first-use: il primo client a scrivere registra `SHA-256(authToken)`; i successivi devono
presentarne uno che produca lo stesso hash, confrontato in **tempo costante**.

Il relay vede `authToken` ma non `contentKey`: sono derivate con HKDF su domini separati, quindi
conoscere la prima non dà alcun vantaggio verso la seconda.

## Limiti

| Limite                | Valore    | Motivo                                              |
| --------------------- | --------- | --------------------------------------------------- |
| Dimensione di un blob | 1 MB      | Evita di riempire lo storage con una sola richiesta |
| Blob per richiesta    | 100       | Contiene il costo di una singola scrittura          |
| Update per risposta   | 200       | Risposte di dimensione prevedibile                  |
| TTL degli update      | 30 giorni | Il relay è una cache di transito, non un archivio   |

Se un solo blob della richiesta è invalido **non ne viene inserito nessuno**: un inserimento parziale
lascerebbe il client incerto su cosa sia stato accettato.

## Sviluppo

```bash
npm run dev        # wrangler dev su localhost:8787
npm test           # 35 test dentro workerd, con Durable Object e SQLite reali
npm run e2e        # verifica end-to-end cifrata contro un relay in esecuzione
npm run typecheck
```

I test girano nel runtime reale e non su mock: con dei mock si verificherebbe solo la nostra idea di
come si comporta un Durable Object. È così che è emerso che `storage.deleteAll()` elimina anche le
tabelle SQLite, non solo le chiavi.

### Verifica end-to-end

```bash
npm run dev &                       # in un terminale
npm run e2e                         # nell'altro
RELAY_URL=https://... npm run e2e   # oppure contro un deploy reale
```

Cifra update Yjs reali con il crypto del progetto, li fa transitare dal relay e ricostruisce il
documento dall'altra parte. Verifica anche che ciò che arriva al relay sia effettivamente
illeggibile — e prima ancora che quel controllo abbia mordente, cioè che un update _non_ cifrato
esponga davvero il testo in chiaro.

## Deploy

```bash
npx wrangler login
npm run deploy
npm run tail        # log in tempo reale: i payload devono risultare illeggibili
```

## Costi

Rientra nel free tier: Durable Object con backend SQLite, 100.000 richieste al giorno, 5 GB di
storage. Per due utenti l'uso reale è di qualche centinaio di richieste al giorno.

Sul piano Free il backend SQLite non è una preferenza ma l'unico disponibile.
