# Provare la sincronizzazione con un telefono solo

Il criterio di «fatto» di entrambi i piani chiede **due telefoni fisici**. Quando non ci sono, il
secondo dispositivo può essere un processo Node.

```bash
npm run prova                     # la checklist, eseguita da sola (~90 s)
npm run peer -- crea "Casa"       # un dispositivo interattivo, per provare col telefono in mano
```

## Non è un simulatore

`apps/mobile/scripts/device.mts` monta **i moduli veri dell'app** — `ensureSchema`, il profilo,
`GroupRegistry`, `SqliteYPersistence`, `SqliteSyncStore`, `resolveMyMemberId`, `seedDefaults` — su
SQLite vero e contro il **relay in produzione**. È `ProfileProvider` + `GroupsProvider` +
`VaultProvider` senza React.

**Perché la distinzione conta.** Dei due bug che rendevano sbagliati i saldi alla prima prova con due
telefoni, uno stava nel core (`SyncEngine.start`) e uno nell'**app**: il membro nasceva da un id
casuale per dispositivo invece che dal profilo. Un secondo dispositivo che si scrivesse da sé la
logica dei membri farebbe la cosa giusta mentre l'app fa quella sbagliata, e direbbe **verde**.
Questo no: chiama `resolveMyMemberId`, la funzione vera — che per questo è stata estratta da
`VaultProvider.tsx` in `state/membership.ts`.

L'harness è dentro `npm run typecheck`: cambiare la firma di un modulo dell'app e non aggiornarlo
rompe la compilazione. È ciò che gli impedisce di divergere in silenzio e continuare a dire verde.

## Cosa copre, e cosa no

| Prova                                                    | Senza telefono?                           |
| -------------------------------------------------------- | ----------------------------------------- |
| Sync **in entrambe le direzioni**                        | ✅ `npm run prova`                        |
| **Due membri e non quattro** (il bug dello Step 11)      | ✅                                        |
| «Chi sei in questo gruppo?» prima di scrivere il membro  | ✅                                        |
| Saldo contro il calcolo a mano                           | ✅                                        |
| Otto categorie e non sedici (chi entra non semina)       | ✅                                        |
| Due gruppi che non si mescolano                          | ✅                                        |
| Aereo → rete: `offlineRetryMs` dello Step 17             | ✅ senza staccare la rete della macchina  |
| La scala di poll dello Step 16, misurata                 | ✅                                        |
| Chiudere e riaprire: i dati sono su disco                | ✅ (SQLite vero, non `expo-sqlite`)       |
| Uscire da un gruppo, e cancellarlo dal relay             | ✅                                        |
| Il **link** d'invito, in entrambi i versi                | ✅ per il link; la consegna Android no    |
| Schermate, navigazione, stati vuoti                      | ❌ solo col telefono                      |
| Che Android consegni `jutrack://join#…` **col fragment** | ❌ solo col telefono                      |
| Foglio di condivisione, scansione QR                     | ❌ solo col telefono                      |
| `expo-sqlite` e SecureStore veri                         | ❌ qui sono `node:sqlite` e un file a 600 |

Quello che resta fuori è solo ciò che è **React o nativo**. Per quello basta comunque **un** telefono.

## `npm run prova` — la checklist da sola

Dieci sezioni, una trentina di controlli, esce con codice 1 se qualcosa è rosso. Crea due dispositivi
in una cartella temporanea, li fa parlare dal relay vero, e alla fine cancella i vault di prova
chiedendo la cancellazione al relay — che è anche il controllo dello Step 14.

Due cose che ha già insegnato scrivendola:

- **Chi entra in un gruppo altrui non ottiene un membro finché non risponde** a «chi sei in questo
  gruppo?». Il primo scenario saltava quel gesto e il controllo sui membri falliva: non era un bug,
  era la prova che l'harness segue l'app davvero.
- **Una spesa divisa «fra tutti» lo è fra tutti quelli che si conoscono in quel momento.** Registrarla
  prima che la presenza dell'altro sia arrivata la divide per uno solo, e il saldo risulta diverso da
  quello atteso. Non è un difetto — è come funziona un CRDT — ma è la ragione per cui la prova aspetta
  che i due si vedano **prima** di registrare qualcosa.

## `npm run peer` — il dispositivo interattivo

Serve per le prove che hanno bisogno di un telefono dall'altra parte.

```bash
npm run peer -- crea "Casa"        # crea un gruppo e stampa l'invito da aprire sul telefono
npm run peer -- entra "<link>"     # entra con un invito generato dal telefono
npm run peer -- apri               # riapre l'ultimo gruppo e riparte da dov'era
npm run peer -- invito             # ristampa un invito per il gruppo salvato
```

Opzioni: `--profilo <nome>` per tenere più dispositivi distinti, `--nome <nome>` per come ti chiami,
`--verbose` per stampare **ogni** richiesta al relay con l'intervallo dalla precedente.

Una volta partito accetta comandi da tastiera: `spesa 12,30 pizza`, `stato`, `invito`, `esci`. Ciò che
arriva dall'altro telefono compare con `←` e l'orario.

Lo stato vive in `.jutrack-peer/<profilo>/`, gitignorato. **Contiene la chiave del vault in chiaro**:
in Node non esiste il Keystore di sistema. Solo gruppi di prova.

## Le prove che restano al telefono

### Il giro completo dell'invito

Crea un gruppo **dal telefono**, genera l'invito con «Invita qualcuno», mandalo in chat (a te stesso
va benissimo) e aprilo. Poi incolla lo stesso link qui:

```bash
npm run peer -- entra "<link>" --profilo ospite
```

I due punti dello Step 13 che possono fallire **in silenzio** sono proprio questi: che Android
consegni `jutrack://join#…` alla rotta `/join` **con il fragment** (senza, l'app riceve un invito
senza chiave), e che il foglio di `Share.share` compaia davvero nella build installata.

### La scala di poll vista dal telefono

Lascia l'app aperta e ferma cinque minuti, poi scrivi una spesa dal terminale. **Deve comparire entro
un minuto** — è il gradino più largo della scala. Toccando la lista spese, che chiama `markActive`,
deve arrivare in un paio di secondi.

### L'aereo, dal telefono

Modalità aereo, due spese, riaccendi la rete e **non toccare nulla**: devono comparire nel terminale
entro ~15 secondi. `npm run prova` lo verifica già lato Node, ma qui c'è in più il congelamento dei
timer da parte di Android e il `resume()` di `AppState`.

### Il resto

Schermate degli Step 7-9 mai toccate con un dito, onboarding del profilo, ripartenza pulita,
persistenza di `expo-sqlite` fra due riavvii, scansione del QR.

## Se serve proprio un secondo Android

- **Utenti multipli** (Impostazioni → Sistema → Utenti): il secondo utente ha dati applicativi
  separati, quindi è un'installazione indipendente. Limite: cambiando utente l'altro viene congelato,
  quindi niente prove di tempistica.
- **Clonazione dell'app** (Dual Messenger su Samsung, Doppia app su Xiaomi): le due copie girano
  **insieme**, quindi vanno bene anche per le tempistiche. Non tutti i telefoni la offrono per
  qualunque app.

L'emulatore è la strada peggiore: richiede tutto l'SDK Android, e la development build di EAS è
compilata per arm64 mentre le immagini dell'emulatore sono x86_64 — servirebbe una build locale con
Gradle.
