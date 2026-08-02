# Devlog

Registro cronologico dell'avanzamento. Entry in ordine cronologico inverso (più recente in alto).

---

## 2026-08-02 — Step 15: il piano v3, dalla prova a mano dell'app

**Fatto**

Nessun codice: `docs/piano-v3-tab-gruppi-azzeramento-sync.md`, che copre gli **Step 16–22**, più la
tabella di avanzamento di `STATO.md` estesa. Nasce dalla prova a mano delle funzionalità già scritte.

**Le tre cose che non andavano, e cosa si è deciso**

1. **Il gruppo non è un luogo, è un parametro implicito.** «Categorie», «Backup della chiave» ed
   «Esporta i dati» stanno in Impostazioni, dove sembrano riguardare l'app mentre riguardano **un**
   gruppo solo. Si passa a **quattro tab** — Gruppi (stack elenco → gruppo), Grafici, Impostazioni,
   Profilo — con tutto ciò che è di gruppo dentro il gruppo.
2. **Il gruppo di default al primo avvio.** Era una scelta deliberata dello Step 12 per eliminare lo
   stato «nessun vault», ma alla prova produce due telefoni con due gruppi diversi e nessuno dei due
   condiviso. Si torna a «nessun gruppo», ma con la guardia in **un solo file**
   (`(gruppo)/_layout.tsx`) invece che sparsa: è la ragione per cui lo Step 19 precede lo Step 21.
3. **Il relay sembrava interrogato in continuazione.**

**Il numero, misurato prima di decidere.** Poll a 3 s per 120 s dopo l'attività, poi 30 s in primo
piano, **zero in background**. Un ciclo a vuoto è **una sola GET**, nessuna POST. Con due telefoni
sono ~1.500 richieste/giorno **contro un limite free di 100.000**: non era un problema di quota, era
batteria e traffico. Vale la pena intervenire, ma sapendo cosa si sta ottimizzando — e l'ottimizzazione
scelta è solo lato client, il relay non si tocca.

**La coda offline esisteva già** ed è durevole (`sync_pending` per vault, in transazione, svuotata
solo dei blob accettati, con `pushedStateVector` che non avanza a coda piena). Il dubbio che ha
originato la domanda era infondato.

**Tre difetti trovati leggendo il motore, che nessun test copriva**

- **`onLocalUpdate` fa `void this.store.setPending(...)` senza `await`** (`engine.ts:94`), e
  `setPending` apre una transazione. Due update ravvicinati intrecciano due `BEGIN` sulla stessa
  connessione: il secondo fallisce con `cannot start a transaction within a transaction`, e il suo
  `catch` esegue un `ROLLBACK` che annulla la transazione **del primo**. Non è perdita di dati certa
  — il catch-up dello state vector la recupera — ma quella è l'ultima rete di sicurezza.
- **Lo state vector si riscrive a ogni ciclo** (`engine.ts:336-338`), anche a vault fermo: un `fsync`
  ogni tre secondi, per ore.
- **Un guasto di rete gonfia il backoff fino a cinque minuti** come se fosse un errore del relay. Ma
  senza rete la richiesta fallisce **localmente** e non tocca il relay: ritentare presto non costa
  nulla. Da qui `offlineRetryMs`, che è anche il sostituto del listener di connettività che non
  possiamo avere (sarebbe un modulo nativo, quindi una build EAS nuova).

**Le due decisioni di progetto che valeva la pena scrivere**

- **`markActive()` invece di `pause()` quando nessuna schermata di dati è a fuoco.** `pause()` non
  sospende solo il pull: ferma anche il **push**. Una pausa rimasta appesa sarebbe una spesa scritta
  che non parte, in silenzio. Con `markActive` il rischio è invertito: dimenticarlo produce un poll
  più lento, mai un sync fermo.
- **Fase `absent` dentro `VaultProvider`, non `<VaultProvider>` montato condizionalmente.** Montarlo
  condizionalmente cambierebbe il tipo di un antenato dello `Stack`: React rimonterebbe l'intero
  navigatore nell'istante in cui si crea il primo gruppo, azzerando la pila di navigazione proprio
  durante quel gesto. Con `absent` l'albero è stabile e `VaultRuntime.keys` resta non nullable.

**Il punto dello Step 22 dove un errore è irreversibile.** `expo-secure-store` **non sa elencare i
propri slot**: le chiavi si trovano solo tramite `groupKeyStorageKey(vaultId)`. Cancellare la tabella
`groups` prima di aver letto i `vaultId` lascerebbe nel Keystore di sistema chiavi che nessuno potrà
più nominare, per sempre. La lista va letta come primissima operazione.

**Verifica:** `format:check` pulito. Nessun codice toccato, quindi i 536 test restano com'erano.

**Prossimo:** Step 16 — la scala del poll e `markActive()`, tutto in `packages/core/src/sync/`.
Indipendente da tutti gli altri step. **Prima dello Step 18** conviene fare la prova sui due telefoni
fisici del piano v2: lo Step 18 sposta le rotte con cui si entra in un gruppo da invito.

---

## 2026-08-02 — Step 14: uscire da un gruppo, rigenerarlo

**Fatto**

Uscire da un gruppo ora può portarsi dietro anche la copia sul relay, e il gruppo si può
**rigenerare**: chiave nuova, `vaultId` nuovo, tutta la storia dentro, e chi resta da reinvitare. È
l'ultimo step del piano v2.

**Cancellare non è revocare, e questo step serve a dirlo bene**

`DELETE /v1/vault/:id/vault` esisteva dallo Step 5, con i suoi test dentro workerd; mancava tutto il
lato client. Ma è una richiesta che va raccontata per quello che è: cancella la copia sul relay, non
quelle già scaricate sugli altri telefoni. E poiché azzera anche il token registrato al primo
accesso, il `vaultId` torna perfino libero — chi conserva la chiave può ricominciare a scriverci, in
un vault che però nessun altro sta più leggendo. Il relay finto dei test **replica anche questo**:
dopo un `DELETE` accetta di nuovo scritture, così un test non può concludere che cancellare
escluda qualcuno.

L'unica esclusione possibile è spostare il gruppo su una chiave che l'escluso non ha. `regenerate`
crea la chiave nuova, copia lo stato Yjs (`VaultStore.encodeState()` → un documento vuoto con la sua
persistenza), porta dietro il ricollegamento a un membro esistente, e lascia il gruppo vecchio **in
piedi**: uscirne è una chiamata separata, così un'interruzione a metà lascia due gruppi leggibili
invece di nessuno.

**I membri restano tutti, escluso compreso.** Non è una dimenticanza: le spese riferiscono i membri
con `paidBy` e con le quote, e togliere una persona dall'elenco cambierebbe i saldi già calcolati.
Chi è escluso resta nella storia; quello che smette è il flusso di aggiornamenti. C'è il test.

**L'ordine della cancellazione remota**

Prima il relay, poi il locale. La richiesta va autenticata con il token derivato dalla chiave, e la
chiave sta per essere cancellata da questo telefono: cancellando prima in locale, un guasto di rete
lascerebbe sul relay un vault che nessuno può più eliminare. Se la rete non risponde non si tocca
nulla — meglio un gruppo ancora in elenco, da cui riprovare a uscire.

**Due difetti trovati mentre si scriveva, entrambi dello Step 12**

- **Uscire da un gruppo mai sincronizzato falliva** con `no such table: sync_state`. Le tabelle di
  sync nascono all'avvio del motore, e `SqliteSyncStore.forget` le dava per esistenti: un gruppo
  creato e abbandonato prima che il motore fosse mai partito non si poteva lasciare. Ora `forget`
  passa dallo stesso `ensureSchema` di `open`.
- **La schermata del gruppo poteva bloccare l'app sul caricamento.** L'effetto che rende corrente il
  gruppo della rotta scattava anche dopo averlo abbandonato — il corrente era già un altro, e la
  schermata chiedeva di tornare su una riga che non esiste più: gruppo corrente senza riga, e l'app
  ferma sul caricamento fino al riavvio. Chiuso in due punti, perché uno solo si aggira: la
  schermata non chiede più un gruppo sparito, e `select` rifiuta un `vaultId` che non è nel
  registro.

Entrambi erano raggiungibili anche senza lo Step 14 — «esci dal gruppo» c'è dallo Step 12 — e
nessuno dei due si vede dai test di allora: il primo perché i test aprivano sempre uno store di sync
prima di uscire, il secondo perché vive nella navigazione.

**Nell'interfaccia**

La cancellazione dal relay è un interruttore, **spento di default**: è irreversibile e vale per
tutti, non solo per questo telefono, e vale sia per l'uscita sia per la rigenerazione — la stessa
domanda posta due volte sembrerebbe due cose diverse. La rigenerazione ha una card propria
(«Escludere qualcuno»), il testo dice cosa fa e cosa **non** fa, e al termine porta dritti alla
schermata d'invito: un gruppo rigenerato senza reinvitare nessuno è un gruppo da soli.

**Verifica:** 536 test verdi (371 core + 122 app + 43 relay), typecheck, lint e `format:check`
puliti, bundle Android esportato.

**Ancora da vedere sul telefono**, come tutto il piano v2 da metà in poi. Qui in particolare: che la
cancellazione dal relay risponda davvero (è la prima richiesta di rete che parte da un gesto
dell'utente e non dal motore), e che dopo una rigenerazione l'altro telefono entri nel gruppo nuovo
col link e ritrovi le spese di prima.

**Prossimo:** il piano v2 è finito. Resta la verifica sui due telefoni fisici, che è il criterio di
«fatto» dell'intero piano.

---

## 2026-08-02 — Step 13: inviti via link

**Fatto**

Un invito a un gruppo si manda in chat. `Share.share` dalla schermata d'invito produce
`https://<relay>/j#v=1&k=<chiave>&n=<nome>&e=<scadenza>`; chi lo apre trova una pagina statica
servita dal Worker con un bottone che riporta l'invito dentro l'app, e ci entra **senza perdere i
gruppi che aveva già**. Le due persone non devono più essere nella stessa stanza.

**La chiave sta nel fragment, ed è l'intero punto**

Dopo il `#` i browser non trasmettono nulla: la chiave non arriva al Worker, non entra nei log di
Cloudflare e non finisce nelle anteprime che le chat generano visitando l'URL. Il relay resta
ignorante com'era.

Perché regga, la pagina `/j` non deve avere **alcun** modo di rimandare indietro quel fragment: né
`fetch`, né `<form>`, né redirect, né una sola risorsa esterna — basterebbe un
`<img src="https://…">` perché la chiave finisse in un log altrui. È una proprietà del codice, e i
test la trattano come tale: cinque asserzioni sull'HTML servito (nessuna delle stringhe proibite,
nessun `src`/`href` verso http) più gli header (`Referrer-Policy: no-referrer`, CSP
`default-src 'none'`, `noindex`).

**«/j non tocca il Durable Object», in una forma verificabile**

Il vincolo del piano era questo, ma «non ha toccato un DO» non si osserva dall'esterno. Girato in
qualcosa che si può affermare: la pagina è una **funzione senza argomenti** in un modulo che non
importa nulla — niente `env`, niente binding, niente richiesta — e il test confronta la risposta del
Worker con quella della funzione chiamata a vuoto. Se un domani qualcuno vi infilasse un dato preso
da un vault, l'uguaglianza cadrebbe. Il controllo sta anche prima dell'instradamento verso i vault,
quindi `/j` non arriva mai al `match` che istanzia il DO.

**Una grammatica sola per tre forme**

`parseInvite` legge il link, `jutrack://join#…` e il vecchio `jutrack://pair?…` dei QR già in
circolazione. Non tre funzioni: chi incolla un codice non sa in quale forma sia, e tre strade
separate sarebbero divergute — la query di un `pair?…` e il fragment di un `/j#…` hanno la stessa
grammatica, e ora la validano con lo stesso `readInvite`. `parsePairingUri` resta come caso
particolare, con i suoi test invariati.

Il link porta anche il **nome del gruppo**, così chi riceve legge «Entrare in «Casa»?» invece di
«Entrare in questo gruppo?». È un suggerimento, non una verità: l'autorevole sta dentro il vault e
lo sovrascrive al primo sync. Ed è testo scelto dall'utente che finisce dentro un URL — senza
`encodeURIComponent`, un `&k=` scritto nel nome del gruppo sostituirebbe la chiave dell'invito. C'è
il test.

**Il fragment non passa da expo-router**

È il punto in cui questo step poteva fallire in silenzio, e non se ne accorge nessun typecheck: il
router instrada sul percorso e trasforma la query in parametri, ma ciò che sta dopo il `#` non è né
l'uno né l'altra. `useLocalSearchParams` non lo vede. La rotta `/join` legge quindi il link
**grezzo** con `Linking.useLinkingURL()` — che copre sia l'app aperta dal link sia l'app già viva
che ne riceve uno.

**Il QR non è stato cambiato**, e continua a portare `jutrack://pair?…`. Codificare l'https
allungherebbe il codice di una cinquantina di caratteri senza guadagno: chi inquadra col lettore
interno arriva allo stesso posto, e i codici già generati restano validi. Nella schermata è ora
ripiegato sotto il link, con l'incolla manuale, per quando i due telefoni sono uno di fronte
all'altro e non si vuole far passare la chiave da una chat.

**Il threat model si allarga, e la UI lo dice prima**

Un link è più esposto di un QR: resta nella cronologia della conversazione, si inoltra con due
tocchi senza che chi l'ha creato lo sappia, attraversa i server della chat e sopravvive nei suoi
backup. La schermata lo dichiara **prima** di generare l'invito, e nomina l'unico rimedio vero a un
invito finito male: uscire dal gruppo e rifarlo. La scadenza resta ciò che era già dichiarata di
essere — una cortesia verso un link dimenticato, non una difesa.

**Verifica:** 520 test verdi (366 core + 111 app + 43 relay), typecheck, lint e `format:check`
puliti, bundle Android esportato.

**In produzione.** Deploy del Worker (versione `b351a959`) subito dopo il commit: `/j` risponde 200
con gli header attesi e l'HTML del repo, senza risorse esterne. La prima richiesta subito dopo il
deploy ha ancora dato 404 — l'edge non aveva finito di propagare la versione nuova; dopo qualche
secondo cinque richieste su cinque sono 200. Vale la pena saperlo: al prossimo deploy, un 404
immediato non è un guasto.

**Ancora da vedere sul telefono.** I due punti dove può rompersi in silenzio: che Android consegni
`jutrack://join#…` alla rotta `/join` **col fragment**, e che il foglio di `Share.share` compaia
nella build installata.

**Prossimo:** Step 14 — eliminazione dal relay e rigenerazione del gruppo.

---

## 2026-08-02 — Step 12: più gruppi sullo stesso telefono

**Fatto**

«Casa» e «Viaggio in Grecia» convivono sullo stesso telefono, con spese, persone e saldi
separati, e si passa dall'uno all'altro **senza riavviare l'app**. Il vault unico non era una
convenzione: era cablato in quattro punti — lo slot fisso in SecureStore, il `useEffect([])` che
montava il runtime una volta per vita del processo, le tabelle di sync senza colonna vault, e
`adoptVaultKey` che sovrascriveva la chiave. Entrare in un vault significava uscire dal precedente.

**Il punto pericoloso, e il test che lo tiene fermo**

`setPending` faceva `DELETE FROM sync_pending` senza `WHERE`. Con due gruppi attivi avrebbe
cancellato la coda offline dell'altro: spese registrate in aereo sparite perché nel frattempo si è
scritto in un altro gruppo, senza che nulla lo segnalasse. Era l'unico punto dell'intero piano dove
un errore distrugge dati.

Il test gira su **SQLite vero** (`node:sqlite`, builtin di Node 22, nessuna dipendenza nuova) e non
su `MemoryDatabase`, che riconosce le istruzioni per espressione regolare: un finto motore che
ignora il `WHERE` avrebbe lasciato passare proprio il bug che quel `WHERE` esiste per evitare.
Verificato togliendolo: 2 test su 9 diventano rossi. Una guardia che non si verifica non è una
guardia.

**Non esiste più «nessun vault»**

Prima l'app ammetteva lo stato «nessuna chiave», con un ramo condizionale in mezza dozzina di
schermate. Ora **c'è sempre almeno un gruppo**: al primissimo avvio, dopo l'onboarding del profilo,
ne nasce uno chiamato «Le mie spese». Costa 32 byte casuali e nessuna richiesta di rete — il relay
scopre il vault alla prima scrittura. In cambio `VaultRuntime.keys` non è più nullable e una intera
categoria di stati intermedi sparisce.

**«Chi sei in questo gruppo?», chiesto prima di scrivere**

È la parte rinviata dallo Step 11, e la forma trovata è diversa da quella immaginata allora. Il
piano prevedeva di chiedere _dopo_ il primo sync, a membro già scritto — ma i membri non hanno
tombstone, quindi quello creato per sbaglio sarebbe rimasto lì per sempre. Invertito l'ordine: per
chi **entra** in un gruppo altrui il membro **non viene scritto affatto** finché non ha risposto.
La schermata elenca i membri che arrivano col sync e offre come azione principale «sono nuovo».
Chi _crea_ un gruppo non vede nulla: è nuovo per definizione.

**Il nome del gruppo sta dentro il vault**

Una `Y.Map` `meta` con `name`, quindi rinominare raggiunge l'altro telefono come qualunque altra
modifica. Il registro locale ne tiene una **copia**, per disegnare la lista senza aprire e
ricostruire ogni documento Yjs: quando divergono è la copia ad aggiornarsi. L'allineamento è
iscritto al documento e non eseguito una volta al montaggio — altrimenti una rinomina fatta
dall'altro telefono comparirebbe solo al cambio di gruppo successivo.

**Ripartenza pulita, non migrazione**

`schema_version` in `app_meta`. Se all'avvio si trovano le tabelle vecchie si eliminano, insieme
alla chiave nello slot unico e alle chiavi di `app_meta` riferite a quel vault. Il profilo
sopravvive: non ha nulla a che vedere con lo schema, e azzerarlo costringerebbe a rifare
l'onboarding per nulla. Idempotente, e su un'installazione nuova non fa nulla.

**Effetto collaterale voluto: risolve a mano ciò che andava fatto a mano.** STATO.md prescriveva di
cancellare i dati dell'app su entrambi i telefoni prima di provare gli Step 10 e 11. Adesso lo fa
l'app da sola, al primo avvio.

Il vecchio vault sul relay non viene toccato: per cancellarlo servirebbe la chiave che stiamo
eliminando, e una richiesta di rete durante l'avvio può fallire proprio mentre l'app parte. Scade
col TTL di 30 giorni, e nel frattempo nessuno ha più la chiave per leggerlo.

**Sparisce il «riavvia l'app»**

Dopo il pairing e dopo la creazione di un gruppo. Il motore non è più costruito una volta per vita
del processo con le chiavi di quel momento: l'effetto dipende da `vaultId`, e cambiare gruppo
smonta engine e persistenza e ne monta altri. Un solo motore attivo per volta, quello del gruppo
aperto — tenerne due accesi raddoppierebbe le richieste al relay per un gruppo che nessuno sta
guardando.

**Gli hook non cambiano firma**, quindi le undici schermate che consumano dati non sono state
toccate. È la ragione per cui questo step era fattibile senza riscrivere l'app.

**Una guardia riguadagnata invece che persa**

`node:sqlite` nel solo adattatore di test ha richiesto `types: ["node"]` in
`apps/mobile/tsconfig.json`. Quello però rende visibili i global di Node a tutto il codice
dell'app, e su Hermes `Buffer` non esiste: fino a ieri era il typecheck a rifiutarlo, senza che
nessuno lo avesse deciso. Aggiunta una `no-restricted-globals` su `apps/mobile/src/**` per
`Buffer`, `TextEncoder` e `__dirname`, più il divieto di importare `node:*` fuori da `src/testing/`
e dai test. Verificata scrivendo un file con le tre violazioni: 3 errori, come atteso.

**Verifica:** 491 test verdi (345 core + 111 app + 35 relay), typecheck, lint e `format:check`
puliti, bundle Android esportato.

**Ancora da vedere sul telefono.** Niente di questo step è stato provato su hardware, e le cose che
contano sono tre: che due gruppi tengano le spese davvero separate, che il cambio di gruppo non
lasci appesi engine o persistenza, e che la ripartenza pulita non cancelli più del dovuto. Insieme
restano da confermare gli Step 10 e 11, mai riprovati sul campo.

**Prossimo:** Step 13 — inviti via link, con la pagina `/j` sul Worker.

---

## 2026-08-01 — Step 11: chi sono io

**Fatto**

Il secondo bug emerso dalla prova con due telefoni, quello che rendeva **sbagliati i numeri**. Dentro
il vault non esisteva alcun identificatore stabile di «me»: `seed.ts` creava al primo avvio un membro
«Io» con un id casuale **proprio di quel dispositivo**. Dopo il sync erano due persone distinte, le
spese di ciascuno puntavano al proprio id, e il calcolo di chi deve quanto all'altro partiva da
quattro membri invece di due.

Non era un problema di autenticazione — è la ragione per cui l'auth di Google era stata scartata: un
provider d'identità avrebbe comunque dovuto scrivere un id dentro il CRDT, che è esattamente ciò che
fa un id generato sul telefono, senza costare un modulo nativo e una build.

**Il profilo**

`{ profileId, name, color, identity? }`, uno per persona, in una tabella `app_meta` di SQLite —
**non** in SecureStore, che resta riservato al materiale crittografico. `profileId` è casuale e
**opaco**: mai derivato dal nome né dalla chiave. È il seam che permetterà di agganciare un provider
d'identità senza cambiare la chiave con cui i membri sono scritti nei vault, che è la parte cara da
modificare a posteriori perché toccherebbe `paidBy` e le quote di ogni spesa.

Il membro nasce da lì: `VaultStore.setMember(id, …)` scrive con un id scelto da chi chiama, invece di
generarne uno. È idempotente per costruzione, quindi rieseguirla a ogni avvio non duplica nulla — e
un cambio di nome raggiunge l'altro telefono da solo, senza creare una persona nuova.

**L'ordine dei provider non è cosmetico**

`ProfileProvider` sta **sopra** `VaultProvider`, non accanto. Il membro è scritto col `profileId`,
quindi il profilo deve esistere già quando il vault si monta: se arrivasse dopo, ci sarebbe una
finestra in cui l'app funziona ma «io» non esisto — ed è in quella finestra che nascevano i duplicati.
Effetto collaterale utile: il database viene aperto una volta sola e passato al vault, invece di una
connessione per componente.

**Le sedici categorie**

L'altra metà della duplicazione. Chi entra nel vault di qualcun altro ha il documento vuoto finché
non arriva il primo sync: seminare lì le otto categorie di default significa ritrovarsene sedici
quando i due documenti si uniscono. Ora l'origine del vault (`created` / `joined`) viene registrata
in `app_meta` **al momento in cui si crea o si adotta la chiave** — dopo, guardando un documento
pieno di dati sincronizzati, i due casi sono indistinguibili. Vale anche per il ripristino del backup
della chiave, che è un ingresso a tutti gli effetti.

**Via la gestione manuale delle persone**

La card «Persone» col campo di inserimento è sparita, sostituita da «Il tuo profilo» (nome e colore,
modificabili) e da un elenco **in sola lettura** di chi divide le spese. Una persona aggiunta a mano
non ha un telefono dietro: non potrebbe mai registrare una spesa né vedere il saldo. Il nome si salva
quando il campo perde il fuoco, non a ogni tasto — altrimenti ogni lettera sarebbe un update Yjs, e
quindi una riga nel log del relay.

Nel form spesa il `paidBy` predefinito è ora il proprio membro, non il primo della lista in ordine
alfabetico.

**Rinviato consapevolmente**

Il ricollegamento a un membro esistente («sei già in questo gruppo con un altro nome?»), che serve a
chi ripristina il backup della chiave su un telefono nuovo. Il posto dove scriverlo c'è già
(`my_member_id` per vault in `app_meta`, letto dal runtime), ma la domanda va fatta al momento giusto
— **dopo** il primo sync, non al boot su un documento ancora vuoto — e il momento giusto è l'apertura
di un gruppo, che arriva con lo Step 12. Farlo adesso significherebbe anche poter cancellare il
membro creato per sbaglio, e i membri non hanno tombstone.

**Verifica**

463 test verdi (341 core + 87 app + 35 relay), da 433. Typecheck, lint e `format:check` puliti,
`expo export --platform android` completo. Il test che conta è in `convergence.test.ts`: due
dispositivi con profili distinti producono **due** membri anche riscrivendoli a ogni avvio, e una
spesa divisa a metà riferisce membri che esistono su entrambi i telefoni.

**Attenzione ai dati già sul telefono**

Non c'è migrazione, per scelta presa nel piano v2. Un'installazione che ha già dei dati si ritroverà
il vecchio membro «Io» accanto al proprio profilo, e le spese continueranno a riferirsi a quello: il
saldo resterebbe sbagliato. Prima di provare va **cancellati i dati dell'app** su entrambi i telefoni
(Impostazioni Android → App → JuTrack → Archiviazione → Cancella dati) e rifatto il pairing. La
ripartenza pulita automatica, con `schema_version`, è prevista allo Step 12.

**Prossimo:** Step 12 — più gruppi sullo stesso telefono.

---

## 2026-08-01 — Step 10: il motore di sync smette di mentire

**Fatto**

Il primo step del [piano v2](piano-v2-profili-gruppi-sync.md), e l'unico dei cinque che è
indipendente dagli altri. Tutto in `packages/core/src/sync/`, più tre file di `apps/mobile`. Nessun
modulo nativo aggiunto: **nessuna build EAS necessaria**.

**Il bug principale: la coda non basta**

`start()` registrava l'observer e riprendeva la coda, e questo è tutto ciò che il motore sapeva del
documento. Ma `onLocalUpdate` vede solo ciò che si scrive **mentre il motore è acceso**: la
persistenza ricarica il documento prima, con un'origine sua, e non passa di lì. Risultato: lo storico
di un telefono non lasciava mai il telefono, e il ciclo riportava comunque `synced`.

Ora `SyncCursorStore` ricorda lo **state vector dell'ultima pubblicazione riuscita**, e `start()`
pubblica il delta fra quello e il documento attuale. Copre in un colpo tutti i casi che sfuggivano:
storico precedente al vault, seed eseguito prima di `start()`, chiave adottata su un documento già
pieno, update prodotti a motore spento.

Due dettagli che non sono dettagli:

- **La soglia è `> 2` byte.** Un delta Yjs vuoto pesa esattamente due byte; senza la soglia, ogni
  avvio a vault nuovo scriverebbe un blob inutile sul relay.
- **Lo state vector si registra solo a coda vuota.** Salvarlo con update ancora in attesa li
  cancellerebbe dal catch-up del prossimo avvio: sparirebbero, e nulla lo segnalerebbe. Gli update
  appena _scaricati_ invece si includono — sono per definizione già sul relay, e includerli impedisce
  che tornino indietro al boot successivo.

**Il secondo bug, trovato leggendo: il cursore saltava alla fine del log**

Se un'intera pagina risultava indecifrabile, il cursore avanzava a `result.head` — la fine
dell'**intero** log, non della pagina. Con `hasMore` acceso, tutti gli update validi delle pagine
successive sparivano in silenzio, e il ciclo riportava `synced`. Ora `pull` restituisce anche
`lastSeq`, l'ultimo `seq` **visto** nella pagina, decifrabile o no, e il cursore avanza a quello.

Il test è stato il pezzo più istruttivo: le spese leggibili devono venire da un **terzo**
dispositivo. Se venissero da quello corrotto resterebbero comunque in sospeso dentro Yjs per il buco
nella sua sequenza, e il test misurerebbe quel comportamento invece del cursore — passando anche col
bug presente.

**Velocità: da ~15 s medi a pochi secondi**

- **Sonno interrompibile** (`wake()`): il ciclo dormiva un intervallo fisso e nulla poteva svegliarlo.
  Senza questo, il push immediato non avrebbe avuto alcun effetto.
- **Debounce sull'invio** (400 ms): una modifica locale accorcia l'attesa, e una raffica di scritture
  produce **una** richiesta invece di una per update.
- **Poll adattivo**: 3 s dentro la finestra attiva (due minuti dall'ultima modifica locale o dall'ultimo
  pull con contenuto), 30 s a riposo.
- **`pause()`/`resume()` legati ad `AppState`**: in background non si interroga il relay; al ritorno
  in primo piano il backoff si azzera e parte subito un giro. Risolve anche il caso in cui il backoff
  arrivava a cinque minuti e non si azzerava al ritorno della connettività.

Il ciclo resta l'unico a parlare col relay: il debounce non lancia un `syncOnce()` proprio, sveglia
soltanto il sonno. Altrimenti sarebbero due motori in parallelo.

**Diagnosi onesta**

- **`phase: 'offline'` ora viene davvero emesso.** Esisteva nei tipi ed era già gestito nella UI, ma
  il motore non lo produceva mai: gli errori di rete finivano in `error` col messaggio grezzo di
  `fetch`. La regola è netta — se non è un `RelayError`, il relay non è stato raggiunto affatto.
- **Nuovo stato `blocked`, e il ciclo si ferma.** Un 403 è definitivo (la chiave non apre quel
  vault): prima portava solo il backoff a cinque minuti e il dispositivo restava a ripetere la stessa
  richiesta per sempre, mostrando uno stato che sembrava in attesa di risolversi. `RelayError` guadagna
  `fatal` (401/403) accanto a `permanent`: 400 e 413 dipendono dalla richiesta, quindi una richiesta
  diversa può ancora riuscire.
- **`setPending` ora è in transazione.** Fuori da una, la finestra fra il `DELETE` e l'ultimo `INSERT`
  è una coda **vuota su disco**: un crash lì dentro faceva sparire le spese registrate offline. È
  anche molto più veloce, un solo fsync invece di uno per riga.
- **Timeout HTTP da 20 s a 10 s**: deve restare sotto l'intervallo di poll, o una richiesta appesa
  tiene fermo il ciclo oltre il giro successivo.

**Verifica**

433 test verdi (337 core + 61 app + 35 relay), da 417. Typecheck, lint e `format:check` puliti,
`expo export --platform android` completo, prova cifrata end-to-end contro un relay reale (`wrangler
dev`): 12 controlli verdi.

Aggiunto `apps/mobile/expo-env.d.ts` a `.prettierignore`: è generato da `expo start` e già ignorato
da git, ma faceva fallire `format:check` in locale senza che ci fosse nulla da correggere.

**Cosa questo step NON dimostra**

Che il sync funzioni fra due telefoni veri. I test coprono lo scenario che prima non esisteva —
motore avviato su un `Y.Doc` che ha già contenuto — ma la conferma è una prova sul campo **in
entrambe le direzioni**, con un telefono che aveva già dati suoi. E i membri continueranno a
duplicarsi finché non si fa lo Step 11: il saldo resta sbagliato.

**Prossimo:** Step 11 — profili, così «Io» smette di essere due persone.

---

## 2026-08-01 — Prova con due dispositivi: due bug, e il piano v2

**Fatto**

Nessun codice. Analisi del repo dopo la prima prova reale con **due telefoni**, dove la
sincronizzazione «funzionava, ma in una sola direzione e dopo parecchio tempo», e dove la gestione
delle persone e del pairing si è rivelata poco chiara. L'esito è
[piano-v2-profili-gruppi-sync.md](piano-v2-profili-gruppi-sync.md), Step 10–14, e l'aggiornamento di
[STATO.md](STATO.md), che non può più dire che tutti gli step sono chiusi.

**Due bug, non due rifiniture**

- **Sync unilaterale** (`packages/core/src/sync/engine.ts:88-91`). `start()` registra l'observer e
  riprende la coda, ma non pubblica mai lo stato **già presente** nel documento. La persistenza
  carica prima (`VaultProvider.tsx:75`) con `origin = persistence`, quindi non passa da
  `onLocalUpdate`: lo storico non raggiunge mai il relay, parte solo ciò che si scrive dopo quel
  boot. E gli update ricevuti che dipendono da struct mai trasmessi restano _pending_ dentro Yjs
  senza essere applicati, mentre il cursore avanza — il ciclo riporta `synced` e la UI resta vuota.
  Il sintomo osservato era esattamente questo.
- **Membri duplicati e saldo errato** (`apps/mobile/src/state/seed.ts:41-45`). «Io» nasce con un id
  casuale **su ogni dispositivo**: dopo il sync sono due persone distinte, e il calcolo di chi deve
  quanto è sbagliato. Non era solo la lista Persone a sembrare strana. Lo stesso meccanismo raddoppia
  le otto categorie di default.

Nessuno dei due era coperto dai test, per la stessa ragione: `makeDevice()` in `engine.test.ts` parte
sempre da un `Y.Doc` vuoto e chiama `start()` prima di scrivere. Lo scenario «motore avviato su un
documento che ha già contenuto» — cioè il caso reale — non esiste nella suite. È la lezione di metodo
di questa sessione: 417 test verdi non dicono nulla su uno scenario che nessun test costruisce.

**Decisioni prese**

- **Niente auth di Google**, benché fosse la prima ipotesi. Il problema è di modello dati, non di
  autenticazione: un id account andrebbe comunque scritto nel CRDT come chiave del membro, che è
  esattamente ciò che fa un id casuale generato sul telefono. In cambio costerebbe un modulo nativo
  (quindi una build EAS nuova), un progetto Google Cloud con OAuth consent e il fingerprint SHA-1 del
  keystore, e — soprattutto — un Sign-In solo lato client **non è verificabile**: senza un backend
  che validi l'`id_token` chiunque può dichiararsi chiunque, e quel backend darebbe al relay un ruolo
  di identità, rompendo il principio portante del progetto. Il campo `identity?: { provider, subject }`
  resta però previsto nel profilo, e `profileId` è **opaco**: agganciare un provider più avanti non
  richiederà di cambiare la chiave dei membri, che è la parte cara da modificare a posteriori.
- **Un gruppo = un vault = un Durable Object.** Il relay non cambia struttura: `idFromName(vaultId)`
  dà già una stanza isolata per gruppo. Niente database da gestire, com'era richiesto.
- **Si riparte con dati puliti.** Sono dati di prova, e ripartire elimina la migrazione di schema e
  lo strumento di fusione dei membri duplicati — i due pezzi più rischiosi, uno dei quali (riscrivere
  `paidBy` e le quote su tutte le spese) sbaglia i numeri in modo che si nota tardi.
- **Solo profili, niente membri ospite.** La gestione manuale delle persone sparisce del tutto.
- **Inviti via link con la chiave nel fragment**, non più solo QR. Il fragment non viene mai
  trasmesso al server: il relay continua a non poter leggere nulla, e la pagina di atterraggio sta
  sul Worker che già esiste. Il QR resta come alternativa per quando i due telefoni sono uno di
  fronte all'altro.
- **Polling adattivo, non WebSocket.** La Hibernation API porterebbe la latenza sotto il secondo ed è
  gratuita, ma il grosso del ritardo non è l'intervallo: è che non esiste alcun trigger sulla
  modifica locale. Prima si misura se 2-3 secondi bastano.
- **Nessuna nuova build EAS**: `AppState` e `Share` sono API core di React Native, già presenti nella
  development build installata.

**Due pezzi di lavoro che sembravano da fare e invece no**

Vale la pena annotarli, perché a occhio sembrano costosi: `SqliteYPersistence` **accetta già** un
`tableName` (`packages/core/src/persistence/y-sqlite.ts:28`, col commento «Consente più documenti
nello stesso database»), quindi il multi-vault lato persistenza non tocca il core; e
`DELETE /v1/vault/:id/vault` **esiste già** nel relay (`services/relay/src/index.ts:11`), quindi
«esci dal gruppo ed elimina anche dal server» è già servito.

**Il punto in cui si perdono dati**

`setPending` fa `DELETE FROM sync_pending` **senza `WHERE`**
(`apps/mobile/src/platform/sync-store.ts:59`). Oggi è innocuo perché il vault è uno solo; con due
gruppi attivi cancellerebbe la coda offline dell'altro, e sarebbero spese registrate offline che
spariscono senza che nulla lo segnali. È l'unico punto del piano v2 dove un errore distrugge dati, ed
è annotato come tale.

---

## 2026-08-01 — Step 9: CI, export dei dati, backup della chiave

**Fatto**

`packages/core/src/export/`: CSV delle spese e dei pareggi, JSON integrale del vault. Nell'app due
schermate nuove — «Esporta i dati» e «Backup della chiave» — raggiungibili dalle impostazioni, dove
il backup era rimasto un segnaposto («sarà disponibile qui») dallo Step 2. CI su GitHub Actions.

**Decisioni prese**

- **Due formati, due scopi diversi, e la schermata lo dice.** Il CSV serve a leggere i dati altrove
  e perde struttura; il JSON serve a conservarli ed è integrale. Presentarli come alternative
  equivalenti avrebbe portato qualcuno a tenere il CSV come backup.
- **CSV in RFC 4180 puro** — separatore `,`, decimale `.` — e non nella convenzione italiana
  (`;` e `,`), che si aprirebbe meglio in un Excel italiano e peggio ovunque altro. Il conflitto si
  risolve alla radice con una colonna `importo_centesimi` in più: intera, senza separatore decimale,
  non fraintendibile da nessun locale. È coerente col resto del progetto, dove il denaro è sempre in
  centesimi interi.
- **BOM UTF-8 in testa**, altrimenti Excel su Windows legge le accentate come mojibake.
- **Le note sono disinnescate contro la CSV injection**: un `=` iniziale in una cella viene valutato
  come formula da Excel e da Fogli Google. Qui i testi li scrivono i due proprietari del vault, ma un
  export si gira a terzi e la difesa costa un carattere.
- **I pareggi in un file separato dalle spese.** Non sono spese: in un unico foglio qualcuno
  sommerebbe due colonne che non vanno sommate.
- **L'export JSON conserva i tombstone**, il CSV no. Un backup che perde le cancellazioni, se
  reimportato, farebbe riapparire spese cancellate di proposito.
- **Nessuno dei due file contiene la chiave del vault**, e c'è un test che lo verifica. Sono file in
  chiaro: metterci dentro la chiave significherebbe che chi li riceve legge tutto, per sempre.
- **`VaultSnapshot` sta in `model/types.ts`, non in `export/`.** È `VaultStore.snapshot()` a
  produrla: se il tipo vivesse nel modulo d'export, il modello dipenderebbe dall'export invece del
  contrario. Così le funzioni di export restano pure e testabili senza costruire un `Y.Doc`.

**La passphrase del backup è l'unico punto in cui la sicurezza dipende da un umano**

Ovunque altro la chiave è casuale a 256 bit. Qui il file regge quanto regge la passphrase, e chi lo
ottiene può provare offline all'infinito. Il campo ha quindi un giudizio esplicito
(`features/backup/passphrase.ts`): minimo 12 caratteri come soglia bloccante, e un consiglio verso
quattro parole slegate. È dichiarato nel codice che è una **euristica e non una misura di entropia** —
una frase lunga presa da una canzone nota la passerebbe e cadrebbe al primo dizionario.

Il tempo di scrypt viene misurato e mostrato nel messaggio finale: `logN = 16` è tarato su desktop
(~175 ms) e il costo su telefono non è mai stato osservato. Il numero che comparirà dopo il primo
backup reale dice se vada alzato o abbassato — e i backup già esportati resterebbero importabili
comunque, perché i parametri viaggiano dentro il file.

**I due moduli nativi nuovi sono caricati pigramente, e non è un dettaglio**

`expo-file-system` ed `expo-sharing` sono richiesti con `require` in `try/catch`, come già
`expo-camera` allo Step 7. Il motivo è la trappola nota: **expo-router importa tutte le route
all'avvio**, quindi un `import` in cima a `export.tsx` verrebbe eseguito al boot. La development
build attualmente installata sul telefono è stata compilata **prima** che questi moduli esistessero:
con un import normale non si aprirebbe affatto. Così invece si apre, e l'export ripiega sugli
appunti dichiarandolo nell'interfaccia.

**Il repo non era mai stato formattato con prettier**

`npm run lint` (eslint) passava e veniva eseguito a ogni step, ma `format:check` non è mai stato
lanciato: su `main` falliva. Emerso solo scrivendo la CI, che lo esegue. Riformattato in un commit a
parte per non confondere il diff dello step — 16 file, tutti a capo e nessuna modifica di
comportamento.

**CI**

Un solo job, controlli dal più veloce al più lento: `format:check`, `lint`, `typecheck`, `test`,
`expo export --platform android`. Un solo job e non quattro paralleli perché i minuti di Actions su
repo privato sono contati e ogni job rifarebbe `npm ci` da capo. `expo export` è il passaggio che
gli altri non sostituiscono: è l'unico che risolve il grafo dei moduli con Metro, ed è così che era
emersa la trappola `lib0` → `isomorphic-webcrypto`, invisibile a typecheck e test.

Solo trigger `push`, su qualunque ramo: le PR nascono da rami dello stesso repo e sarebbero già
coperte, mentre un doppio trigger raddoppierebbe il consumo.

**Verifica**

417 test verdi (322 core + 60 app + 35 relay), typecheck, lint e `format:check` puliti,
`expo export` completato con i due moduli nuovi nel grafo.

**Non ancora verificato su hardware**: nessuna delle due schermate nuove è mai stata aperta. Il
foglio di condivisione, la scrittura del file in cache e il costo reale di scrypt richiedono una
build aggiornata, che per scelta non è stata prodotta — si continua a testare quella attuale.

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

Il 404 sul bundle era visibile dal primo giorno. È stato letto come _sintomo_ («il bundle non
arriva») invece che come _causa_ («il server non sa dove sia il progetto»). La domanda mancante non
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
