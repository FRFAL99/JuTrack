> Estratto da [STATO.md](STATO.md), dove era cresciuto in mezzo alla cronaca. È la procedura da
> eseguire **col telefono in mano**: cosa non è ancora stato visto funzionare su hardware vero, e
> il giro di prova che lo verifica.

# Cosa non è ancora stato verificato su hardware reale

Va detto con precisione, perché è la differenza fra «testato» e «funzionante». Dopo la diagnostica
la lista si è accorciata parecchio, ma non è vuota — ed è **la sola cosa che resta da fare sui primi
quattro piani e sul redesign**. Il piano v5 aggiunge codice nuovo e quindi righe nuove a questa
lista, non le toglie.

> **Da dove cominciare, se si ha un telefono in mano e mezz'ora.** Nell'ordine, perché è l'ordine in
> cui un guasto rende inutile provare il resto: **(1)** l'app si apre e la home mostra le spese del
> gruppo giusto (passo 6); **(2)** si registra una spesa e ricompare nella lista col totale giusto
> (passo 7); **(3)** un invito mandato in chat apre `/groups/<id>` sul gruppo giusto sull'**altro**
> telefono; **(4)** la spesa compare sull'altro telefono, **e in entrambi i versi** — è il criterio
> di «fatto» che manca a tutti e tre i piani. I punti 1 e 2 si provano con un telefono solo; i punti
> 3 e 4 sono quelli che non sono mai stati visti funzionare.

### Il giro di prova, in quattro blocchi

La lista qui sotto è lunga una quarantina di voci e **non si percorre in ordine di scrittura**:
quello è l'ordine in cui gli step sono stati fatti, non quello in cui conviene guardarli. Dal 5
settembre **niente è più bloccato da una build**, quindi il giro si può fare tutto; dal 12 settembre
esiste anche una build **`preview`** autonoma, che gira senza Metro. I quattro blocchi sono ordinati
per «un rosso qui rende inutile il blocco dopo».

**Blocco 0 — prima di toccare il telefono.** Metro parte **da `apps/mobile`**, mai dalla root, e
`npm run prova` verde evita di dare la colpa al telefono per un guasto di relay o di dati:

```bash
cd apps/mobile && npx expo start --dev-client
npm run prova                                    # altro terminale, ~30 controlli in ~90 s
```

**Blocco 1 — telefono da solo, nessuna attesa (~30 min).** Nell'ordine: l'app si apre su un telefono
che **i gruppi ce li ha già** e non chiede nulla (Step 21, e le spese di prima dello Step 23 si
devono vedere lo stesso); la navigazione della nuova radice del tab Gruppi (passo 6); il form della
spesa e i suoi tre modi di perdere quello che si scrive (passo 7, Step 24 e 38); le cinque `NavCard`
(Step 19); i grafici e i filtri (Step 26 e 27); la dashboard, che **chiede di chiudere e riaprire
l'app** (Step 28); valuta e lingua in Tu, che la chiedono anche loro (Step 29 e 37). Poi la prova
singola che vale più di tutte le altre di questo blocco: **in inglese, aprire una spesa registrata
prima e guardare il campo importo** — deve dire `12.30` e non `1230` (Step 39).

Dal 13 settembre **la nuova spesa è la schermata da guardare per prima di tutto il blocco**: gli
Step 49 e 50 l'hanno riscritta da capo, ed è la seconda riscrittura in due mesi. Niente di quello che
segue è coperto dai test, perché sono tutte cose che hanno bisogno di uno schermo:

- **Il tastierino (49).** Toccando l'importo la tastiera di sistema **non deve comparire**
  (`showSoftInputOnFocus={false}` è l'unico pezzo che dipende dal dispositivo); le cifre devono
  uscire in fondo e non dove capita il cursore; il tasto del separatore deve scrivere «,» in italiano
  e «.» in inglese — si prova cambiando lingua in Tu col form già aperto.
- **Il salva che non si muove (50).** Aprire e chiudere i tre gruppi uno dopo l'altro: il bottone in
  fondo deve restare **fermo**, e il tastierino comparire e sparire sopra di lui.
- **L'allineamento della cifra col simbolo.** È `baseline`, e su Android è storicamente ballerino con
  un `TextInput`: se il «€» galleggia troppo alto o troppo basso, è quello.
- **Le tre righe chiuse.** Devono dire il proprio valore — «Paghi tu · metà e metà», «Casa», «Oggi ·
  facoltativi» — e solo il segnaposto va nel grigio più tenue. A quote libere che non quadrano la
  prima riga deve diventare **rossa** e dire quanto manca: è l'unico stato che spegne il salva.
- **TalkBack**, su tutte e due: la cifra deve annunciarsi come **campo editabile** (è la sola ragione
  per cui è rimasta un `TextInput`), e ogni riga di gruppo deve annunciare **nome e riassunto**,
  anche quelle che il nome, a vederle, non ce l'hanno.

Gli **Step 51 e 52** spostano l'attenzione sui **Grafici**, che sono la seconda schermata riscritta
del giro:

- **I capitoli (51).** Le tre pillole in cima — Mese, Abitudini, Fra di voi — devono aprire un
  capitolo per volta restando ferme mentre i grafici scorrono; sotto «Abitudini» deve comparire una
  nota sola al posto di quelle che stavano sotto i singoli grafici; con tutti i widget di un capitolo
  spenti la schermata deve dire che è vuoto **quel capitolo**, non la dashboard.
- **La composizione in loco (52).** «Modifica» in alto a destra apre la modalità senza cambiare
  schermata. Da lì: i grafici devono restare **inerti** al tocco — è la prova del
  `pointerEvents="none"`, e il modo di sbugiardarlo è toccare una barra dei mesi o una cella del
  calendario e vedere se cambia qualcosa; le frecce devono spostare **solo dentro il capitolo**, e
  quelle ai bordi devono essere spente; il cassetto «Non mostrati» deve restare ancorato in fondo
  mentre la lista scorre; la × deve essere rossa `danger` e non rosa `expense`.
- **Il redirect.** Aprire `/dashboard` (o riaprire l'app con quella come ultima rotta salvata) deve
  portare ai Grafici, non a una schermata inesistente.
- **«Tu» (53).** Le quattro righe devono dire il proprio valore, e toccarne una deve far salire un
  foglio dal basso che si chiude toccando fuori **o** con la ×. La prova che conta è quella degli
  avvisi: accenderli tutti, poi **revocare il permesso alle notifiche dalle impostazioni di
  Android** — la riga deve diventare arancione e dire «Bloccati da Android», che è l'unico modo di
  accorgersene senza aspettare un avviso che non arriva.

**Blocco 2 — con `npm run peer` dall'altra parte (~20 min).** È il criterio di «fatto» che manca a
tutti i piani. Il link mandato in chat che apre `/groups/<id>` **col fragment**, `Share.share`, la
spesa che passa **nei due versi**, due membri e non quattro, il saldo a mano, l'aereo con i ~15 s
dello Step 17 e la scala di poll dello Step 16. Guida: [prova-con-un-telefono-solo.md](prova-con-un-telefono-solo.md).

**Blocco 3 — notifiche e widget, cioè lo Step 41 (~30 min).** Il **32** per primo perché si vede in
un minuto (budget basso, spesa che lo supera, notifica **mentre si è nell'app**); poi il **31**
(dialogo del permesso, diagnostica 15 che passa a «concesso»); il **33** nel suo caso _fermo_
(rigenerare il gruppo dal peer); infine i due **widget** sulla home, la prova che li distingue —
spesa tutta mia contro pareggio — e il **riavvio del telefono**, che è il solo modo di vedere il
task headless. Qui la diagnostica va rifatta: sulla build di oggi `0 + 0 sulla home` è un difetto.

**Blocco 4 — quello che chiede tempo, non attenzione.** L'**icona** nei suoi cinque posti (launcher
tondo e squircle, 48 px nel cassetto, silhouette nella tendina, icona a tema, i due widget); lo
**Step 36**, che vuole mezz'ora di app chiusa; lo Step 31 vero, che arriva a **tre giorni**; il caso
_in ritardo_ dello Step 33, che ne vuole **uno**; e il primo del mese dello Step 35.

- ~~Il ciclo di sync completo, nei due versi, coi membri e i saldi giusti~~ — **fatto il 12
  settembre 2026** contro `npm run peer`, vedi la sezione qui sopra. Resta da fare **fra due telefoni
  fisici**: il peer monta i moduli veri dell'app, quindi copre la logica, ma non il secondo Android
  con la sua rete, il suo doze e il suo `AppState`
- La **schermata di onboarding** del profilo, che al primo avvio viene mostrata **fuori** dallo
  `Stack` di expo-router — come già facevano le schermate di attesa e di errore, ma quella è la prima
  interattiva a farlo
- Il **pairing ottico**: che il QR mostrato da un telefono venga davvero inquadrato dall'altro. La
  generazione è confermata, la scansione no
- Che `expo-sqlite` **persista fra due riavvii** dell'app: la diagnostica scrive e rilegge nella
  stessa sessione, che è meno
- Le **schermate degli Step 7, 8 e 9** — statistiche, budget, pareggi, quote libere, export, backup
  della chiave — mai toccate con un dito. Statistiche e quote libere sono state anche **riscritte**
  dal redesign (passi 5 e 7), quindi non è più solo «mai provate»: è codice nuovo mai provato
- ~~L'**APK autonomo** (profilo `preview`), che gira senza Metro~~ — **costruito e provato il 12
  settembre 2026**, ed era l'ultimo vero ignoto del progetto: fino a quel giorno il JavaScript era
  sempre arrivato dal PC di sviluppo. L'app si apre, gira senza Metro, e **i dati preesistenti sono
  ancora lì** — stesso package e stesso keystore (`c3BIFch_jg`), quindi Android l'ha trattata come
  un aggiornamento
- Il costo di `scrypt` con `logN = 16` su mobile (default da calibrare, in
  `packages/core/src/crypto/backup.ts`). La schermata di backup **misura e mostra** il tempo
  impiegato: basta un backup reale per avere il numero
- Il **foglio di condivisione** e la scrittura del file in cache: richiedono una build che contenga
  `expo-file-system` ed `expo-sharing`, aggiunti allo Step 9
- **Tutto lo Step 12**, che è nuovo di oggi: due gruppi che tengono le spese davvero separate, il
  cambio di gruppo che non lascia appesi engine o persistenza, la **ripartenza pulita** che non
  cancelli più del dovuto, e la domanda «chi sei in questo gruppo?» a chi entra
- **Dello Step 13 resta solo `Share.share`**: che il foglio di condivisione compaia davvero nella
  build installata. ~~Il fragment consegnato da Android~~ è **fatto il 12 settembre**, e per il giro
  intero — WhatsApp, pagina `/j`, bottone, gruppo aperto
- ~~La **scala del poll** dello Step 16~~ — **fatta il 12 settembre**: istantanea con entrambi
  aperti, ed entro il minuto dopo cinque minuti di telefono fermo. La seconda misura è «entro il
  minuto» a occhio e non col cronometro, il che basta al criterio ma non dice a quale gradino fosse
  sceso il poll
- ~~L'**`offlineRetryMs`** dello Step 17~~ — **fatto il 12 settembre**: due spese in aereo, rete
  riaccesa, partite da sole in ~5 s e arrivate al peer nello stesso secondo. Il sostituto del
  listener di connettività basta
- **La navigazione dello Step 18**: che il gesto «indietro» dentro il tab Gruppi torni all'elenco e
  non esca dall'app; che la tab bar resti visibile sul gruppo e sparisca sulle schermate-foglia; e
  soprattutto che **un invito ricevuto in chat apra ancora `/groups/<id>` col gruppo giusto**. Gli URL
  sono verificati sui tipi generati da expo-router, il che è molto, ma non è il telefono
- **Lo Step 19**: che le cinque `NavCard` della gestione del gruppo — categorie, budget, pareggi,
  backup della chiave, export — aprano davvero le schermate giuste, e che il loro «Chiudi» riporti al
  gruppo invece di uscirne. Gli URL non sono cambiati, quindi il rischio è basso, ma è lo stesso tipo
  di rischio dello Step 18
- **Lo Step 20**: che quattro etichette stiano nella tab bar senza troncarsi («Impostazioni» è la
  lunga), che il tab Profilo salvi il nome **sul blur** e che il cambio si veda subito nel gruppo, e
  che `/azzera` si apra e si chiuda
- **Lo Step 21, ed è quello che conta di più**: che al primo avvio da azzerato si arrivi
  all'onboarding del profilo e poi a **zero gruppi**, con i tre ingressi funzionanti; che creare il
  primo gruppo **non azzeri la pila di navigazione** (è la ragione della fase `absent`); che uscire
  dall'ultimo gruppo riporti all'elenco vuoto senza spinner appesi; e soprattutto che **chi ha già
  dei dati non si accorga di nulla** — nessuna migrazione, quindi l'unico modo di saperlo è aprirla
  su un telefono che i gruppi ce li ha già
- **Lo Step 22**, che è l'unico gesto dell'app che **non si può annullare**: doppia conferma,
  ritorno all'onboarding **senza riavviare**, e — la parte che conta — che registrando un profilo
  nuovo non riappaia nulla di prima. Da guardare anche il caso con un gruppo aperto e il motore che
  gira: fra il tocco e l'onboarding devono passare frazioni di secondo, non secondi, e nessun errore
  deve comparire in console mentre il motore si spegne
- **Il passo 6 del redesign, ed è quello con più modi di fallire in silenzio.** Tre cose in
  particolare: che **un invito ricevuto in chat apra ancora `/groups/<id>` col gruppo giusto** — la
  radice del tab è cambiata, gli URL no, e questa è la terza volta che quella prova viene rimandata;
  che cambiare gruppo dal foglio **non torni indietro da solo** quando si parte da `/groups/<id>`
  (è il `dismissTo` prima del `select`, e a occhio si vede subito); e che il gesto «indietro» dalla
  radice esca dall'app invece di finire su una schermata vuota, ora che sotto le spese non c'è più
  l'elenco. Da guardare anche la `Modal` del foglio su Android: è l'unica dell'app che arriva dal
  basso, e la tab bar le sta sotto
- **Il passo 7**, che è la schermata che si apre più spesso e l'unica in cui si **scrive** qualcosa
  che finisce nel documento condiviso. Il rischio non è l'impaginazione ma la tastiera: che il
  tastierino numerico non copra il bottone «Salva la spesa», che sta in fondo (il
  `KeyboardAvoidingView` c'era già, ma prima il bottone non era l'ultima cosa della pagina); che
  toccando la cifra da 46px si apra davvero il tastierino decimale e non quello intero; e che la nota,
  che adesso è una riga che **diventa** un campo al tocco, salvi quello che si scrive quando si esce
  dal campo invece di perderlo. Da verificare anche che la quota sotto ogni persona si aggiorni
  mentre si digita, perché è il modo in cui la schermata spiega le tre modalità di divisione
- **Lo Step 23**, che sul telefono per ora si vede in un posto solo: l'**export CSV**, che adesso ha
  sedici colonne invece di quattordici. Il resto — un negozio scritto di qua che arriva di là — non è
  provabile finché non si fa la prova sui due telefoni, ed è esattamente il criterio di «fatto» del
  piano v4. Quello che si può guardare subito è che l'app apra e mostri **le spese registrate prima**
  senza inciampare: i due campi non esistono in quei record, e sono i fallback dei reader a reggerli
- **Lo Step 24, e il rischio è la tastiera**, non l'impaginazione: la sezione nuova sta in fondo, e
  sopra il bottone «Salva la spesa» che già stava all'ultimo posto. Da guardare che il tastierino
  non copra il salva mentre si scrive un tag, che `submitBehavior="submit"` tenga davvero il fuoco
  sul campo fra un tag e l'altro (è il punto in cui un tag si perde in silenzio), e che toccando
  «Salva» con un tag scritto e **non** confermato quel tag finisca comunque nella spesa. Poi le due
  conversioni a `Chip`, che sono modifiche a punti collaudati: le tre modalità di divisione e le
  pillole delle categorie devono selezionarsi e deselezionarsi come prima, con l'icona di categoria
  al suo posto
- **Lo Step 26, ed è il primo del piano v4 che si vede.** Il tab Grafici è lungo il triplo di
  prima e disegna in SVG in otto punti nuovi. Da guardare, in ordine: che la schermata **scorra
  fluida** fino in fondo (undici grafici che si misurano da soli, un render in più ciascuno); che
  **nessuno sbordi** — ognuno si misura con `onLayout` e la prima passata avviene a larghezza zero,
  quindi il rischio è un grafico che resta vuoto, non uno storto; che **heatmap, treemap e curve si
  leggano in tema chiaro e in tema scuro**, che è il punto 5 del criterio di «fatto» del piano v4;
  che il **tocco sulla cella della heatmap e sul riquadro del treemap** scriva davvero giorno e
  importo sotto — sono la compensazione che rende leggibili quei due grafici a chi le tinte non le
  distingue, e se non funzionassero il grafico resterebbe un colore e basta; e che con **un solo
  membro** nel gruppo le sezioni che ne vogliono due semplicemente non compaiano (il messaggio che
  dice cosa manca è lo Step 28, non questo). Da provare anche con **poche spese**: un mese con due
  spese sole è il caso in cui una scala piatta o un quantile mancante si vedono subito
- **Lo Step 27, ed è il punto 3 del criterio di «fatto» del piano v4.** La prova è una sola frase e
  si vede a occhio: **cambiando un filtro devono cambiare tutti i grafici insieme**, e il totale in
  testa continuare a coincidere con la somma di ognuno. In particolare il **filtro persona**, dove
  un numero plausibile e sbagliato non si riconosce guardandolo: con «a carico di», una spesa
  divisa a metà deve contare **la metà**; con «ha pagato», per intero. Poi le cose che possono
  rompersi in silenzio: che la barra dei chip **scorra** senza rubare lo scorrimento verticale alla
  schermata; che il foglio si apra da qualunque chip e che «Fatto» lo chiuda; che scegliendo un
  intervallo di due tocchi sulla griglia il periodo sia quello **raddrizzato** anche toccando prima
  la data più avanti; che toccando una barra mensile il periodo diventi quel mese e le sei barre si
  riancorino; che con un filtro che non trova niente compaia lo **stato vuoto** con «Azzera i
  filtri» invece di undici grafici piatti; e che la **heatmap su «ultimi 12 mesi»** si trascini
  invece di sbordare. Da guardare anche il primo avvio dopo l'aggiornamento: il periodo di partenza
  è «Questo mese», cioè esattamente quello che la schermata mostrava prima
- **Lo Step 28, e sono i punti 4 e 6 del criterio di «fatto» del piano v4.** Il punto 4 è una prova
  sola e va fatta per intero: togliere un widget, **chiudere e riaprire l'app**, e ritrovarlo
  tolto; poi riordinarne uno con i chevron e ripetere il giro. È l'unica cosa che dimostra che
  `app_meta` sta davvero conservando il layout, e non lo si può vedere senza chiudere l'app. Il
  punto 6 è il gruppo con **un solo membro**: i tre widget che ne vogliono due devono dire cosa
  manca invece di sparire, e la stessa frase deve comparire nel selettore accanto al nome. Poi le
  cose che possono rompersi in silenzio: che spegnendo tutti i widget compaia lo **stato vuoto**
  con l'indicazione di dove ritrovarli, invece di una pagina bianca; che il pulsante «Componi» in
  alto a destra resti visibile con due filtri attivi (è fuori dalla riga scorrevole apposta); che
  i chevron siano disabilitati in cima e in fondo; e che **il totale in cima abbia adesso
  un'etichetta**, come tutti gli altri blocchi — è il cambiamento visivo più evidente dello step
- **Tutto lo Step 14**: che la cancellazione dal relay risponda davvero — è la prima richiesta di
  rete che parte da un gesto dell'utente e non dal motore di sync — e che dopo una rigenerazione
  l'altro telefono entri nel gruppo nuovo col link e ci ritrovi le spese di prima
- **Lo Step 29, e le due prove che contano vogliono un riavvio e una spesa vecchia.** La prima:
  scegliere una valuta in Tu, **chiudere e riaprire l'app**, e ritrovarla — il campo sta in
  `app_meta` come il layout della dashboard, e come quello non lo si vede senza chiudere. La seconda:
  che una spesa registrata **prima** dello step conservi il proprio simbolo nella lista mentre tutto
  il resto della schermata usa quello nuovo; è l'unico punto in cui le due regole convivono a video,
  e se `ExpenseRow` leggesse il profilo invece della spesa non si noterebbe finché non si cambia
  valuta. Poi le cose che si vedono a occhio: che il simbolo sia cambiato **anche nei grafici e nel
  foglio dei filtri** (sono i punti più lontani da dove si sceglie), e che le sei pillole del
  selettore stiano in larghezza senza troncarsi — «AUD A$» è la più lunga

- **Il foglio di condivisione dell'export**, che fino all'11 agosto era impossibile da provare: la
  build che lo conteneva non esisteva, e l'export ripiegava sugli appunti dichiarandolo
  nell'interfaccia. La build dello Step 30 porta `expo-file-system` ed `expo-sharing`, quindi adesso
  la prova si può fare: esportare il foglio di calcolo e vedere se compare il foglio di sistema
  invece del ripiego

- **Il `.xlsx` dello Step 61, che è la prova che i test non possono dare.** Il generatore è scritto a
  mano, e in Node il file è già stato aperto con LibreOffice e passato da un verificatore OPC — ma i
  due lettori che contano sono **Excel** e **Fogli Google**, e nessuno dei due si automatizza.
  Preparare prima una spesa con una **nota che comincia per `=`** e un **tag con un'accentata**, poi:
  Gruppi → il gruppo → Gestisci → Esporta i dati → «Foglio di calcolo (.xlsx)» → salvare su Drive →
  aprirlo. Cinque cose, nell'ordine in cui si rompono:
  1. **si apre senza chiedere di riparare il file** — è l'esito che nessun test copre, e il sospetto
     numero uno è `styles.xml`;
  2. ci sono **sette fogli** — Spese, Pareggi, Categorie, Budget, Persone, Vocabolario, Riepilogo —
     e sui primi sei la riga 1 resta ferma scorrendo (sul Riepilogo no, ed è voluto);
  3. la colonna **`data`** si ordina come data, non come testo (in Excel è allineata a destra);
  4. selezionando **`importo`** la somma automatica dà un numero, e coincide sia col totale che
     l'app mostra per lo stesso periodo **sia col «Per mese» del Riepilogo**;
  5. la nota mostra **`=SOMMA(…)` senza apice davanti** e non viene valutata, e l'accentata è giusta;
  6. nel **Riepilogo**, le quote per categoria sono **percentuali** (non `0,98`) e i saldi sommano a
     zero.

  Se manca il foglio di condivisione il bottone del `.xlsx` è **spento**: è voluto, un file binario
  non può ripiegare sugli appunti. Il JSON accanto invece deve continuare a ripiegarci.

- **L'avviso dello Step 66, che è l'unico dei cinque che torna.** Accendi «Backup dei dati vecchio»
  in Tu → Avvisi, fai un backup, poi **inserisci venti spese** e riapri l'app: deve arrivare una
  notifica che nomina **il gruppo** e dice quante spese non sono nel backup. Toccarla apre l'app.
  Poi il pezzo che lo distingue dagli altri quattro: **fai un altro backup e aggiungine altre
  venti** — l'avviso deve **tornare**. Se non torna, `warnedFor` non si sta riarmando, ed è il
  difetto che questo step esisteva per evitare. Senza cartella scelta il testo dev'essere l'altro,
  quello che manda a sceglierne una.

- **Il backup automatico dello Step 65 — è lo step meno provato di tutto il piano v8.** Il codice
  nativo dice che scrivere in una cartella SAF si fa con `Directory.createFile` e non con
  `File.create`, ed è quello che il codice fa; ma fra «il sorgente Kotlin dice così» e «funziona sul
  telefono» c'è tutta la distanza che questo documento esiste per misurare. Nell'ordine:
  1. Tu → **Backup automatico** → «Scegli una cartella» → il selettore di **cartelle** di Android si
     apre (non quello dei file) → scegli `Documenti/JuTrack`, creandola se non c'è.
  2. «Fai un backup adesso» → il messaggio deve dire **quanti gruppi** ha salvato, e il numero deve
     corrispondere ai gruppi che hai. Apri Files: c'è **un file per ogni gruppo**, e il nome del
     gruppo è dentro il nome del file.
  3. Apri uno di quei file: dev'essere un export v4 completo, con `"groupName"` giusto.
  4. **Il gesto che conta davvero: chiudi l'app dal menu dei recenti e riaprila**, poi torna in Tu →
     Backup automatico. La riga deve dire ancora «Ultimo backup: …» e **non** richiedere il
     permesso. È l'unico modo di provare che il permesso sulla cartella è persistente, e nessun test
     può farlo al posto suo.
  5. Poi i due casi storti, che sono quelli che si scoprono tardi: **rinomina un gruppo in
     «Casa/Ufficio»** e rifai il backup — deve nascere `jutrack-casa-ufficio-….json` e **non** deve
     fallire; e **sposta o cancella la cartella** dalle impostazioni di Android, poi rifai il backup
     — deve comparire «Backup parziale» con il conteggio dei falliti, non un crash.
  6. Se il bottone «Scegli una cartella» **non c'è** e al suo posto c'è l'avviso arancione, è un
     **difetto**, non l'altro esito buono. Lo si è potuto stabilire senza il telefono: l'impronta
     della build di produzione (`d862b56d…`) è identica a quella corrente, e `@expo/fingerprint`
     hasha `node_modules/expo-file-system/android` come cartella — quindi il codice nativo dentro
     quel binario è byte per byte quello in cui `pickDirectoryAsync` c'è.

- **Il selettore di file dello Step 64, che è il primo a dipendere da una funzione nativa arrivata
  via etere.** La development build installata è del **5 settembre**, e questo codice ci arriva come
  aggiornamento OTA: l'OTA porta JavaScript, non codice nativo. Quindi la prova ha **due esiti
  buoni**, e vanno distinti prima di guardare lo schermo.
  - `/importa` → se il bottone **«Scegli il file» c'è**: toccarlo apre il selettore di sistema,
    scegliere un `jutrack-vault-*.json` riempie il campo **senza incollare niente**, e da lì
    «Leggi il file» prosegue come prima. Prova anche a **chiudere il selettore senza scegliere**:
    non deve comparire nessun avviso, la schermata resta com'era.
  - Se il bottone **non c'è**: sulla build **di produzione** è un difetto, perché l'impronta dice
    che `pickFileAsync` in quel binario c'è (vedi la voce del backup automatico qui sopra). Su una
    build **di sviluppo** più vecchia può invece essere l'esito buono: quelle hanno impronte diverse
    (`43c3366f…` quella del 13 settembre), e il ripiego sugli appunti è lì per loro.
  - `/backup` deve comportarsi **allo stesso modo** dell'import: o il bottone c'è in tutte e due, o
    in nessuna delle due. La passphrase resta da digitare in ogni caso.
  - Ultima: scegliere un file **che non è un export di JuTrack** (una foto rinominata, un JSON
    qualsiasi) deve produrre il messaggio di `parseVaultExport` — «Questo non è un file JSON…» o
    «Questo file non è un export di JuTrack» — e **non** un errore del selettore.

- **Il nome del gruppo dentro il file, dello Step 63.** Rinomina un gruppo in «Casa» → esporta il
  JSON → aprilo in un editor: subito dopo `exportedAt` devono esserci `"groupName": "Casa"`,
  `"version": 4` e `"app"` con la versione dell'app. Poi `/importa`, incolla, e **prima** dei
  conteggi deve comparire «Dal gruppo «Casa».» con il campo del nome **già compilato con «Casa»**,
  non con la data. Il caso che vale la pena provare è l'altro: un export **vecchio**, fatto prima di
  oggi, che il nome non ce l'ha — deve rileggersi lo stesso, senza scarti, proponendo la data come
  faceva prima.

- **Lo Step 31, di cui sul telefono si vede quasi tutto subito — tranne la notifica.** Accendere
  «Promemoria spese» deve far comparire il dialogo di Android, e da lì il passaggio 15 della
  diagnostica deve passare a «permesso concesso»; l'interruttore deve sopravvivere a un riavvio, e
  negando il permesso deve **restare giù** con l'avviso che spiega perché. L'avviso vero però
  arriva **tre giorni dopo**, e non c'è modo di affrettarlo se non toccando `REMINDER_DAYS` o
  l'orologio del telefono: la logica della scadenza ha i test — incluso il cambio di ora legale — e
  quello che il telefono deve confermare è il permesso e il canale. Da guardare anche che, revocando
  il permesso dalle impostazioni di sistema, riaprendo Tu compaia la riga «Android sta bloccando»
- **Lo Step 32, che al contrario del 31 si vede in un minuto** — e proprio per questo va provato
  bene. Serve un budget basso su una categoria e una spesa che lo supera: la notifica deve comparire
  **mentre si è ancora nell'app**, ed è il pezzo che senza il gestore di primo piano non si
  vedrebbe affatto (il difetto peggiore, perché non lascia traccia). Poi le tre cose che possono
  rompersi in silenzio: che registrando una **seconda** spesa nella stessa categoria l'avviso **non**
  si ripeta, che cancellando la spesa e rifacendola non ne arrivi un altro (è il livello che non
  scende), e che nelle impostazioni di sistema il canale «Budget del mese» esista **separato** da
  «Promemoria spese». Da guardare anche l'80%: portare una categoria appena sopra la soglia senza
  superare il limite deve dare «Budget quasi finito», e il superamento successivo un secondo avviso
  diverso. E la prova che richiede un riavvio: aprire un gruppo mai guardato in questo mese con un
  budget **già** sforato **non** deve avvisare — è il primo giro silenzioso, ed è l'unica regola
  dello step che si nota solo quando manca
- **Lo Step 33, dove un caso si prova in due minuti e l'altro chiede un giorno vero.** Il caso
  **fermo** è quello facile e va provato per primo: si rigenera un gruppo da un telefono e si guarda
  l'altro, che deve ricevere «Sincronizzazione fermata» quasi subito e **in primo piano**. Il caso
  **in ritardo** richiede ventiquattr'ore effettive — o la modalità aereo tenuta accesa e l'app
  riaperta il giorno dopo — e la cosa da guardare è che il testo dica «da un giorno» e che il giorno
  successivo **non** si ripeta. Poi le tre che possono rompersi in silenzio: che riaprendo l'app la
  scadenza sia contata **anche sul tempo a app chiusa** (è la ragione per cui i segni stanno in
  `app_meta`, e in memoria non si vedrebbe mai); che dopo un sync riuscito un guasto **nuovo** possa
  avvisare di nuovo; e che nelle impostazioni di sistema il canale «Sincronizzazione» esista separato
  dagli altri due. La logica ha i test, incluso il tempo a app chiusa; quello che il telefono deve
  confermare è che l'avviso compaia davvero e che non si ripeta
- ~~**Il selettore di widget di Android**~~ — **guardato il 12 settembre**: entrambe le voci
  compaiono, con i nomi giusti, 3 × 2 e le descrizioni di `app.json`. **Ma le anteprime sono due
  riquadri vuoti con la sola icona dell'app**, invece di mostrare il widget: manca un
  `previewImage`/`previewLayout` e Android ripiega sull'icona. Cosmetico — i widget messi sulla home
  si popolano — e **rimandato di proposito**. È l'unico difetto trovato in tutta la sessione
- **Dello Step 34 il cuore è fatto e resta il contorno.** Il 12 settembre il widget «saldo» si è
  **popolato** con 33,60 €, identici al calcolo indipendente del peer: quindi `index.js` come entry,
  il foglietto in `app_meta` e il **tema scuro** — disegnato da un ramo che l'app non percorre mai —
  funzionano tutti e tre. Restano: che una spesa che sposta il saldo si veda sulla home **senza
  riaprire l'app**; che dopo un **riavvio del telefono** il widget si ridisegni da solo — è il caso
  per cui esiste il task headless, e quello che fallirebbe in silenzio se la registrazione
  all'ingresso del bundle non funzionasse; che cambiando gruppo dalla pill il widget **segua**; che
  azzerando il telefono il saldo **sparisca dalla home**; e il tocco sul rettangolo, che deve aprire
  l'app
- ~~**Lo Step 35 nella prova che con un widget solo non si poteva fare**~~ — **fatta il 12
  settembre, e dall'aritmetica**: una spesa da 5,00 € tutta sua ha portato il totale del mese da
  100,80 a 105,80 e lasciato il saldo **fermo** a 33,60. I due widget **affiancati sulla home** si
  leggono come due cose diverse, e la didascalia **nomina il mese** («Spese in settembre»), che è la
  ragione per cui non dice «questo mese». Restano il riavvio, che qui è il task headless con due
  nomi da distinguere invece di uno, e la prova che chiede pazienza, il **primo del mese**: il totale deve ripartire da zero alla prima apertura dell'app, e
  fino ad allora la didascalia deve dire il mese giusto per il numero che mostra — è la ragione per
  cui non dice «questo mese»
- **Lo Step 36, che dalla build del 5 settembre è finalmente provabile**: `updatePeriodMillis` vale
  1800000 nell'XML dei due provider, quindi la sveglia adesso suona davvero. Nell'ordine:
  aggiungere un widget, registrare una spesa **sull'altro telefono** e lasciar passare mezz'ora
  senza toccare il primo — il widget deve cambiare da solo. Poi il caso che vale il doppio, perché
  prova la direzione che il nome dello step non nomina: chiudere l'app in aereo dopo aver registrato
  una spesa, riaccendere la rete e **non riaprire l'app**, e vedere quella spesa arrivare all'altro
  telefono lo stesso. Infine la guardia: con l'app aperta davanti, il giro periodico non deve fare
  niente. Da tenere d'occhio nei giorni seguenti la voce di JuTrack nei consumi di sistema, che è
  l'unico modo di sapere se mezz'ora è il numero giusto
- **La tastiera sul foglio della frase, corretta il 15 settembre e da riguardare.** Apri «Scrivi»
  dalla home: il foglio si apre con `autoFocus`, quindi la tastiera compare da sola. **Il campo deve
  restare visibile mentre si scrive**, e sotto devono vedersi l'anteprima della frase e le pillole,
  scorrendo se serve. Due esiti sbagliati, e sono opposti: il campo di nuovo **sotto** la tastiera
  vuol dire che gli eventi non arrivano; il foglio staccato dalla tastiera con una **striscia vuota
  in mezzo** vuol dire che la finestra della `Modal` si ridimensionava già da sé e adesso si alza due
  volte. È l'unica cosa di questa correzione che i test non possono dire
- **Lo Step 71, che si prova quasi tutto in un minuto e ha una trappola sola.** Sul widget «Speso
  questo mese», nell'ordine: il rettangolo deve mostrare il totale, **la striscia degli ultimi
  quattordici giorni** e la riga del ritmo («Di questo passo, ~840 € a fine mese»); **stringilo a
  due celle** e la striscia deve sparire, lasciando gruppo, cifra e didascalia senza **nessun testo
  tagliato a metà**; riallargalo e la striscia deve tornare. Poi il caso che i test non possono
  vedere e che nemmeno il ridimensionamento mostra, perché passa dall'**altro** percorso di disegno:
  **con l'app aperta, registra una spesa** e guarda la home — il widget deve aggiornarsi e restare
  **largo**, con la striscia che comprende la spesa appena fatta. Se si ridisegna stretto, è
  `renderWidget` in `publish.ts` che ha smesso di leggere `WidgetInfo`. Infine spegni e riaccendi lo
  schermo: nessun rettangolo vuoto. Il saldo non ha striscia di proposito — una fotografia di chi
  deve a chi non ha una serie storica — ma deve reggere lo stesso i due tagli
- **Lo Step 37, dove la prova facile va fatta per prima e quella difficile richiede un telefono in
  inglese.** La facile: toccare «English» in Tu e vedere cambiare **la schermata sotto le dita e le
  tre etichette dei tab** — quelle sono la prova che il cambio esce da dove lo si è toccato — poi
  chiudere e riaprire l'app e ritrovarlo, perché il campo sta in `app_meta` come la valuta e come
  quella non lo si vede senza chiudere. La difficile è l'unica cosa dello step che i test non
  possono toccare: **che `Intl` esista davvero su Hermes**. Si guarda su un telefono con la lingua
  di sistema in inglese e **nessuna scelta salvata** — cioè dopo un azzeramento: se l'app parte in
  inglese, `Intl` c'è; se parte in italiano, il ripiego ha funzionato e la lettura no. Nessuno dei
  due casi rompe niente, ma solo il telefono dice quale dei due si sta percorrendo. Poi le due che
  possono rompersi in silenzio: che la riga di stato del sync resti in italiano **di proposito**
  (è lo Step 38, non un guasto), e che i nomi di gruppi e categorie **non** cambino cambiando
  lingua — se cambiassero, vorrebbe dire che si sta traducendo il documento condiviso
- **Lo Step 38, e il rischio non è il testo ma la tastiera.** Il form della spesa è stato toccato
  in venti punti, tutti di stringhe, ma è la schermata in cui si **scrive** nel documento
  condiviso: da rifare le prove del passo 7 del redesign — che il tastierino decimale non copra
  «Salva la spesa», che la nota salvi uscendo dal campo, che un tag scritto e non confermato
  finisca comunque nella spesa. Poi le cose che si vedono solo in inglese: che «Who pays and how
  it splits» non sbordi dove «Chi paga e come si divide» stava, e che le tre pillole di divisione
  ci stiano in riga con le etichette nuove. Infine la prova che tiene insieme lo step: mettere
  l'app in inglese e **scorrere la lista spese**, dove le intestazioni dei giorni devono dire
  «Monday, August 3» e non «Monday 1 August» — e il totale del mese in cima «August», non
  «agosto»
- **Lo Step 39, e la prova che conta è una sola.** Aprire **in inglese** una spesa registrata
  prima: il campo importo deve mostrare `12.30`, non `1230`. Era il bug che lo step ha evitato,
  e salvare senza accorgersene avrebbe moltiplicato l'importo per cento. Poi le due cose di
  impaginazione: che la cifra grande in cima alle spese e ai Grafici non vada a capo col simbolo
  davanti (`€1,234.56` è più stretto di `1.234,56 €`, quindi il rischio è basso, ma è l'unico
  numero a 38 punti), e che nei grafici le etichette compatte dicano «1.2k» e non «1,2k». Da
  guardare anche un gruppo in **franchi** letto in inglese: deve dire «CHF 5.00» con lo spazio
- **Lo Step 40, dove il rischio non è più su tre schermate ma su decine.** Il testo inglese è
  più lungo di quello italiano quasi ovunque («Who fronted it» contro «Chi ha anticipato», «This
  group's key can't be read on this device» contro la sua frase italiana), e qui finisce dentro
  superfici molto più strette delle tre dello Step 38: i chip dei filtri nella barra scorrevole,
  le etichette compatte degli assi, le due righe del widget «Fra di voi», i titoli dei sedici
  widget nel foglio «Componi la dashboard». Da guardare in ordine: la barra dei filtri in
  inglese con **tre o quattro filtri attivi**, che deve continuare a scorrere invece di
  accavallarsi; il foglio di composizione della dashboard, dove i titoli più lunghi («How many
  expenses, by range») non devono spingere i due chevron fuori dalla riga; e le tre frasi
  spezzate in due chiavi per via del grassetto in mezzo (il pareggio, l'avviso «gruppo nuovo»
  dell'import, il nome dello switch di azzeramento) — è lì che un ordine delle parole diverso fra
  le due lingue si vedrebbe subito, ed è per questo che sono rimaste con lo stesso ordine
  italiano e inglese invece di essere riscritte

- **L'icona nuova, che è la prima cosa che si vede e non ha alcun test che la copra.** Nel launcher
  la maschera adattiva la ritaglia, e il segno le sta dentro per appena il 6%: da guardare che non
  tocchi i bordi né in tondo né in squircle. Poi i tre posti dove la stessa immagine ricompare con
  regole diverse — la **silhouette monocromatica** nella tendina delle notifiche (dove la J deve
  restare un buco leggibile e non chiudersi), l'**icona a tema** di Android 13+ con lo sfondo colorato
  dal sistema, e i **due widget** sulla home. Da guardare anche a 48 px nel cassetto delle app, che è
  la dimensione a cui vive davvero, e su uno sfondo chiaro: il fondo dell'icona è quasi bianco, ed è
  l'unico punto in cui potrebbe sparire contro il wallpaper

- **La frase dello Step 68, che è tutta da guardare perché non ha nulla di automatizzabile.** In un
  gruppo di **due** membri che ha già «Esselunga» in elenco e una categoria «Spesa»: home → tocca
  **«Scrivi»**, il bottone chiaro accanto a «Spesa» in basso a destra → digita
  `25 spesa esselunga ieri metà a te`. Quattro cose, nell'ordine in cui si rompono:

  1. **mentre si scrive**, sotto il campo la frase si ricompone con le parole capite in accento e
     le altre in grigio — è l'unico pezzo dello step che nessun test può vedere, perché è
     tipografia;
  2. sotto ancora compaiono **cinque pillole**: `25,00 €`, `Ieri`, `Spesa`, `Esselunga`,
     `Metà e metà`;
  3. **«Continua»** apre la nuova spesa con 25,00 € nel numero grande, la riga Dettagli che dice
     «Esselunga», la data di ieri e la divisione a metà;
  4. **Salva** → la spesa compare nell'elenco sotto «Ieri» con quei valori, e riaprendola è una
     spesa normale: si modifica e si cancella come tutte le altre.

  Poi le tre prove che cercano un guasto invece di confermare che funziona: una frase con un **`&`
  e un `#`** dentro (`caffè & cornetto #2 3,40`), che deve arrivare intera nel nome della spesa e
  non troncare la rotta; `birra 5 10`, che non deve compilare l'importo e deve dire perché; e
  **l'app in inglese**, dove il bottone «Scrivi» semplicemente **non c'è** — nascosto, non rotto,
  perché il lessico della grammatica è uno solo.

- **La domanda dello Step 70, nel tab Grafici.** Nello stesso gruppo che ha «Esselunga» in elenco:
  tocca il campo in cima ai Grafici e scrivi `spesa da esselunga questo mese`, poi conferma con il
  tasto di ricerca della tastiera. Cinque cose, e la quarta è quella che conta:

  1. la barra dei filtri si accende con i chip **«Questo mese»**, **«Spesa»** ed **«Esselunga»** —
     gli stessi che si sarebbero ottenuti dal foglio dei filtri;
  2. il totale in testa e i grafici sotto cambiano di conseguenza;
  3. **il campo si svuota**: da lì in poi la verità sono i chip;
  4. tocca la **×** su «Esselunga» → il chip se ne va e i grafici si riaprono. È la prova che la
     frase ha impostato **filtri veri** e non una modalità a parte, ed è l'unica cosa che nessun
     test può dimostrare;
  5. scrivi `sopra i 50` → resta il periodo, si aggiunge la soglia.

  Poi le due prove che cercano un guasto: `quanto ho sp`, che non deve **togliere niente** e deve
  dire che non ha riconosciuto nulla; e l'app **in inglese**, dove il campo non c'è affatto — come
  il bottone «Scrivi» della home, e per la stessa ragione.

Tutto il resto è verificato: 1683 test, convergenza CRDT, relay reale in produzione, e l'esecuzione
su un dispositivo Android reale.

> **Lo Step 25 è entrato in questa lista attraverso il 26**, come era stato scritto: la geometria
> non aveva interfaccia e non c'era niente da guardare, ma adesso quei numeri sono marche su uno
> schermo, e guardare i grafici del 26 è anche il modo di guardare il 25.
