# JuTrack — Piano v8: i dati escono in un foglio di calcolo, e il backup si fa da solo

> Punto d'ingresso del progetto: [STATO.md](STATO.md). Questo piano **non viene dall'app in mano**,
> a differenza del [v7](piano-v7-data-e-vocabolario-del-gruppo.md): viene da un check a freddo della
> gestione dei dati, che è ferma allo Step 9 (l'export) e allo Step 42 (il reimport) e da allora non
> è più stata guardata.
>
> **Piano scritto il 13 settembre 2026, nessuno step ancora nel codice.** La numerazione prosegue da
> 60: **Step 61, 62, 63, 64, 65 e 66**, uno per sessione.
>
> **Ogni misura e ogni riferimento qui sotto è stato letto nel codice**, non dedotto. È la regola
> operativa nata dagli errori del piano v6, che aveva sbagliato il perché e il quanto su tre
> decisioni su quindici.

## Contesto

Tre problemi. Il primo riguarda il formato con cui i dati **escono**, gli altri due il modo in cui
**rientrano** e la frequenza con cui si mettono al sicuro.

1. **Il CSV non fa il mestiere per cui esiste.** Serve a «leggere i dati altrove», e
   [l'ADR 0003](adr/0003-formati-di-export.md) mette già per iscritto che in un Excel con locale
   italiano finisce **tutto in una colonna sola** — «è il prezzo esplicito della portabilità». Un
   `.xlsx` quel prezzo non ce l'ha, perché la cella è tipata: un numero è un numero in ogni locale.
2. **Il backup dei dati esiste ma nessuno se lo ricorda, e copre un gruppo solo.** È un gesto a tre
   tocchi dentro `/export` che produce un file di transito in cache. Chi ha tre gruppi lo ripete tre
   volte, e l'ultimo backup è quello che si è ricordato di fare. Lo Step 43 ha costruito l'avviso
   sulla **chiave** non salvata proprio perché il testo di `/backup` «lo legge solo chi apre
   `/backup`, cioè esattamente chi il backup lo sta già facendo»: per i **dati** quell'avviso non
   c'è.
3. **La porta d'ingresso passa dagli appunti, e il file non dice di che gruppo è.** Lo Step 42 ha
   scelto di incollare il JSON in una `TextInput` perché «`expo-document-picker` è un modulo nativo,
   cioè una build EAS nuova per una comodità», e ha rinunciato al nome del gruppo dentro il file per
   non alzare la versione del formato per un campo solo. **Entrambe le ragioni oggi sono superate**,
   ed è la decisione 0 a dire perché.

Il secondo e il terzo problema non sono lo stesso problema, ma condividono il file: è il JSON a
dover rientrare, ed è il JSON che il backup automatico scriverà.

## La cosa che il codice sapeva già (decisione 0)

**Decisione.** Non entra alcun modulo nativo, non si aggiunge alcuna dipendenza npm, e non si
riscrive niente di quanto segue.

| Cosa                                                           | Dove                                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Il parser d'ingresso, coi due livelli di rifiuto e il report   | `packages/core/src/export/import.ts`, 614 righe (`parseVaultExport`)  |
| La codifica UTF-8 **senza `TextEncoder`**, che su Hermes manca | `packages/core/src/crypto/encoding.ts:23` (`utf8ToBytes`)             |
| I decimali esatti da centesimi interi, senza mai un float      | `packages/core/src/export/csv.ts:36` (`centsToDecimal`)               |
| La disambiguazione delle colonne quota fra omonimi             | `packages/core/src/export/csv.ts:89` (`shareColumnLabels`)            |
| Totali per mese e per categoria, saldi e pagamenti minimi      | `insights/breakdown.ts:78` e `:48`, `insights/balance.ts:44` e `:102` |
| Il caricamento pigro dei moduli nativi in `try/catch`          | `apps/mobile/src/features/export/share.ts:23-44`                      |
| Il nome del file d'export, su data **locale**                  | `apps/mobile/src/features/export/filenames.ts` (`exportFileName`)     |
| Il nome del gruppo, nella versione autorevole                  | `packages/core/src/model/store.ts:168` (`getGroupName()`)             |
| La forma di un avviso, e i segni che lo governano              | `apps/mobile/src/features/notifications/backup.ts:78`, `:117`, `:215` |
| Il magazzino chiave→valore per quei segni                      | `apps/mobile/src/platform/app-meta.ts` (`KeyValueStore`)              |

**Perché.** Due commenti nel codice dicono oggi il falso, e questo piano li corregge.

- `apps/mobile/src/app/importa.tsx`, in testa, e il devlog dello Step 42: «**Si incolla, non si
  sceglie un file**, per la sesta volta nel progetto: `expo-document-picker` è un modulo nativo, cioè
  una build EAS nuova per una comodità». Non è più vero.
  **`expo-file-system@57.0.1` — già installato, e già dentro la development build del 5 settembre —
  espone `File.pickFileAsync` e `Directory.pickDirectoryAsync`**
  (`node_modules/expo-file-system/src/internal/NativeFileSystem.types.ts:286` e `:146`). Su Android
  il permesso sulla cartella scelta è **persistente**, perché il modulo chiama
  `takePersistableUriPermission` (`node_modules/expo-file-system/android/…/FilePickerContract.kt:48`).
  Il selettore di file e la cartella di backup costano quindi **zero moduli nuovi**.
- `apps/mobile/src/features/export/share.ts`, dove `TextFile.content` è dichiarato `string` e la
  funzione si chiama `shareTextFile`. **`File.write()` accetta `string | Uint8Array`**
  (`NativeFileSystem.types.ts:208`): un file **binario** esce dalla stessa pipeline di oggi, senza
  passare da base64. È ciò che rende possibile il `.xlsx` senza toccare nient'altro.

**Serve una build EAS?** **No, per nessuno dei sei step**, ed è una proprietà da difendere: il motore
`.xlsx` è JavaScript puro dentro `packages/core`, e tutto il resto vive dentro `expo-file-system`,
che è nel grafo dei moduli dal 5 settembre. Vale quindi la regola di
[versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md): **`version` in `app.json` resta
invariata**, perché entra nell'impronta della `runtimeVersion` e alzarla impedirebbe
all'aggiornamento via etere di arrivare, in silenzio.

---

## Le decisioni

### 1 · Il `.xlsx` prende il posto del CSV, che esce dal repo

**Decisione.** `packages/core/src/export/csv.ts` e il suo test si cancellano. `/export` offre due
bottoni invece di tre: «Foglio di calcolo (.xlsx)» e «Copia integrale (.json)». Si scrive
`docs/adr/0004-l-xlsx-al-posto-del-csv.md`; [l'ADR 0003](adr/0003-formati-di-export.md) passa a
`Stato: Superata da 0004` e per il resto **non si modifica**.

**Perché.** L'ADR 0003 aveva già messo per iscritto la conseguenza da cui nasce questa decisione, e
aveva lasciato come rimedio «una variante CSV per Excel italiano», da fare solo se aprire il file
fosse diventato «un fastidio ricorrente nell'uso reale — da osservare, non da anticipare». Il
fastidio c'è, ma quella variante lo **sposta** soltanto: romperebbe Fogli Google e `pandas`, che è
esattamente ciò che l'ADR voleva evitare. La cella tipata lo toglie invece di spostarlo, e con esso
cadono tre difese scritte solo per sopravvivere al CSV — `UTF8_BOM` (`csv.ts:26`), la colonna
`importo_centesimi` di scorta (`csv.ts:120`) e `neutralizeFormula` (`csv.ts:58`).

**Vincolo.** L'impianto dell'ADR 0003 sopravvive: **due formati, due scopi, e la schermata lo dice**.
Cambia il formato tabellare, non il fatto che ce ne siano due e che uno solo sia il backup.

### 2 · Il `.xlsx` si scrive a mano, a zero dipendenze, con le voci ZIP non compresse

**Decisione.** Un `packages/core/src/export/xlsx/` con tre file puri: `zip.ts` (CRC32 e intestazioni
ZIP con metodo **STORE**, compressione 0), `parts.ts` (le parti OOXML in XML) e `workbook.ts`
(`buildWorkbook(sheets): Uint8Array`). Niente `xlsx`, niente `exceljs`.

**Perché.** Un `.xlsx` è uno ZIP di XML, e scegliendo STORE non serve alcun deflate: restano ~150
righe di intestazioni deterministiche più quattro XML di scheletro, testabili **byte per byte**. Le
alternative costano di più. SheetJS su npm è fermo a **0.18.5** con una CVE nota, e le versioni
correnti stanno solo sul CDN del progetto. `exceljs` tira dentro gli stream e `zlib` di Node: è
esattamente la famiglia della trappola `lib0`→`isomorphic-webcrypto` dello Step 9, che né typecheck
né test vedevano e che solo `expo export` ha intercettato. In più `eslint.config.mjs` vieta a
`packages/core/src/**` di importare da `react-native` o da `expo`, e il core ha oggi **tre sole**
dipendenze (`@noble/ciphers`, `@noble/hashes`, `yjs`): vale la pena non aggiungerne una quarta per
un formato di file.

**Vincolo.** Il generatore entra in `packages/core/src/hermes-compat.test.ts`, che gira dopo aver
cancellato `TextEncoder`, `crypto` e `Buffer` dai global. La codifica passa da `utf8ToBytes`
(`crypto/encoding.ts:23`), che esiste proprio perché quella di `@noble/hashes` usa `TextEncoder` e
faceva crashare l'app all'avvio.

### 3 · Nel foglio, una data è una data e un timestamp resta testo

**Decisione.** Le colonne `IsoDate` (`YYYY-MM-DD`) diventano numeri seriali Excel con
`numFmtId="14"`. `createdAt`, `updatedAt` e `deletedAt` restano **stringhe ISO**.

**Perché.** Il seriale di una data si ricava come giorni dal 1899-12-30 con aritmetica intera sui tre
campi della stringa: nessun oggetto `Date`, quindi nessun fuso orario. I timestamp invece sono UTC
per definizione (`IsoTimestamp`, `model/types.ts`), e Excel non ha il concetto di fuso: convertirli
sposterebbe **in silenzio** il giorno di una spesa creata dopo le 22:00. Meglio un testo esatto che
un numero plausibile — è la stessa direzione dell'errore già scelta in `filenames.ts`, dove la data
del nome file è locale e non UTC.

**Vincolo.** Gli importi continuano a passare da `centsToDecimal`, che è aritmetica intera: la
stringa decimale che produce finisce direttamente in `<v>`, e **nessun float esiste mai** lungo il
percorso. La regola ferrea di `model/money.ts` regge anche qui, dove sarebbe stato comodo violarla.

### 4 · Nel foglio **non** si disinnescano le formule

**Decisione.** `neutralizeFormula` non si porta dietro. Una nota che comincia per `=` esce tale e
quale, e c'è un test che lo afferma.

**Perché.** Una cella `t="inlineStr"` non è mai una formula per Excel: lo è solo un `<f>`, e noi non
ne scriviamo nessuno. Ereditare l'abitudine del CSV anteporrebbe un apice a un testo che una persona
ha scritto davvero, cioè **corromperebbe il dato** per difendersi da un rischio che il formato ha già
chiuso. La riga di [trappole.md](conoscenza/trappole.md) sulla trappola gemella — disinnescare le
formule **dopo** aver unito i tag in una cella protegge solo il primo — va aggiornata dicendo che il
`.xlsx` la rende irrilevante, non cancellata: il perché resta istruttivo.

### 5 · Il formato JSON sale a v4 e porta il nome del gruppo

**Decisione.** `VaultExport` guadagna `groupName: string | null` e `app: string`, e
`EXPORT_FORMAT_VERSION` passa a **4**. Il nome arriva a `buildVaultExport` come **parametro**, non
dallo snapshot.

**Perché.** Lo Step 42 ci aveva rinunciato, e la ragione era buona: «`VaultSnapshot` contiene i
cinque insiemi di record, mentre il nome sta in `meta`, che la fotografia non attraversa», e non
valeva alzare la versione del formato per un campo solo. Ora le ragioni sono tre insieme. Il backup
automatico dello Step 65 scriverà **un file per gruppo**, e senza il nome i file sarebbero
distinguibili solo aprendoli. `suggestedName` (`features/import/summary.ts`) propone oggi la data
d'export, che è «l'unica cosa che distingue due file dello stesso vault» — ma solo perché il nome non
c'era. E `app` dice, davanti a un file che si comporta male, con quale versione è stato prodotto. Il
nome si legge da `store.getGroupName()` (`model/store.ts:168`), che il commento lì sopra dichiara
essere la versione autorevole rispetto alla copia nel registro locale.

**Vincolo.** `VaultSnapshot` **non si tocca**: vive in `model/types.ts` perché è `snapshot()` a
produrla, e spostarci dentro il nome farebbe dipendere il modello dall'export invece del contrario.
E la regola dello Step 42 resta intatta — **le versioni vecchie si leggono, quelle future no**: il
parser continua a leggere v1, v2 e v3 coi fallback che ha già.

### 6 · Il backup automatico è una cartella locale, non Drive

**Decisione.** Una cartella scelta **una volta** con `Directory.pickDirectoryAsync()`, il cui URI
resta in `app_meta`. All'apertura dell'app, se dall'ultimo backup è passata la soglia, si scrive il
JSON di **ogni** gruppo in quella cartella, tenendone le ultime tre copie. Drive automatico finisce
fra le cose rimandate.

**Perché.** Su Android la app Drive non tiene una cartella locale sincronizzata, e come fornitore di
documenti non si offre per la concessione di un albero di cartelle: resterebbe l'API Drive, cioè
OAuth, cioè `expo-auth-session` e `expo-web-browser` — non installati, quindi **una build EAS** —
più un progetto Google Cloud e **due** client OAuth, perché il certificato di firma di EAS e quello
di Play sono diversi. Ma la ragione dirimente non è il costo. Il file di backup è **in chiaro**, e
c'è un test in `export/json.test.ts` che verifica che non contenga la chiave del vault proprio
perché lo è. Caricarlo su Drive con l'account dell'app renderebbe «Google legge tutte le spese» il
comportamento di default, in un'app il cui punto dichiarato — [threat-model.md](threat-model.md) — è
che nessun server veda i dati. Col foglio di condivisione, che già oggi manda il file a Drive in un
tocco, quella scelta la fa una persona, file per file. Una cartella locale sotto Nextcloud, Syncthing
o FolderSync esce dal telefono da sé, e resta una decisione di chi installa quelle app.

**Vincolo.** Se `pickDirectoryAsync` non risponde — una build nativa più vecchia di quella funzione —
la schermata deve dirlo e restare usabile: **il backup manuale non deve sparire** in nessun caso. È
lo stesso criterio con cui `/export` ripiega sugli appunti dallo Step 9.

---

## Step 61 — «Il foglio di calcolo prende il posto dei due CSV»

| File                                             | Cosa                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `packages/core/src/export/xlsx/zip.ts`           | **nuovo** — CRC32 e ZIP metodo STORE, deterministico (decisione 2)  |
| `packages/core/src/export/xlsx/parts.ts`         | **nuovo** — le parti OOXML, `escapeXml`, le celle tipate (dec. 2–4) |
| `packages/core/src/export/xlsx/workbook.ts`      | **nuovo** — `buildWorkbook(sheets): Uint8Array`                     |
| `packages/core/src/export/vault-xlsx.ts`         | **nuovo** — `toXlsxExport(snapshot)`: i fogli Spese e Pareggi       |
| `packages/core/src/export/csv.ts`, `csv.test.ts` | **cancellati** (decisione 1)                                        |
| `packages/core/src/export/index.ts`              | esporta `toXlsxExport`, smette di esportare il CSV                  |
| `packages/core/src/hermes-compat.test.ts`        | un giro di `toXlsxExport` senza `TextEncoder` (decisione 2)         |
| `apps/mobile/src/features/export/share.ts`       | `shareBinaryFile(BinaryFile)` accanto a `shareTextFile`             |
| `apps/mobile/src/app/(gruppo)/export.tsx`        | due bottoni invece di tre — oggi sono alle righe 107-140            |
| `apps/mobile/src/i18n/locales/it.ts`, `en.ts`    | `exportScreen`: via le due voci CSV, dentro quella del foglio       |
| `docs/adr/0004-l-xlsx-al-posto-del-csv.md`       | **nuovo**; l'ADR 0003 passa a `Superata da 0004`                    |
| `docs/conoscenza/sync-e-dati.md`, `trappole.md`  | la tabella dei formati, e la riga sulla CSV injection (decisione 4) |

**Esiste già e non si riscrive:** `utf8ToBytes` (`crypto/encoding.ts:23`); `centsToDecimal`
(`csv.ts:36`) e `shareColumnLabels` (`csv.ts:89`), che **si spostano senza cambiare** da `csv.ts` a
`vault-xlsx.ts` portandosi dietro i propri test; `exportFileName(what, 'xlsx', now)`;
`isFileSharingAvailable` e il caricamento pigro dei due moduli nativi.

Le parti OOXML minime sono sei: `[Content_Types].xml` — **primo nello ZIP** —, `_rels/.rels`,
`xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml` e `xl/worksheets/sheetN.xml`. Niente
`sharedStrings.xml`: con `t="inlineStr"` non serve. `styles.xml` deve contenere due `fill` — Excel
pretende `none` e `gray125`, in quest'ordine — e quattro `cellXfs`: normale, data (`numFmtId="14"`),
denaro (un `numFmt` custom `#,##0.00`) e intestazione in grassetto. Riga 1 congelata con
`<pane ySplit="1" state="frozen"/>`, e un `<autoFilter>` sull'intestazione.

### Il punto che non va dimenticato

**Il file esce grande, e nessuna schermata lo dirà.** Senza compressione una riga di spesa in XML
`inlineStr` pesa circa 500-700 byte contro i ~150 della stessa riga in CSV: qualche migliaio di spese
fa qualche megabyte. Si condivide lo stesso, ed è reversibile senza cambiare il formato del file —
basta far passare le voci da STORE a DEFLATE — ma **va misurato in questo step**, non scoperto dopo.
E va detto in che senso non c'entra il relay: `MAX_BLOB_BYTES` è 1 MiB (`services/relay/src/protocol.ts`),
ma il `.xlsx` non passa mai di lì. I due numeri sono vicini abbastanza da confondere chi rileggerà.

### Criterio di «fatto»

Un gruppo con almeno una spesa la cui nota comincia per `=` e un tag con una lettera accentata →
Gruppi → il gruppo → Gestisci → Esporta i dati → «Foglio di calcolo» → il foglio di condivisione si
apre → salva su Drive → apri il file: due fogli, «Spese» e «Pareggi»; la colonna `data` è allineata a
destra e si ordina come data; selezionando la colonna `importo` la somma automatica dà un numero; la
nota mostra `=…` **senza apice davanti**; l'accentata è giusta.

---

## Step 62 — «Il file Excel contiene tutto il gruppo»

| File                                      | Cosa                                          |
| ----------------------------------------- | --------------------------------------------- |
| `packages/core/src/export/vault-xlsx.ts`  | cinque fogli in più, e il foglio «Riepilogo»  |
| `apps/mobile/src/app/(gruppo)/export.tsx` | la riga sotto il bottone elenca i sette fogli |

Sette fogli: **Spese**, **Pareggi**, **Categorie** (id, nome, icona, colore, archiviata), **Budget**
(categoria, mese, limite), **Persone** (id, nome, colore), **Vocabolario** (tipo, nome, cancellato
il) e **Riepilogo**.

**Esiste già e non si riscrive:** il Riepilogo non calcola niente per conto proprio. Usa
`totalsByMonth` (`insights/breakdown.ts:78`), `totalsByCategory` (`:48`), `computeBalances`
(`insights/balance.ts:44`) e `simplifyDebts` (`:102`) — le stesse funzioni che disegnano i grafici e
la schermata dei saldi. È l'unico modo perché i numeri del foglio e quelli a schermo non possano
divergere.

### Il punto che non va dimenticato

**`computeBalances` salta i tombstone, `snapshot()` no.** La riga è `balance.ts:60`,
`if (expense.deletedAt !== null) continue`, e c'è la gemella per i pareggi alla `:68`. Il foglio
«Spese» deve invece mostrarli, con la colonna `cancellata_il` piena: è la copia integrale, ed è la
stessa ragione per cui il JSON li conserva. Ma il «Riepilogo» **non** deve contarli, o i totali del
file smentiranno quelli dell'app, e chi legge non saprà a quale credere. Serve un test che metta una
spesa cancellata nello snapshot e verifichi che compare nel primo foglio e non nell'ultimo.

### Criterio di «fatto»

Un gruppo con due persone, un budget e una spesa cancellata → esporta il foglio → «Riepilogo» mostra
un saldo netto **identico** a quello che l'app mostra in Gruppi → il gruppo → Saldi, alla cifra; la
spesa cancellata c'è in «Spese» con la sua data di cancellazione e **non** entra nel totale del mese.

---

## Step 63 — «Il file di backup dice di che gruppo è»

| File                                         | Cosa                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| `packages/core/src/export/json.ts`           | `EXPORT_FORMAT_VERSION = 4`, `groupName`, `app` (dec. 5) |
| `packages/core/src/export/import.ts`         | legge la v4, e `ImportReport` porta il `groupName`       |
| `apps/mobile/src/features/import/summary.ts` | `suggestedName` preferisce il nome, ripiega sulla data   |
| `apps/mobile/src/app/(gruppo)/export.tsx`    | passa `store.getGroupName()` e la versione dell'app      |
| `apps/mobile/src/app/importa.tsx`            | il riassunto dice «Gruppo: ⟨nome⟩» prima dei conteggi    |

**Esiste già e non si riscrive:** `parseVaultExport` per intero. Si aggiungono due letture difensive
con gli helper che ci sono già (`str`, `nonEmptyStr`) e **nessun nuovo livello di rifiuto**: il nome
è un metadato, non un record, e un nome assente non è un file da respingere. La versione dell'app si
legge con `Constants.expoConfig?.version`, già usata così in `app/(tabs)/tu.tsx:390`.

### Il punto che non va dimenticato

**Un file v3 non ha il nome, e non è un errore.** `groupName` va letto come `null`, esattamente come
lo Step 42 legge `store` e `tags` di un file v1 con i fallback `''` e `[]`: è la stessa additività,
vista dallo stesso lato. E il test che **rifiuta una versione futura** va spostato da «4» a «5»,
altrimenti resta verde smettendo di provare ciò che prova — il modo più silenzioso in cui un test
può morire.

### Criterio di «fatto»

Rinomina un gruppo in «Casa» → esporta il JSON → aprilo in un editor di testo: ci sono
`"groupName": "Casa"`, `"version": 4` e `"app": "1.0.0"` → torna in JuTrack, `/importa`, incolla → il
riassunto dice «Casa», e il campo del nome è già compilato con «Casa» invece che con la data.

---

## Step 64 — «Il backup si sceglie da un file, non si incolla»

| File                                          | Cosa                                                              |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `apps/mobile/src/features/import/pick.ts`     | **nuovo** — `pickJsonFile()`: `File.pickFileAsync` in `try/catch` |
| `apps/mobile/src/app/importa.tsx`             | il bottone «Scegli il file»; gli appunti restano come ripiego     |
| `apps/mobile/src/app/backup.tsx`              | **lo stesso bottone**, per il ripristino della chiave             |
| `apps/mobile/src/i18n/locales/it.ts`, `en.ts` | le voci nuove                                                     |
| `docs/conoscenza/trappole.md`                 | la riga sul modulo nativo che oggi non serve più                  |

**Esiste già e non si riscrive:** lo schema di `loadFileSystemModule` (`features/export/share.ts:23`)
— stesso `require` in `try/catch`, stesso `markError`, stessa resa `null` che fa ripiegare la
schermata invece di romperla. `parseVaultExport` non cambia di una riga: cambia soltanto **da dove
arriva il testo**.

### Il punto che non va dimenticato

**`pickFileAsync` è una funzione nativa, e gli aggiornamenti via etere non portano codice nativo.**
La development build del 5 settembre contiene `expo-file-system@57.0.1` e quindi dovrebbe averla —
ma «dovrebbe» non basta per una funzione che, se manca, lancia. Il `try/catch` deve avvolgere **la
chiamata**, non solo il `require`: un modulo che si carica e poi non ha il metodo è precisamente il
caso che il pattern dello Step 9 non copre, perché allora il rischio era che mancasse il modulo
intero. `/backup` e `/importa` restano coerenti fra loro, come deciso allo Step 42: se il bottone
arriva, arriva in tutt'e due.

### Criterio di «fatto»

`/importa` → «Scegli il file» → il selettore di sistema si apre → scegli un `jutrack-vault-*.json`
salvato su Drive → il riassunto compare **senza** aver incollato niente → «Importa» → il gruppo nuovo
c'è, con lo stesso numero di spese che il riassunto aveva dichiarato. Poi, in modalità aereo: ripeti.
Funziona lo stesso, perché il file è già sul telefono.

---

## Step 65 — «Una cartella scelta una volta, e il backup ci finisce da solo»

| File                                             | Cosa                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `apps/mobile/src/features/backup/folder.ts`      | **nuovo** — l'URI della cartella in `app_meta`, scelta e revoca  |
| `apps/mobile/src/features/backup/auto.ts`        | **nuovo** — `reviewAutoBackup()`: pura, decide soltanto se è ora |
| `apps/mobile/src/features/backup/AutoBackup.tsx` | **nuovo** — l'aggancio al ciclo di vita, come `BackupWatcher`    |
| `apps/mobile/src/app/(tabs)/tu.tsx`              | sezione «Dati»: la cartella, l'ultimo backup, «Fallo adesso»     |
| `apps/mobile/src/app/_layout.tsx`                | monta `AutoBackup`, accanto agli altri quattro                   |

**Esiste già e non si riscrive:** la forma di `notifications/backup.ts` — `parseBackupMarks` (`:78`),
`pruneBackupMarks` (`:117`), `settle` (`:215`) e la regola dichiarata lì sopra, «un segno illeggibile
vale _mai fatto_, perché sbagliare dall'altra parte produce silenzio su dei dati a rischio». Si
ricalca con `vaultId → { lastBackupAt, expensesAtBackup }`. Poi `GroupRegistry.list()`
(`state/groups.ts:151`) per i gruppi, `toJsonExport` per il contenuto ed `exportFileName` per il
nome. I file si chiamano `jutrack-⟨nome-gruppo⟩-⟨AAAA-MM-GG⟩.json`, e se ne tengono **le ultime tre**
per gruppo.

### Il punto che non va dimenticato

**Una cartella SAF è un `content://`, non un `file:///` — e non è quello che la documentazione di
`Directory` descrive** («a `file:///` URI representing an arbitrary location»). `pickDirectoryAsync`
dichiara però di restituire proprio un content URI su Android
(`NativeFileSystem.types.ts:144`), e questo è il punto **meno provato dell'intero piano**. Se
`new File(directory, name).create()` non funzionasse su un content URI, il ripiego è
`StorageAccessFramework.createFileAsync` di `expo-file-system/legacy`, che quel caso lo gestisce da
sempre. **Va provato per primo**, prima di scrivere qualunque altra riga di questo step: se cade
quello, cade la forma della schermata.

E c'è un secondo punto. Scrivere lo snapshot di un vault mentre la sincronizzazione sta applicando un
update produce un file coerente ma vecchio di un istante — innocuo — mentre farlo **a ogni apertura**
per tre gruppi con migliaia di spese è lavoro vero sul thread JS, cioè un'app che parte lenta. La
soglia serve anche a questo, e la scrittura va fatta **dopo** che l'interfaccia è disegnata.

### Criterio di «fatto»

Tu → Dati → «Scegli una cartella» → seleziona `Documenti/JuTrack` → la riga dice «Backup automatico:
ogni 7 giorni in Documenti/JuTrack» → «Fai un backup adesso» → apri Files: c'è un file per **ogni**
gruppo, e il nome del gruppo è dentro il nome del file. Poi: **chiudi l'app dal menu dei recenti e
riaprila** → la riga nomina ancora la cartella e non richiede il permesso. È questo secondo gesto a
provare che il permesso è persistente davvero, e nessun test può farlo al posto suo.

---

## Step 66 — «L'app dice quando il backup invecchia»

| File                                                           | Cosa                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/mobile/src/features/notifications/data-backup.ts`        | **nuovo** — `reviewDataBackup()`, `dataBackupContent()` |
| `apps/mobile/src/features/notifications/DataBackupWatcher.tsx` | **nuovo** — sulla forma di `BackupWatcher.tsx`          |
| `apps/mobile/src/features/notifications/settings.ts`           | il quinto interruttore                                  |
| `apps/mobile/src/app/(tabs)/settings.tsx`                      | la riga dell'interruttore                               |
| `apps/mobile/src/i18n/locales/it.ts`, `en.ts`                  | titolo e corpo dell'avviso                              |

**Esiste già e non si riscrive:** tutta l'impalcatura dei quattro avvisi — `AlertContent`
(`notifications/content.ts`), `schedule.ts`, `useNotifications.ts`, `settings.ts` — e il criterio
dichiarato a `notifications/backup.ts:157`: «la funzione non sa se l'interruttore è acceso, ed è
voluto», perché i segni vanno tenuti aggiornati comunque, o riaccenderlo racconterebbe da capo una
cosa che si era scelto di non farsi raccontare.

### Il punto che non va dimenticato

**È il quinto avviso, ed è di una forma che i primi quattro non hanno.** Il commento in cima a
`notifications/backup.ts:4-17` la classifica già: il promemoria (31) è una **scadenza**, il budget
(32) una **condizione**, la sincronizzazione ferma (33) una condizione **su una scadenza**, la chiave
non salvata (43) una condizione **che non torna più indietro** — «un backup fatto oggi vale per
sempre», perché la `vaultKey` è generata una volta sola e non cambia mai.

**Per i dati quella frase è falsa**: un backup di ieri invecchia a ogni spesa nuova. Questo è quindi
l'unico avviso che si **riarma**, e la soglia va misurata in **spese entrate dopo l'ultimo backup**,
non in giorni — un gruppo fermo da due mesi non ha niente da salvare, e avvisarlo insegnerebbe a
ignorare l'avviso. Copiare `backup.ts` importerebbe la regola «salvato una volta, fuori dal giro per
sempre», che qui è esattamente il difetto da evitare.

### Criterio di «fatto»

Interruttore acceso e backup appena fatto → inserisci cinque spese e chiudi l'app → alla riapertura
successiva oltre la soglia arriva una notifica che nomina **il gruppo** e dice quante spese non sono
nel backup → toccandola si apre Tu → Dati. Fai il backup: la notifica non si ripete. Aggiungi altre
cinque spese: torna.

---

## Cosa questo piano ha deciso di NON fare

- **Rimandato: il backup su Google Drive.** Costa una build EAS (`expo-auth-session` e
  `expo-web-browser` non sono installati), un progetto Google Cloud e due client OAuth, perché il
  certificato di firma di EAS e quello di Play sono diversi. Si riapre se, con la cartella locale in
  funzione, si osserva che i file non escono mai dal telefono. E allora **prima** va decisa la voce
  qui sotto, non dopo.
- **Rimandato: cifrare il file di backup dei dati.** Oggi è in chiaro di proposito, e
  `export/json.test.ts` verifica che non contenga la chiave del vault. Diventa necessario solo se il
  file comincia a viaggiare verso un servizio di terzi — cioè insieme alla voce qui sopra.
- **Rimandato: la compressione DEFLATE nel `.xlsx`.** Si aggiunge senza cambiare il formato del
  file, quindi non è una decisione da prendere ora. Il segnale è la misura dello Step 61.
- **Rimandato: il backup mentre l'app è chiusa.** Servirebbe `expo-background-task`, cioè un modulo
  nativo e una build. Quello che questo piano fa è «alla riapertura», e le schermate devono dirlo
  con quelle parole e non con «automatico» e basta.
- **Non si tocca: leggere un `.xlsx`.** Un export tabellare è appiattito e non reimportabile: è la
  conseguenza dichiarata nell'[ADR 0003](adr/0003-formati-di-export.md), «non un difetto da
  correggere», e resta vera per il `.xlsx` esattamente come per il CSV. Il formato che rientra è il
  JSON, ed è uno solo.
- **Non si tocca: fondere un import dentro un gruppo esistente.** `VaultStore.importSnapshot` chiama
  `assertEmpty()` (`model/store.ts:645`), e lo Step 42 ha scritto perché: gli id coincidenti
  sovrascriverebbero e gli altri si affiancherebbero — una fusione che nessuno ha chiesto, e che per
  una spesa cambierebbe dei saldi.
- **Non si tocca: il backup della chiave.** `/backup`, `crypto/backup.ts` e l'avviso dello Step 43
  restano quelli che sono. L'unica cosa che cambia è che anche lì si potrà **scegliere un file**
  invece di incollare (Step 64).

## Riepilogo

| Step | Cosa                                             | Rischio                                                   | Build EAS |
| ---- | ------------------------------------------------ | --------------------------------------------------------- | --------- |
| 61   | Il `.xlsx` al posto dei due CSV, motore compreso | Excel rifiuta il file per un dettaglio OOXML              | No        |
| 62   | Gli altri cinque fogli, e il Riepilogo           | Basso — riusa `insights/` senza ricalcolare niente        | No        |
| 63   | Il formato JSON v4, col nome del gruppo          | Basso — additivo, il parser legge già le versioni vecchie | No        |
| 64   | L'import sceglie un file                         | `pickFileAsync` assente nella build installata → ripiego  | No        |
| 65   | La cartella, e il backup che si scrive da sé     | **Alto** — scrivere su un `content://` è tutto da provare | No        |
| 66   | L'avviso «il backup invecchia»                   | Basso — quinta istanza di uno schema già collaudato       | No        |

Baseline di partenza: **1359 test verdi** (665 core + 640 app + 54 relay), `typecheck`, `lint` e
`format:check` puliti. Lo Step 61 **abbassa** il conteggio, perché cancella `csv.test.ts`: va detto
nella sua voce di devlog, o il numero sembrerà una regressione a chi rileggerà.
