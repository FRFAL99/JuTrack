# Devlog

Registro cronologico dell'avanzamento. Entry in ordine cronologico inverso (più recente in alto).

---

## 2026-08-01 — L'app gira sul telefono: il bloccante era Metro nella directory sbagliata

**Risolto.** Development build EAS installata su Android, **Diagnostica: 14 passaggi su 14, «TUTTO
OK»**. Yjs, `Y.Doc` con lo shim lib0/webcrypto, crypto su Hermes vero, XChaCha20-Poly1305, SQLite,
SecureStore, relay in produzione (HTTP 200), invito di pairing, QR 45×45 moduli, fotocamera.

**La causa**

```
node /home/frfal/frfal/JuTrack/node_modules/.bin/expo start --tunnel --clear
                              ^^^^^^^^^^^^^^ nessun progetto Expo qui
```

Metro girava dalla **root del monorepo** invece che da `apps/mobile`. Da lì non esistono `app.json`
né `src/app`: l'entry point `expo-router/entry` veniva risolto con origine `/…/JuTrack/.` e non si
trovava. Il server rispondeva **404 a ogni richiesta di bundle**. Nessun bundle → nessun JavaScript
→ nessun motore su `/json/list` → nessuna schermata rossa, perché non c'era niente che potesse
fallire.

Aggravante: quel processo era vivo dalle 13:09 e ha attraversato ore di tentativi. Ogni prova
ripartiva dal telefono, mai dal server — che nel frattempo aveva anche la mappa dei file invalidata
da una reinstallazione delle dipendenze avvenuta sotto di lui.

**L'errore di metodo, che vale più di quello tecnico**

Il 404 sul bundle era visibile dal primo giorno. È stato letto come *sintomo* («il bundle non
arriva») invece che come *causa* («il server non sa dove sia il progetto»). La domanda mancante non
era «perché il telefono rifiuta il bundle», ma **«da quale directory sta rispondendo questo
server?»**.

Quando un client non riceve nulla, si verifica cosa serve il server prima di indagare cosa fa il
client. E un demone di sviluppo lasciato in esecuzione va riavviato prima di dichiarare riprodotto
un problema.

**Corretto anche lungo la strada: due copie di React**

`expo-doctor` segnalava `react@19.2.3` in `apps/mobile` e `react@19.2.8` nella root — i pacchetti
`expo-*` dichiarano `"react": "*"` e npm risolveva con l'ultima pubblicata. In una build nativa gli
hook finirebbero su un'istanza diversa da quella che ha creato il componente. Risolto con
`overrides` nella root; il lock è stato rigenerato, perché l'entry precedente era una peer risolta
automaticamente e gli override non riscrivono ciò che è già nel lock.

Non era la causa del blocco — l'app non arrivava a eseguire un solo hook — ma era un bug vero, e
ora `expo-doctor` dà 20/20.

**Cosa resta da provare su hardware**

Sync fra due telefoni fisici, scansione ottica del QR, persistenza fra due riavvii, le schermate
degli Step 7 e 8 toccate a mano, l'APK autonomo senza Metro.

---

## 2026-08-01 — Step 8: split, saldo, budget, grafici

**Fatto**

`packages/core/src/insights/`: saldo per membro e debiti semplificati (`balance.ts`), totali per
categoria e per mese (`breakdown.ts`), stato dei budget (`budget.ts`), aritmetica dei mesi civili
(`period.ts`). Nell'app: schermata Statistiche con selettore del mese, totale, saldo «chi deve quanto
a chi», barre per categoria e andamento a sei mesi; schermata dei pareggi; schermata dei budget;
quote libere nel form della spesa.

**Decisioni prese**

- **Il saldo è cumulativo, non mensile.** Un debito non si azzera cambiando pagina del calendario.
  Le altre viste sono per mese; questa no, e la differenza è deliberata.
- **I pareggi non toccano le spese.** Le spese restano lo storico di cosa è stato comprato; il
  pareggio sposta solo il saldo. Senza una schermata per registrarli, il debito calcolato
  crescerebbe all'infinito anche dopo essere stato pagato davvero.
- **`simplifyDebts` è greedy ma stabile.** Non minimizza in assoluto il numero di pagamenti — il
  problema è NP-difficile — ma evita il giro «A paga B, B paga C» quando basta «A paga C», e a
  parità di importo decide l'id: i due telefoni devono proporre lo **stesso** pagamento, non due
  frasi contraddittorie.
- **I mesi senza spese restano in asse, a zero.** Ometterli comprimerebbe l'asse del tempo: due
  barre affiancate sembrerebbero mesi consecutivi anche a distanza di un anno.
- **Le barre delle categorie sono rapportate alla voce più alta, non al totale**, altrimenti il
  confronto fra le voci sparirebbe dentro una frazione minuscola.
- **Il form costruisce lo split completo.** Prima la regola «mode coerente con shares» era duplicata
  in due schermate: il modo più rapido per farle divergere.
- **I limiti di budget non si ereditano da soli** da un mese all'altro; c'è un «copia dal mese
  scorso» che rende comodo il caso frequente senza fingere che sia automatico.
- Il testo digitato nei campi vive nello stato locale e finisce nel documento solo al termine:
  scrivere a ogni tasto genererebbe un update Yjs per carattere, e ogni update viaggia cifrato
  verso il relay.

**La palette delle categorie era inadatta a un grafico, ed è stato misurato**

I colori del seed erano stati scelti a occhio, quando servivano solo come pallino accanto a un nome.
Diventando barre, sono passati da decorazione a informazione. Un validatore di palette ha mostrato
che **Svago e Viaggi erano indistinguibili anche a vista piena** (ΔE 5,8 su una soglia di 15): due
teal quasi identici. Altri difetti: `#0C8599` sotto la soglia di saturazione (leggeva grigio) e
coppie non separabili in deuteranopia.

Palette rivista e verificata su **entrambi i temi** — banda di luminosità, saturazione, separazione
per protanopia/deuteranopia/tritanopia, contrasto sullo sfondo: tutti i controlli passano in chiaro
e in scuro. Il giallo è stato il vincolo più stretto: le bande accettabili su fondo chiaro e su fondo
scuro quasi non si intersecano, e i colori sono dati nel vault — uno solo per entrambi i temi, non
due varianti.

Vale la pena dirlo: il cambio è a costo zero **solo adesso**. Il seed gira una volta sola, al primo
avvio, e l'app non è ancora mai partita su un telefono. Dopo il primo avvio quei colori sarebbero
diventati dati dell'utente.

Nessun grafico affida però l'identità al colore: ogni barra porta icona, nome e importo. È ciò che
la rende leggibile a prescindere dalla vista di chi guarda — e ciò che permette di ordinare le barre
per importo senza rendere ambiguo nulla.

**Verifica**

371 test verdi (289 core + 47 app + 35 relay), typecheck e lint puliti, `expo export` completato.

**Non ancora verificato su hardware**: nessuna di queste schermate è mai stata toccata con un dito.

---

## 2026-08-01 — Step 7: pairing via QR

**Fatto**

`packages/core/src/pairing/`: costruzione e lettura dell'URI `jutrack://pair?v=1&k=…&e=…`, con
versione, chiave in base64url e scadenza. Nell'app: schermata che mostra il QR (dopo conferma
esplicita, con conto alla rovescia), scanner con `expo-camera`, campo per incollare il codice come
alternativa, e una rotta che raccoglie il deep link `jutrack://pair` aperto dal lettore QR di
sistema. Il QR è disegnato con `qrcode-generator` e `react-native-svg`.

**Decisioni prese**

- **Nell'URI viaggia solo la chiave radice.** `vaultId`, `contentKey` e `authKey` sono tutte derivate
  con HKDF: trasmetterle allungherebbe il QR per dati che il ricevente ricava da sé, e un `vaultId`
  incoerente con la chiave produrrebbe un vault muto.
- **Vince la prima occorrenza di ogni parametro.** Accodare `&k=<chiave dell'attaccante>` a un
  invito legittimo non deve poter dirottare il pairing.
- **La scadenza tollera un minuto di sfasamento fra i due orologi.** I telefoni non ne condividono
  uno: senza tolleranza, mezzo minuto di deriva farebbe rifiutare un QR appena generato con un
  messaggio di scadenza incomprensibile.
- **Una scadenza assente o illeggibile vale «nessuna scadenza», non «scaduto».** È una cortesia, non
  una difesa: sta dentro l'URI, quindi chi ha copiato il contenuto può toglierla comunque.
- **`parsePairingUri` restituisce un esito tipizzato invece di sollevare.** L'input arriva da una
  fotocamera puntata sul mondo: un QR sbagliato è un evento ordinario da spiegare, non un guasto.
- **Il conto alla rovescia si ricalcola dall'orologio a ogni tick**, non si decrementa: dopo una
  sospensione del telefono un contatore decrementato mostrerebbe come valido un invito già scaduto.
- **Sfondo bianco e moduli scuri anche in tema scuro**: i lettori si aspettano il contrasto canonico
  e un codice invertito viene spesso ignorato in silenzio.

**`expo-camera` è caricato pigramente, e non è un vezzo**

expo-router importa **tutte** le route all'avvio. Un `import` in cima allo scanner verrebbe eseguito
al boot, e su una build in cui il modulo nativo della fotocamera manca o fallisce l'inizializzazione
porterebbe giù l'intera app — non solo quella schermata. Con l'app che già non parte sul telefono
per cause esterne, aggiungere una nuova causa di crash al boot sarebbe stato un pessimo affare. Il
`require` in `try/catch` confina il guasto: la schermata dichiara «fotocamera non disponibile» e il
pairing si completa incollando il codice.

Conseguenza secondaria: i permessi passano dall'API imperativa `Camera.requestCameraPermissionsAsync`
e non dall'hook `useCameraPermissions`, che pure sarebbe la via documentata — un hook va chiamato a
ogni render, e qui il modulo potrebbe non esistere affatto. Quell'API è marcata `@hidden` a monte,
quindi l'accesso è difensivo: se sparisce, resta il campo per incollare.

**Il lettore QR di sistema è il gesto naturale, e va assecondato**

Chi vede un QR inquadra con la fotocamera del telefono, non cerca lo scanner dentro l'app. Quel
percorso apre `jutrack://pair?…` su una rotta che, senza una schermata dedicata, avrebbe mostrato un
errore di rotta inesistente — e la conclusione sarebbe stata «il pairing non funziona». La rotta
`/pair` ora lo raccoglie e chiede **la stessa** conferma della scansione interna: arrivare da un link
non deve rendere l'adozione più silenziosa.

**Verifica**

306 test verdi (238 core + 33 app + 35 relay), typecheck e lint puliti, `expo export` completato.
Fra i test dell'app c'è la generazione del QR con `TextEncoder` e `Buffer` rimossi dai global: è
l'unico punto in cui una libreria di terze parti tocca la chiave del vault, e su Hermes quei global
non esistono.

**Non ancora verificato su hardware**: il ciclo completo fra due telefoni fisici, che resta il
banco di prova vero di questo step.

---

## 2026-08-01 — Step 6: motore di sincronizzazione

**Fatto**

`packages/core/src/sync/`: `RelayClient` (cifra in uscita, decifra in ingresso) e `SyncEngine`
(ciclo pull → applica → push, cursore persistito, coda offline, backoff esponenziale).
Adattatori nell'app: `expoHttp` (fetch con timeout), `SqliteSyncStore` (cursore e coda su SQLite),
gestione della chiave del vault, indicatore di stato nelle Impostazioni.

**Decisioni prese**

- **Prima si scarica, poi si invia.** Al contrario, un dispositivo rimasto offline a lungo
  caricherebbe la propria storia prima di conoscere quella dell'altro, allungando il log del relay
  senza alcun vantaggio.
- **Si rimuovono dalla coda solo gli update accettati.** Il relay ne accetta 100 per richiesta: con
  150 in coda, svuotarla dopo il primo lotto perderebbe 50 spese in silenzio.
- **Un ciclo alla volta.** Due cicli concorrenti invierebbero gli stessi update due volte.
- **Gli errori permanenti (401/403/400/413) non vengono ritentati con backoff breve**: reinviare la
  stessa richiesta produrrebbe lo stesso esito, consumando batteria e quota.
- **Il cursore avanza anche se una pagina è interamente indecifrabile**, altrimenti verrebbe riletta
  a ogni giro e la sincronizzazione resterebbe bloccata per sempre.
- **Il sync parte solo se esiste una chiave.** Senza, l'app resta un tracker locale pienamente
  funzionante: è uno stato legittimo, non un errore.

**Una scoperta importante: un buco nel log blocca più di quanto sembri**

Due test fallivano, e la mia aspettativa era sbagliata — non il codice. Verificato il comportamento
reale di Yjs con un update mancante:

```
saltando il 2° update:      [ 'id0' ]           ← id2 NON compare
dopo aver colmato il buco:  [ 'id0', 'id1', 'id2' ]
```

Yjs **trattiene** gli struct che dipendono da un update mancante. Quindi un singolo blob corrotto non
perde una spesa: **blocca tutte quelle registrate dopo da quel dispositivo**. E poiché il blob
corrotto non è decifrabile, senza rimedio la sincronizzazione resterebbe ferma per sempre.

Aggiunto il recupero: quando un dispositivo rileva blob indecifrabili, **ripubblica il proprio stato
completo**. Uno snapshot non ha dipendenze mancanti, quindi applicarlo colma qualunque buco. Facendolo
entrambi i dispositivi quando rilevano corruzione, il vault si ripara da solo. Con test dedicato che
verifica il recupero completo delle tre spese, senza duplicati.

Questa è la ragione per cui vale la pena indagare un test che fallisce invece di adattarne le
aspettative: la correzione ha portato a una funzionalità mancante, non a un numero cambiato.

**Il relay finto replica i vincoli di quello vero**

`FakeRelay` implementa log append-only, `since` esclusivo, paginazione con `hasMore` e limite di 100
blob per richiesta — gli stessi del relay reale. Un fake più permissivo del server darebbe test verdi
e sincronizzazione rotta in produzione.

**Verifica:** typecheck pulito su 3 workspace, **277 test verdi** (215 core + 27 app + 35 relay),
lint pulito, bundle Android da 1368 moduli.

**Non ancora verificato sul dispositivo:** vale quanto scritto in
[troubleshooting-avvio-app.md](troubleshooting-avvio-app.md). Il sync è coperto da test contro un
relay finto fedele e da una prova end-to-end contro quello reale, ma il ciclo completo su due
telefoni fisici resta da fare.

**Prossimo:** Step 7 — pairing via QR, che è ciò che permette al secondo telefono di ricevere la
chiave.

---

## 2026-08-01 — Relay in produzione; l'app non parte ancora sul telefono

**Relay: online e verificato**

Deploy su Cloudflare: **https://jutrack-relay.jutrack-relayfrfal.workers.dev**

Il primo deploy era riuscito ma irraggiungibile: l'account non aveva mai registrato un sottodominio
`workers.dev`. Diagnosticato osservando che il nome risolveva **solo su IPv6** e che il TLS falliva.
Non è un errore di configurazione del progetto — `wrangler` lo aveva segnalato, ma il comando
`wrangler subdomain` non esiste più nella versione 4: è diventata un'azione da dashboard.

Rieseguita contro il relay reale la stessa prova end-to-end fatta in locale: update Yjs veri,
cifrati, spediti su Cloudflare, documento ricostruito dall'altra parte. Tutto verde, incluso il
controllo che un update **non** cifrato esporrebbe la nota in chiaro mentre quello cifrato no.

Verificato anche con `wrangler tail` che i log operativi non espongano i payload: il `vaultId`
compare `REDACTED`, i corpi delle richieste non vengono registrati. Precisazione onesta: questo prova
che il _logging_ di Cloudflare non perde nulla, non la cifratura — quella è dimostrata dalla prova
precedente.

**App: ancora non parte, e la causa è fuori dal nostro codice**

Indagine completa in [troubleshooting-avvio-app.md](troubleshooting-avvio-app.md). In sintesi.

Il dato decisivo: `curl http://localhost:8081/json/list` restituisce `[]`. Quell'endpoint elenca i
motori JavaScript collegati a Metro, ed **è sempre stato vuoto**. Il telefono non ha mai eseguito una
riga del nostro codice. Ogni correzione all'applicazione era quindi inutile per definizione: non
stava fallendo, non stava partendo.

Escluso con prove: bug nel nostro codice (app ridotta al **livello 0** — solo expo-router e React
Native — crasha comunque), errori di compilazione (bundle HTTP 200 da 6,2 MB), incompatibilità di
bytecode Hermes (il bundle servito è JavaScript, non bytecode), rete locale e firewall (riprovato via
**tunnel pubblico**, con manifest e bundle verificati dall'esterno).

**Due bug veri trovati lungo il percorso, nessuno dei due era la causa**

1. **`TextEncoder` non esiste su Hermes**, e `utf8ToBytes` di noble lo usa internamente. Expo
   installa `TextDecoder` e `TextEncoderStream` ma non `TextEncoder`. Riprodotto rimuovendo il global
   in Node. Corretto scrivendo la codifica UTF-8 nel core, con `hermes-compat.test.ts` a presidio.
   La regola ESLint che vietava `TextEncoder` guardava il nostro codice ma non le dipendenze: ora
   vieta anche l'import di `utf8ToBytes` da noble.
2. **Metro annunciava `127.0.0.1` come host del bundle.** Il telefono scaricava il manifest da
   `192.168.1.6` e poi cercava il bundle su sé stesso. Corretto con
   `REACT_NATIVE_PACKAGER_HOSTNAME`, ma l'app continua a chiudersi: non era (solo) questo.

**Lezione di metodo.** La correzione di `TextEncoder` era giusta ma non stava risolvendo il sintomo,
e me ne sono accorto solo notando che i log non mostravano _alcun_ errore JavaScript — incompatibile
con un'eccezione in `deriveVaultKeys`. Il passaggio utile è stato smettere di correggere e ridurre
l'app al minimo che **deve** funzionare. Se avessi cominciato da lì avrei risparmiato diversi giri.

**Predisposto per il prossimo tentativo**

- `eas.json` con profilo `development` (APK) ed `expo-dev-client` installato: la build avviene nel
  cloud, quindi non serve l'SDK Android in locale, e produce un APK autonomo che aggira Expo Go.
  Richiede `npx eas login`.
- **Impostazioni → Diagnostica** (`/probe`): carica un sottosistema alla volta con import dinamici e
  mostra dove si interrompe. Primo posto da guardare quando la build sarà installata.

**Stato:** 245 test verdi, typecheck e lint puliti, relay in produzione. Step 6 in attesa del via.

---

## 2026-08-01 — Step 5: relay Cloudflare

**Fatto**

Worker che instrada al Durable Object del vault (`idFromName`, deterministico: nessun registro
centrale). `VaultRoom` con backend SQLite conserva un log append-only di blob opachi. Rotte
`POST/GET /v1/vault/:id/updates`, `DELETE /v1/vault/:id/vault`, `/health`.

**Decisioni prese**

- **Autenticazione trust-on-first-use.** Il primo client a scrivere registra `SHA-256(authToken)`;
  i successivi devono presentarne uno che produca lo stesso hash, confrontato in tempo costante.
  Il relay non conosce mai `contentKey`.
- **Il `vaultId` è validato nel Worker**, prima di raggiungere il Durable Object. Senza, chiunque
  potrebbe far istanziare un DO per ogni stringa inventata, consumando quota.
- **Validazione totale prima di scrivere alcunché.** Se un solo blob della richiesta è invalido non
  se ne inserisce nessuno: un inserimento parziale lascerebbe il client incerto su cosa sia passato.
- **Paginazione con un elemento in più del limite** per calcolare `hasMore` senza una `COUNT`
  aggiuntiva.
- **`toArray()` invece di `raw()`** sulle query: accesso alle colonne per nome, così un cambio
  nell'ordine della `SELECT` non produce silenziosamente valori scambiati.

**Un bug che solo il runtime reale poteva mostrare**

`storage.deleteAll()` su un Durable Object con backend SQLite **elimina anche le tabelle**, non solo
le chiavi. Lo schema si crea nel costruttore, che però non viene rieseguito finché l'istanza resta
viva: dopo una `DELETE`, ogni richiesta successiva a quel vault falliva con `no such table`. Una
cancellazione avrebbe rotto il vault in modo permanente.

I test girano dentro **workerd** con Durable Object e SQLite veri, proprio per questo: con dei mock
si sarebbe verificata solo la nostra idea di come funziona un DO. Aggiunto un test di regressione
che pretende che il vault resti utilizzabile dopo la cancellazione.

**Verifica end-to-end contro un relay in esecuzione**

`services/relay/scripts/e2e-check.mts` (`npm run e2e` nel workspace) non prova il protocollo in
astratto: cifra update Yjs **reali** con il nostro crypto, li fa transitare da `wrangler dev` e
ricostruisce il documento dall'altra parte. Tutto verde:

- il dispositivo B riceve tutte le spese e ottiene uno stato identico ad A;
- **un update non cifrato ESPONE la nota in chiaro, quello cifrato no.** Questo controllo preliminare
  è deliberato: senza, l'asserzione «nessuna nota in chiaro sul relay» passerebbe anche cercando una
  stringa che non compare mai, dando una falsa sensazione di sicurezza;
- un blob manomesso viene respinto, un altro vault non può decifrare;
- blob oltre 1 MB rifiutato con 413;
- rinviare gli stessi update non duplica le spese.

**Toolchain**

`@cloudflare/vitest-pool-workers` 0.20 (per vitest 4) **non espone più `defineWorkersConfig` da
`./config`**: si usa il plugin `cloudflareTest`. Il package include un codemod `vitest-v3-to-v4` che
documenta la migrazione. `cloudflare:test` tipizza `env` come `Cloudflare.Env`: i binding sono
dichiarati una volta sola in `src/env.d.ts` e `src/index.ts` li riesporta.

Nella flat config di ESLint **vince l'ultima regola che corrisponde**: un override piazzato prima del
blocco generale non ha effetto. Costato un giro di verifica.

**Verifica:** typecheck pulito su 3 workspace, **222 test verdi** (172 core + 15 app + 35 relay),
lint pulito, e la prova end-to-end cifrata contro un relay reale.

**Non ancora fatto:** il deploy su Cloudflare. Richiede l'account di Francesco (`wrangler login`).

**Prossimo:** Step 6 — sync engine sul client.

---

## 2026-08-01 — Step 4: UI spese e categorie (offline)

**Fatto**

`VaultProvider` apre il database, ricostruisce il `Y.Doc` e lo espone all'app. Lista spese
raggruppata per giorno con totali, form di creazione e modifica, eliminazione con conferma,
gestione categorie, gestione persone. Categorie di default create al primo avvio.

**Decisioni prese**

- **Il rendering è bloccato finché il vault non è caricato.** Senza, la lista comparirebbe vuota per
  un istante prima di popolarsi — e in caso di errore sembrerebbe un vault senza dati, nascondendo
  il guasto. Ora un errore di apertura del database si vede, con il messaggio selezionabile.
- **Le categorie si archiviano, non si cancellano.** Le spese passate continuano a riferirle e
  resterebbero orfane. La conferma dice quante spese usano quella categoria e che restano invariate.
- **Il seed controlla se esiste già qualcosa.** Senza, ogni avvio aggiungerebbe un set di categorie
  e dopo il sync i due dispositivi ne avrebbero il doppio.
- **L'errore sull'importo compare solo dopo il primo tentativo di invio**, non mentre si digita la
  prima cifra.
- **Anteprima delle quote nel form** («5,00 € / 5,01 € a testa» quando l'importo è dispari): mostrare
  la differenza di un centesimo evita che sembri un errore di calcolo.
- La schermata di modifica gestisce il caso in cui la spesa **non esiste più**: può succedere
  davvero, se l'altro dispositivo l'ha cancellata mentre la schermata era aperta.

**Reattività: la trappola di `useSyncExternalStore`**

`getSnapshot` deve restituire un valore **stabile** fra un cambiamento e l'altro. Restituire
direttamente la lista delle spese darebbe un array nuovo a ogni chiamata, che React interpreta come
"cambiato": ciclo di render infinito. Si restituisce quindi un contatore di versione, e le liste si
derivano con `useMemo`.

Il contatore vive nel `VaultProvider` e non in un hook: l'observer sul documento va registrato una
volta sola. La prima stesura lo registrava dentro `getSnapshot`, che React chiama in fase di render —
un effetto collaterale nel render, riscritto prima di committare.

`exhaustive-deps` segnalava `version` come dipendenza inutile, perché non compare nel corpo del memo.
Ma è l'unica cosa che rende reattivo il calcolo: le liste si leggono da un `Y.Doc` mutabile, la cui
identità non cambia mai. Risolto con una funzione `dependsOnDocument(version)` che la legge
esplicitamente, invece di disabilitare la regola — così il motivo resta scritto nel codice.

**Trappola di fuso orario nelle date**

`todayIso` costruisce la data dai componenti **locali**, non da `toISOString()`. Quest'ultimo
converte in UTC: alle 23:30 in Italia restituirebbe già il giorno successivo, e una spesa registrata
la sera comparirebbe sotto «domani». C'è un test dedicato. `formatDayTitle` costruisce le date a
mezzogiorno per la stessa ragione: a mezzanotte l'ora legale può spostare il giorno.

**Verifica:** typecheck pulito, 187 test verdi (172 core + 15 app), lint pulito senza warning,
bundle Android da 1354 moduli.

**Non ancora verificato: l'esecuzione su Hermes**

In questo ambiente non c'è un SDK Android né un emulatore, quindi l'app non è mai stata _eseguita_.
Il bundle si risolve, ma il bundle non è l'esecuzione. **Va provata sul telefono** con `npm start`
in `apps/mobile` e la scansione del QR con Expo Go. Le cose da confermare: che noble giri su Hermes,
che `expo-sqlite` persista davvero fra due avvii, e quanto impiega `scrypt` con `logN = 16`.

**Prossimo:** Step 5 — relay Cloudflare.

---

## 2026-08-01 — Step 3: modello dati Yjs e persistenza SQLite

**Fatto**

`packages/core/src/model/`: `money` (centesimi interi, parsing e split), `types`, `ids`, `doc`
(accessori tipati sulle `Y.Map`), `store` (API applicativa con le invarianti).
`packages/core/src/persistence/`: `y-sqlite` (log append-only con compattazione), `memory-db`
(implementazione in memoria per i test). `apps/mobile/src/platform/`: adattatori expo-sqlite,
expo-crypto, expo-secure-store.

**Decisioni prese**

- **`split` memorizzato come valore unico, non come `Y.Map` annidata.** Tutto il resto del record è
  a merge per-campo, ma `mode` e `shares` devono restare coerenti fra loro: una fusione campo per
  campo potrebbe combinare il `mode` di un dispositivo con le `shares` dell'altro, producendo quote
  che non sommano al totale — cioè un saldo sbagliato che nessuno dei due utenti ha chiesto.
  Trattandolo come unità atomica, in caso di conflitto vince uno dei due split per intero e
  l'invariante regge. C'è un test dedicato.
- **Resto dei centesimi distribuito in modo deterministico** (metodo dei maggiori resti, a parità di
  resto vince l'indice più basso). Deterministico e non casuale perché i due dispositivi devono
  calcolare la stessa suddivisione senza consultarsi.
- **`updateExpense` rifiuta un cambio di importo che lascerebbe lo split incoerente.** Portare una
  spesa da 10 a 20 euro lasciando le quote a 5+5 falserebbe il saldo in silenzio.
- **Ordinamento con criterio finale sull'id**: senza, due spese create nello stesso istante
  comparirebbero in ordine diverso sui due telefoni.

**Un bug vero, trovato dai test: `destroy()` perdeva le scritture in coda**

`destroy()` impostava `this.destroyed = true` in modo sincrono e _poi_ attendeva il flush. Ma gli
update Yjs arrivano sincroni e vengono accodati come microtask: quando quei microtask partivano
trovavano il flag già alzato e uscivano subito. Risultato: **ogni scrittura non ancora eseguita
andava persa**, cioè l'app avrebbe perso i dati recenti a ogni chiusura pulita.

Tre test falliti, una sola causa. Corretto l'ordine: prima si smette di osservare il documento, poi
si svuota la coda, e solo alla fine si marca l'oggetto come distrutto. Il perché è ora un commento
nel codice, perché è il tipo di ordine che qualcuno "sistemerebbe" nella direzione sbagliata.

**Trappola risolta: Yjs non fa il bundle su React Native senza intervento**

Yjs genera il clientID con `lib0/random`, che importa `getRandomValues` da `lib0/webcrypto`. Sotto
la condizione `react-native` l'export map di lib0 punta a un file che richiede
**`isomorphic-webcrypto`, fermo al 2022**: il bundle non si risolve.

Non installato — sarebbe una dipendenza abbandonata da quattro anni sul percorso dell'integrità dei
dati, la stessa ragione per cui avevamo scartato `y-expo-sqlite`. `metro.config.js` reindirizza a uno
shim su `expo-crypto`. Verificate le firme: lib0 chiama `getRandomValues(new Uint32Array(1))` ed
expo-crypto accetta qualunque TypedArray, riempiendolo in place.

Trovato dal bundler, non dal typecheck né dai test: è la conferma che `expo export` va eseguito a
ogni step e non solo alla fine.

**Verificato, non assunto**

- **I due dispositivi convergono davvero.** 7 test dedicati riproducono lo scenario che giustifica
  l'architettura: spese create offline su entrambi si uniscono senza perdite; modifiche a campi
  diversi si fondono; modifiche allo stesso campo convergono su un valore identico su entrambi; una
  cancellazione non viene annullata da una modifica concorrente; gli update sono commutativi
  (applicati in ordine inverso danno lo stesso stato) e idempotenti (applicarli due volte non
  duplica).
- **La persistenza sopravvive a una compattazione interrotta a metà.** L'ordine INSERT → DELETE è
  deliberato: se il processo muore fra le due, restano vecchi update _più_ lo snapshot, e
  l'idempotenza di Yjs rende il risultato corretto. L'ordine inverso svuoterebbe la tabella.
- `expo-sqlite` gestisce i BLOB come `Uint8Array` in entrambe le direzioni: nessuna conversione.
  Rimosso il cast su `SQLiteBindValue`, che poteva mascherare una futura incompatibilità.
- `expo-crypto` **non** installa un polyfill globale di `crypto.getRandomValues`: conferma che la
  dependency injection nel core era la scelta giusta.

**Verifica:** typecheck pulito su 3 workspace, 172/172 test verdi, lint pulito, bundle Android
risolto (1305 moduli).

**Ancora da verificare sul dispositivo:** che l'insieme giri su Hermes. Il bundle non è l'esecuzione.
Verifica allo Step 4.

**Prossimo:** Step 4 — UI spese e categorie, con la prima prova reale sul telefono.

---

## 2026-08-01 — Step 2: layer crypto

**Fatto**

`packages/core/src/crypto/`: `encoding` (base64url senza Buffer né atob), `types` (interfacce
`RandomSource` e `SecureKeyStore` iniettate dalla piattaforma), `keys` (generazione e derivazione),
`seal` (cifratura dei blob di sync), `backup` (export/import protetto da passphrase).

**Decisioni prese**

- **`vaultId` derivato dalla chiave**, non generato a parte:
  `HKDF(vaultKey, "jutrack/vault-id/v1", 16)`. Il QR di pairing trasporta così solo la chiave, e non
  esiste un identificatore da tenere sincronizzato fra i dispositivi.
- **Byte di versione in testa a entrambi i formati binari.** Permette di cambiare cifrario in futuro:
  un client vecchio rifiuta esplicitamente un blob nuovo invece di decifrare spazzatura.
- **AAD = versione ‖ vaultId** sui blob di sync. Un relay ostile che travasi blob fra vault ottiene
  solo errori di autenticazione. Nel backup l'AAD include i parametri scrypt, così non si possono
  riscrivere per abbassare il costo e facilitare il brute force.
- **`scryptAsync` invece di `scrypt`.** La variante sincrona bloccherebbe il thread JS per secondi,
  congelando l'interfaccia durante export e import del backup.
- **Passphrase normalizzata NFKC.** Senza, la stessa passphrase con accenti digitata su due tastiere
  diverse (forma composta vs decomposta) fallirebbe il ripristino. Il test lo verifica con due
  stringhe realmente diverse a livello di codepoint — controllato che non fossero identiche nel
  sorgente, altrimenti il test sarebbe passato senza verificare nulla.
- **`generateVaultKey` fallisce se la `RandomSource` restituisce meno byte del richiesto.** Una
  sorgente difettosa che degrada in silenzio produrrebbe chiavi deboli senza alcun segnale.

**Il vincolo di indipendenza dalla piattaforma ora è verificato, non solo scritto**

Finora «`packages/core` non importa nulla di react-native» era una convenzione nei commenti. Ora è
una regola ESLint su `packages/core/src/**` che vieta gli import di `react-native`/`expo`/`node:*` e
i global `Buffer`, `window`, `document`, `localStorage`, `TextEncoder`, ciascuno con il messaggio che
indica l'alternativa. I test sono esclusi, perché usano `Buffer` di proposito come implementazione di
riferimento indipendente per validare la nostra base64url.

Verificato che le regole mordano davvero, scrivendo un file di prova con le violazioni: 3 errori
segnalati come atteso. Una guardia che non si verifica non è una guardia.

**Verificato, non assunto**

- `equalBytes` di `@noble/ciphers` **è a tempo costante**: accumula le differenze con XOR senza
  uscita anticipata. Letto il sorgente prima di usarla per confrontare token.
- `@noble/hashes` espone **`scryptAsync`**, che cede il controllo periodicamente.
- Il crypto **entra nel bundle React Native**: `expo export` passa da 1237 a 1254 moduli.
- 67 test, di cui buona parte verifica direttamente le garanzie del threat model: rifiuto di
  ciphertext manomesso, di AAD errata, di blob destinati ad altri vault, e il fatto che `authKey`
  (che il relay conosce) **non** riesce a decifrare i contenuti.

**Ancora da verificare sul dispositivo**

Il bundle non è l'esecuzione: che noble giri correttamente su **Hermes** va confermato sul telefono.
Verifica prevista allo Step 4, quando l'app avrà schermate reali. Va calibrato anche `logN` di
scrypt: il default 16 è ~175 ms su desktop, ignoto su telefono.

**Verifica:** typecheck pulito su 3 workspace, 67/67 test verdi, lint pulito, bundle Android OK.

**Prossimo:** Step 3 — modello dati Yjs e persistenza SQLite.

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
