# L'app non parte sul telefono — registro dell'indagine

Aggiornato: 2026-08-01. **Non ancora risolto.**

Documento scritto durante l'indagine, non dopo: include le ipotesi sbagliate, perché sapere cosa è
già stato escluso vale quanto sapere cosa è stato trovato.

## Sintomo

Expo Go si apre, l'app si chiude immediatamente. **Nessuna schermata rossa**, nessun messaggio,
nessun errore nel log di Metro.

L'assenza di schermata rossa è il dato più informativo: React Native la mostra per **qualunque**
eccezione JavaScript non gestita. La sua assenza significa che l'errore non è JavaScript — o che
JavaScript non è mai partito.

## Il fatto decisivo

```
$ curl http://localhost:8081/json/list
[]
```

`/json/list` elenca i motori JavaScript collegati al debugger di Metro. **È sempre stato vuoto.**

Il telefono non ha mai eseguito una riga del nostro codice. Ogni tentativo di correggere
l'applicazione era quindi destinato a non produrre effetti: non stava fallendo, non stava partendo.

## Cosa è stato escluso, con la prova

| Ipotesi                         | Come è stata esclusa                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Bug nel nostro codice           | App ridotta al **livello 0** — solo `expo-router` e React Native, zero Yjs, zero crypto, zero SQLite. Crasha comunque      |
| Errore di compilazione          | `expo export` e la richiesta diretta del bundle restituiscono HTTP 200, 6,2 MB, nessun errore                              |
| Bytecode Hermes incompatibile   | Il bundle servito è **JavaScript normale** (`var __BUNDLE_START_TIME__`), non bytecode: nessuna versione da far combaciare |
| Errore JavaScript a runtime     | Nessuna schermata rossa, nessuna eccezione nel log, nessun motore collegato                                                |
| Metro non in ascolto sulla rete | `ss` mostra `*:8081` (tutte le interfacce); il manifest risponde HTTP 200 da `192.168.1.6`                                 |
| Rete locale, firewall, VPN      | Riprovato via **tunnel pubblico** (`exp.direct`): manifest e bundle HTTP 200 verificati dall'esterno. Crasha ancora        |

## Due problemi reali trovati e corretti lungo il percorso

Nessuno dei due era la causa di questo crash, ma entrambi erano bug veri.

### 1. `TextEncoder` non esiste su Hermes

`utf8ToBytes` di `@noble/hashes` lo usa internamente. Expo installa `TextDecoder`,
`TextEncoderStream`, `URL` e `structuredClone`, ma **non `TextEncoder`** — verificato leggendo
`expo/src/winter/runtime.native.ts`.

Riprodotto rimuovendo quel global in Node:

```
CRASH generateVaultKey + deriveVaultKeys
      TextEncoder is not defined
      at utf8ToBytes (@noble/hashes/src/utils.ts:585)
```

Corretto implementando la codifica UTF-8 in `crypto/encoding.ts`, senza dipendere da alcun global.
Coperto da `hermes-compat.test.ts`, che rimuove quei global e riesegue tutto.

**Nota sul metodo:** `TextEncoder` era già vietato nel core da una regola ESLint, ma la regola
guardava il nostro codice e non quello delle dipendenze. Ora vieta anche l'import di `utf8ToBytes`
da noble.

### 2. Metro annunciava `127.0.0.1` come host del bundle

Il manifest servito al telefono conteneva:

```json
"launchAsset": { "url": "http://127.0.0.1:8081/node_modules/expo-router/entry.bundle?..." }
```

Il telefono scaricava il manifest da `192.168.1.6` ma poi cercava il bundle su `127.0.0.1`, che per
il telefono è sé stesso. Nessun bundle, nessun JavaScript, nessun errore visibile.

Corretto con `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.6`. Il manifest ora punta all'indirizzo
corretto — ma l'app continua a chiudersi, quindi non era (solo) questo.

## Cosa resta

Due sole spiegazioni compatibili con tutte le prove raccolte:

1. **L'Expo Go installato non è realmente SDK 57.** L'APK potrebbe non essersi installato: Android
   mantiene la versione esistente se le firme confliggono, e l'installazione fallisce in silenzio.
2. **Expo Go crasha su questo dispositivo**, indipendentemente dal progetto.

Entrambe sono esterne al codice.

## Prossimo passo: development build

Espone la strada che Expo stessa raccomanda per le app reali, e aggira Expo Go del tutto:

```bash
cd apps/mobile
npx eas login          # richiede l'account Expo
npx eas build --platform android --profile development
```

La build avviene **nel cloud**: non serve l'SDK Android in locale. Produce un APK autonomo che
include già i moduli nativi del progetto — niente più vincoli di versione fra progetto ed Expo Go.

Configurazione già pronta: `eas.json` (profilo `development`, `buildType: apk`) e `expo-dev-client`
installato.

## Schermata di diagnostica

L'app include **Impostazioni → Diagnostica** (`/probe`), che carica un sottosistema alla volta con
import dinamici e mostra dove si interrompe: Yjs → `Y.Doc` → crypto → SQLite → SecureStore → relay.

Gli import sono dinamici di proposito: quelli statici verrebbero valutati tutti insieme prima di
qualunque riga di log, rendendo impossibile isolare il colpevole. Ogni passaggio finisce anche nel
log di Metro con prefisso `[JUTRACK]`, così resta leggibile se l'app si chiude prima di disegnare.

È il primo posto da guardare quando la build sarà installata.

## Comandi utili

```bash
# Server con host esplicito (evita il bug del 127.0.0.1)
cd apps/mobile && REACT_NATIVE_PACKAGER_HOSTNAME=<ip-lan> npx expo start --clear

# Tunnel pubblico, aggira LAN/firewall/VPN
npx expo start --tunnel --clear

# Il telefono ha collegato il motore JS? `[]` = mai arrivato
curl -s http://localhost:8081/json/list

# Cosa riceve davvero il telefono
curl -s -H "expo-platform: android" -H "accept: application/expo+json,application/json" \
  http://localhost:8081/ | python3 -m json.tool | head -20
```

L'ultimo è il più utile: mostra il manifest esatto, dove è emerso il problema del `127.0.0.1`.
