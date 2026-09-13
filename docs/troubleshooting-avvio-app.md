# L'app non partiva sul telefono — registro dell'indagine

Aggiornato: 2026-08-01. **RISOLTO.**

Documento scritto durante l'indagine, non dopo: include le ipotesi sbagliate, perché sapere cosa è
stato escluso vale quanto sapere cosa è stato trovato. La conclusione è in fondo, ma vale la pena
leggere come ci si è arrivati — l'errore di metodo è più istruttivo dell'errore tecnico.

## La development build sparisce quando installi una preview (13 settembre 2026)

**Sintomo.** Apri JuTrack e non si aggancia a Metro. Ripieghi su Expo Go, e lì l'app non parte
affatto: tre errori rossi che parlano di `expo-notifications` — «Android Push notifications ... was
removed from Expo Go with the release of SDK 53» — e a cascata un
`Cannot read property 'getAllScheduledNotificationsAsync' of undefined`.

**Quegli errori non riguardano il codice dell'app.** Expo Go dalla SDK 53 non ha il lato nativo di
`expo-notifications`, quindi `features/notifications/module.ts` non lo trova e chi lo usa cade dietro.
In una development build quel modulo c'è e non succede niente. **Expo Go non è un modo di provare
questa app**, e non lo sarà finché ci sono le notifiche.

**La causa vera è un'altra.** `development` e `preview` costruivano lo stesso package
`com.frfal.jutrack`: installando la build `preview` del 12 settembre, Android l'ha trattata come un
aggiornamento — è la ragione per cui i dati erano sopravvissuti — e **ha sostituito il dev client**.
La `preview` ha `developmentClient: false`, quindi non sa agganciarsi a Metro: gira solo il JS che si
porta dentro.

**Risolto alla radice**: `apps/mobile/app.config.ts` dà alla variante di sviluppo il package
`com.frfal.jutrack.dev` e il nome «JuTrack dev», e `eas.json` passa `APP_VARIANT=development` a quel
profilo. Le due app convivono sul telefono. Lo `scheme` resta `jutrack` per entrambe, così un invito
`jutrack://join#…` può aprire quella che si sta provando — Android chiede quale.

**Due cose misurate quel giorno, da ricordare:**

- **`version` entra nell'impronta di `runtimeVersion`.** Alzarla da `0.1.0` a `1.0.0` (commit
  `777b958`) ha cambiato il fingerprint, quindi la build `preview` installata **non accetta più**
  nessun `eas update` pubblicato da `main`. Le due impronte: `da213b95…` con 0.1.0, `d862b56d…` con
  1.0.0.
- **`eas.json` è hashato come file intero.** Aggiungere un `env` al solo profilo `development` ha
  spostato la `runtimeVersion` di _tutti_ i profili. Lo Step 47 esiste per mandare `eas update` alle
  build già installate: **toccare `eas.json` le taglia fuori**, anche per una riga che riguarda un
  altro profilo.

**Attenzione anche a questo**: lanciare `npx expo …` dalla **root** del monorepo ci lascia un
`app.json` vuoto (`{"expo":{}}`). È lo stesso file che fa credere a Metro di avere un progetto lì, ed
è la trappola che è costata giorni. Se compare, si cancella.

## La causa

**Metro era in esecuzione dalla root del monorepo invece che da `apps/mobile`.**

```
node /home/frfal/frfal/JuTrack/node_modules/.bin/expo start --tunnel --clear
                              ^^^^^^^^^^^^^^ nessun progetto Expo qui
```

Dalla root non esistono `app.json` né `src/app`: l'entry point `expo-router/entry` veniva risolto
con origine `/home/frfal/frfal/JuTrack/.` e non si trovava. Il server rispondeva **404 a ogni
richiesta di bundle**.

Da lì tutto il resto discende: nessun bundle servito → nessun JavaScript eseguito → nessun motore
collegato a `/json/list` → nessuna schermata rossa, perché non c'era nulla che potesse fallire.

La correzione è una riga:

```bash
cd apps/mobile && npx expo start --dev-client   # non dalla root del monorepo
```

## Perché ci è voluto tanto

Il sintomo diceva «l'app non parte» e l'indagine ha cercato **la causa nell'app**: Hermes, il
bytecode, il bundle, la rete, la versione di Expo Go. Ogni ipotesi è stata esclusa con una prova
solida, e le prove erano corrette — solo che nessuna guardava dove serviva.

Il dato che avrebbe portato subito alla soluzione era già lì dal primo giorno: **il 404 sul
bundle**. È stato letto come «il bundle non arriva» (sintomo) invece che come «il server non sa dove
sia il progetto» (causa). La domanda mancante non era _perché il telefono rifiuta il bundle_, ma
**da quale directory sta rispondendo questo server**.

Aggravante: il processo Metro era rimasto vivo per ore fra un tentativo e l'altro. Ogni prova
ripartiva dal telefono, mai dal server — che nel frattempo aveva anche una mappa dei file
invalidata da una reinstallazione delle dipendenze avvenuta sotto di lui.

**Lezione da tenere:** quando un client non riceve nulla, verificare _cosa serve il server_ prima di
indagare _cosa fa il client_. E un demone di sviluppo lasciato in esecuzione va riavviato prima di
dichiarare riprodotto un problema.

## Sintomo originale

Expo Go si apriva, l'app si chiudeva immediatamente. **Nessuna schermata rossa**, nessun messaggio,
nessun errore nel log di Metro.

```
$ curl http://localhost:8081/json/list
[]
```

`/json/list` elenca i motori JavaScript collegati al debugger di Metro: **sempre vuoto**. Il telefono
non ha mai eseguito una riga del nostro codice. Ogni tentativo di correggere l'applicazione era
quindi destinato a non produrre effetti: non stava fallendo, non stava partendo.

## Cosa era stato escluso, con la prova

Tutte queste esclusioni restano valide, ed è il motivo per cui il codice era già sano quando la
causa vera è stata rimossa.

| Ipotesi                         | Come è stata esclusa                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Bug nel nostro codice           | App ridotta al **livello 0** — solo `expo-router` e React Native, zero Yjs, zero crypto, zero SQLite. Crashava comunque |
| Errore di compilazione          | `expo export` completava senza errori                                                                                   |
| Bytecode Hermes incompatibile   | Il bundle servito è **JavaScript normale** (`var __BUNDLE_START_TIME__`), non bytecode                                  |
| Errore JavaScript a runtime     | Nessuna schermata rossa, nessuna eccezione nel log, nessun motore collegato                                             |
| Metro non in ascolto sulla rete | `ss` mostra `*:8081`; il manifest rispondeva HTTP 200                                                                   |
| Rete locale, firewall, VPN      | Riprovato via **tunnel pubblico** (`exp.direct`), verificato dall'esterno. Crashava ancora                              |
| Expo Go non realmente SDK 57    | Caduta con la development build: quella non usa Expo Go, e il sintomo era identico                                      |

## Tre problemi reali trovati lungo il percorso

Nessuno era la causa, tutti e tre erano bug veri.

### 1. `TextEncoder` non esiste su Hermes

`utf8ToBytes` di `@noble/hashes` lo usa internamente. Expo installa `TextDecoder`,
`TextEncoderStream`, `URL` e `structuredClone`, ma **non `TextEncoder`** — verificato leggendo
`expo/src/winter/runtime.native.ts`.

Corretto implementando la codifica UTF-8 in `crypto/encoding.ts`, senza dipendere da alcun global.
Coperto da `hermes-compat.test.ts`. Confermato sul dispositivo: la diagnostica passa il punto 6
(«HKDF e UTF-8 OK») su Hermes vero.

**Nota sul metodo:** `TextEncoder` era già vietato nel core da una regola ESLint, ma la regola
guardava il nostro codice e non quello delle dipendenze. Ora vieta anche l'import di `utf8ToBytes`
da noble.

### 2. Metro annunciava `127.0.0.1` come host del bundle

Il telefono scaricava il manifest da `192.168.1.6` ma cercava il bundle su `127.0.0.1`, che per il
telefono è sé stesso. Corretto con `REACT_NATIVE_PACKAGER_HOSTNAME=<ip-lan>`.

### 3. Due copie di React nell'albero delle dipendenze

`expo-doctor` segnalava `react@19.2.3` in `apps/mobile` e `react@19.2.8` nella root: i pacchetti
`expo-*` dichiarano `"react": "*"` e npm risolveva con l'ultima pubblicata invece di riusare quella
dell'app. In una build nativa gli hook finirebbero su un'istanza diversa da quella che ha creato il
componente.

Corretto con un `overrides` nella root. Il lock è stato rigenerato: l'entry precedente era una peer
risolta automaticamente, e gli override non riscrivono ciò che è già nel lock.

## Verifica finale sul dispositivo

Development build EAS installata, **Impostazioni → Diagnostica**: 14 passaggi su 14, «TUTTO OK».
Yjs, `Y.Doc` (shim lib0/webcrypto), crypto, XChaCha20-Poly1305, SQLite, SecureStore, relay in
produzione (HTTP 200), invito di pairing, QR 45×45 moduli, modulo fotocamera disponibile.

## Comandi utili

```bash
# Server di sviluppo — SEMPRE da apps/mobile, mai dalla root del monorepo
cd apps/mobile && npx expo start --dev-client

# Tunnel pubblico, aggira LAN/firewall/VPN
cd apps/mobile && npx expo start --dev-client --tunnel

# Da quale directory sta rispondendo il server? (la prima domanda da farsi)
ps aux | grep "expo start" | grep -v grep

# Il server risolve davvero l'entry point? 404 = progetto non trovato
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true"

# Il telefono ha collegato il motore JS? `[]` = mai arrivato
curl -s http://localhost:8081/json/list
```

Il terzo e il quarto comando sono quelli che avrebbero risolto l'indagine in cinque minuti.
