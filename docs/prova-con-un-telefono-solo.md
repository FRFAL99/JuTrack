# Provare la sincronizzazione con un telefono solo

Il criterio di «fatto» di entrambi i piani chiede **due telefoni fisici**. Quando non ci sono, il
secondo dispositivo può essere un processo Node: `scripts/peer.mts`.

Non è un simulatore e non finge nulla. Usa `@jutrack/core` così com'è — stesso crypto, stesso
`SyncEngine`, stessa scala di poll, stesso formato d'invito — contro il **relay in produzione**. Per
il relay e per il telefono è indistinguibile da un altro telefono.

È possibile solo perché il core non importa nulla da react-native o da expo, per vincolo
architetturale imposto da una regola ESLint. È la prima volta che quel vincolo si ripaga davvero.

## Cosa prova, e cosa no

| Prova                                                    | Il peer basta?                                       |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Sync **in entrambe le direzioni**                        | ✅                                                   |
| **Due membri e non quattro** (il bug dello Step 11)      | ✅                                                   |
| Saldo che coincide col calcolo a mano                    | ✅                                                   |
| Entrare da un **link d'invito** (in entrambi i versi)    | ✅ per il link; la consegna del deep link Android no |
| La **scala di poll** dello Step 16                       | ✅ con `--verbose`, e con i secondi misurati         |
| `offlineRetryMs` dello Step 17 (aereo → rete)            | ✅ lato telefono, guardando quando arriva            |
| Due gruppi che non si mescolano                          | ✅ con due profili                                   |
| Uscire da un gruppo, rigenerarlo                         | ✅ per l'effetto sul relay                           |
| Interfaccia, navigazione, stati vuoti                    | ❌ solo col telefono                                 |
| `expo-sqlite` che persiste fra due riavvii               | ❌ solo col telefono                                 |
| Che Android consegni `jutrack://join#…` **col fragment** | ❌ solo col telefono                                 |
| Foglio di condivisione, scansione QR                     | ❌ solo col telefono                                 |

Il peer copre la parte che riguarda **i dati e il protocollo**. Quello che resta è tutto sopra il
core, ed è lì che serve il telefono in mano — ma uno solo basta.

## Comandi

```bash
npm run peer -- crea "Casa"        # crea un gruppo e stampa l'invito da aprire sul telefono
npm run peer -- entra "<link>"     # entra con un invito generato dal telefono
npm run peer -- apri               # riapre l'ultimo gruppo e riparte da dov'era
npm run peer -- invito             # ristampa un invito per il gruppo salvato
```

Opzioni: `--profilo <nome>` per tenere più peer distinti (due profili = due telefoni finti),
`--nome <nome>` per come si chiama il membro, `--verbose` per stampare **ogni** richiesta al relay
con l'intervallo dalla precedente.

Una volta partito accetta comandi da tastiera: `spesa 12,30 pizza`, `stato`, `invito`, `esci`.

Lo stato vive in `.jutrack-peer/<profilo>.json`, gitignorato. **Contiene la chiave del vault in
chiaro**: è uno strumento di prova su gruppi di prova, non va usato per dati veri.

## Le prove, in ordine

### 1. Sync in entrambe le direzioni, e due membri

Il criterio di «fatto» del piano v2, quello mai verificato.

```bash
npm run peer -- crea "Prova sync"
```

Copia il link stampato, aprilo sul telefono (o incollalo in **Gruppi → Incolla un invito**).
Poi, sul telefono, registra una spesa: deve comparire nel terminale con `←` e l'orario. Dal terminale
scrivi `spesa 20,00 dal-peer`: deve comparire sul telefono.

Poi guarda i due numeri che contavano:

- `stato` nel terminale deve mostrare **due membri**, non quattro. Erano quattro perché ogni
  dispositivo generava un id casuale per sé stesso invece di usare il profilo — corretto allo Step 11
  e mai riprovato su hardware.
- Il **saldo** deve coincidere col calcolo a mano, e i due lati devono essere speculari.

> Un ciclo che riporta `synced` non dimostra nulla: era vero anche con entrambi i bug. La prova è
> vedere il dato comparire dall'altra parte, in **tutti e due** i versi.

### 2. La scala di poll dello Step 16

```bash
npm run peer -- apri --verbose
```

Ogni riga `· GET al relay (n s dalla precedente)` porta l'intervallo misurato. Lasciando il peer
fermo, la sequenza deve allargarsi da sola: **2 s → 5 s dopo 15 s → 15 s dopo un minuto → 60 s dopo
cinque**. Scrivendo una spesa si torna subito a 2 s.

Sul telefono la stessa cosa si guarda al contrario: lascia l'app aperta e ferma cinque minuti, poi
scrivi una spesa dal terminale. **Deve comparire entro un minuto** — è il gradino più largo della
scala. Toccando la lista spese (che chiama `markActive`) deve arrivare in un paio di secondi.

### 3. `offlineRetryMs` dello Step 17

Questa si fa **col telefono**, e il peer serve da testimone.

Metti il telefono in **modalità aereo**, registra due spese, poi riaccendi la rete e **non toccare
nulla**. Devono comparire nel terminale entro ~15 secondi. È la prova che il sostituto del listener
di connettività — che sarebbe un modulo nativo, quindi una build EAS nuova — basta.

Senza la correzione dello Step 17 il backoff sarebbe salito fino a cinque minuti, e non sarebbe
successo niente per parecchio tempo.

### 4. Due gruppi che non si mescolano

```bash
npm run peer -- crea "Casa" --profilo casa
npm run peer -- crea "Viaggio" --profilo viaggio
```

Entra in entrambi dal telefono, e scrivi una spesa in ciascuno. Ogni terminale deve vedere **solo**
le proprie. È il punto pericoloso dello Step 12: il `WHERE vault_id` di `setPending`.

### 5. L'invito nell'altro verso

Crea un gruppo **dal telefono**, genera l'invito con «Invita qualcuno», mandatelo (a te stesso va
benissimo) e incollalo:

```bash
npm run peer -- entra "<link incollato>" --profilo ospite
```

Se il peer entra e vede le spese, il link è ben formato e la chiave viaggia nel fragment come deve.
Resta da verificare **col telefono** la parte che il peer non può vedere: che Android consegni
`jutrack://join#…` alla rotta `/join` **con il fragment**, e che il foglio di `Share.share` compaia
davvero. Sono i due punti dello Step 13 che possono fallire in silenzio.

## Se serve proprio un secondo Android

Due strade senza comprare niente, utili per le prove di interfaccia che il peer non copre:

- **Utenti multipli** (Impostazioni → Sistema → Utenti): il secondo utente ha dati applicativi
  separati, quindi la stessa app installata lì è un'installazione indipendente. Limite: quando si
  cambia utente l'altro viene congelato, quindi le prove **di tempistica** non si possono fare.
- **Clonazione dell'app** (Dual Messenger su Samsung, Doppia app su Xiaomi): le due copie girano
  **insieme**, quindi vanno bene anche per le tempistiche. Non tutti i telefoni la offrono per
  qualunque app.

L'emulatore Android è la strada peggiore qui: richiede tutto l'SDK, e la development build di EAS è
compilata per arm64 mentre le immagini dell'emulatore sono x86_64 — servirebbe una build locale con
Gradle.
