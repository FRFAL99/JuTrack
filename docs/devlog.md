# Devlog

Registro cronologico dell'avanzamento. Entry in ordine cronologico inverso (più recente in alto).

---

## 2026-08-19 — Step 40: il resto della traduzione, e due bug della stessa famiglia dello Step 38

Chiude quello che gli Step 37–39 avevano lasciato aperto: grafici, dashboard, onboarding,
pairing, backup, export, import e azzeramento — più budget, categorie e pareggi del gruppo, e
la sonda diagnostica, che il piano non nominava ma restavano le sole schermate ancora in
italiano fisso. Da un centinaio di stringhe tradotte allo Step 39 se ne aggiungono circa
seicento: `it.ts` e `en.ts` sono passati da 253/279 righe a oltre 750 ciascuno.

**Il core torna a farsi toccare, per la seconda volta in due step.** `insights/query.ts`
scriveva a mano «categorie», «Pagate da», «Tutte le spese»: frasi che `queryParts` e
`describeQuery` costruiscono dentro `packages/core`, che non può importare `i18next` per la
stessa regola dello Step 0 che tiene fuori `react-native`. La soluzione è la stessa dello Step
39 per `NumberFormat`: un tipo `QueryStrings` che il chiamante passa da fuori, con un default
italiano che tiene validi i ventisette test del core scritti prima di oggi. `apps/mobile/src/
i18n/query.ts` è il modulo sottile che lo popola dal dizionario — stessa forma di `@/i18n/
money` — e una regola ESLint in più impedisce di importare `queryParts`/`describeQuery` dal
core dentro `apps/mobile`, per lo stesso motivo per cui è già vietato con `formatCents`/
`formatMoney`: la prossima chiamata scritta per abitudine tornerebbe in italiano in silenzio.

**Due costanti di modulo erano congelate nella lingua di sistema, lo stesso guasto dello Step
38 con i widget Android.** `WIDGETS` in `dashboard/widgets.ts` e `PERIOD_PRESETS` in
`filters/period.ts` calcolavano titoli e etichette una volta sola, all'import: cambiare lingua
nel profilo non le avrebbe mai aggiornate. Sono diventate funzioni — `widgets()` e
`periodPresets()` — chiamate a ogni render invece che una volta per processo.
`dashboard/layout.ts` non ne aveva bisogno: `DEFAULT_LAYOUT` legge solo gli id, che non
cambiano con la lingua, quindi ora usa `WIDGET_IDS` e non tocca `widgets()`.

**`charts/axis.ts` teneva un secondo elenco dei sette giorni della settimana**, in italiano e
in un ordine diverso da `date.weekdays` del dizionario (quello parte da lunedì, quello del
dizionario da domenica, perché lo eredita da `Date.getDay()` attraverso `grouping.ts`). Due
elenchi delle stesse sette parole sono esattamente il tipo di cosa che si sbaglia una volta e
poi non si nota più: `weekdayName` ora legge `date.weekdays` con l'indice spostato di uno,
invece di portarsi dietro un `WEEKDAY_NAMES` proprio.

**Fatto in tre pezzi, non in un passo solo — a differenza del resto del piano v5.** Il resto
del piano procedeva «un passo a sessione»; qui la sessione ha coperto in parallelo grafici/
dashboard, onboarding/pairing e backup/export/import/azzera, con due dei tre pezzi delegati e
verificati uno alla volta prima di unirli. Un pezzo ha lavorato in un git worktree isolato
apposta per non scrivere sugli stessi file di `it.ts`/`en.ts` mentre un altro pezzo li stava
ancora modificando nella copia principale — l'unione dopo è stata un'aggiunta di sezioni
disgiunte in entrambi i dizionari, con un solo incidente: un `},` di troppo lasciato da
un'unione fatta a mano, che `tsc` ha segnalato subito.

**Una frase con una parola in grassetto in mezzo non ha un modo pulito di essere tradotta
senza `Trans` di `react-i18next`, e il progetto non lo usa da nessuna parte.** Lo Step 38
aveva già risolto lo stesso problema riscrivendo la frase invece di spezzarla in due chiavi,
per non imporre al traduttore l'ordine italiano delle parole. Qui i casi erano tre — il
pareggio in `settle.tsx` («X deve **12,00 €** a Y»), l'avviso di gruppo nuovo in `importa.tsx`,
il nome dello switch in `azzera.tsx` — e per tutti e tre si è scelta la via opposta: due chiavi
`before`/`after` che sandwichano lo `<Text>` in grassetto, perché l'ordine delle tre parti
(nome, importo, nome) è lo stesso in italiano e in inglese e girare la frase avrebbe voluto
dire perdere l'enfasi visiva su un numero che conta. **Il quarto caso, nel widget «Fra di voi»
di `stats.tsx`, era stato tradotto con la via dello Step 38** — una frase sola, senza
grassetto sull'importo — invece di seguire gli altri tre: un'incoerenza vera, trovata
rileggendo il lavoro finito e non durante la scrittura. Corretta riusando `settle.
transferBefore`/`transferAfter`, gli stessi due che già esistevano, invece di aprirne una
quarta coppia.

**Due commenti d'intestazione erano falsi**, e non per una svista di oggi: `it.ts` diceva
ancora «restano allo Step 39 i grafici, la dashboard…» — la numerazione era scalata dalla nota
in cima allo Step 38 — ed `en.ts` diceva che i numeri restavano italiani, cosa vera fino allo
Step 39 e smentita da quello stesso step senza che il commento fosse mai stato aggiornato.
Corretti entrambi.

**Verificato, non assunto**

- `npm run format:check && npm run lint && npm run typecheck && npm test` sui tre workspace,
  puliti, dopo l'unione dei tre pezzi — non prima, e non su ciascun pezzo isolatamente: un
  merge additivo su due dizionari da settecento righe è esattamente il punto in cui un
  copia-incolla può lasciare una chiave duplicata che il tipo non vede finché non è tutto
  insieme.
- I ventisette test di `insights/query.test.ts` restano verdi senza essere stati toccati:
  è la prova che il default `ITALIAN_QUERY_STRINGS` di `QueryStrings` regge da solo, come il
  `DEFAULT_NUMBER_FORMAT` dello Step 39.
- Il warning ESLint «unused eslint-disable directive» insieme a un warning «missing
  dependency» sulla stessa riga di `probe.tsx`, allo stesso tempo: la disable directive era a
  due righe di distanza dalla riga che doveva coprire, per via del commento esplicativo in
  mezzo. Spostata a ridosso di `}, []);`.

**Ancora da verificare sul telefono**

Tutto: è lo Step 41. Le tre schermate di Step 38 avevano già un rischio di sbordo del testo
inglese sulle pillole più strette; qui il rischio si allarga a molte più superfici piccole —
i chip dei filtri, le etichette degli assi, le due righe del widget del saldo.

**Verifica:** 1250 test verdi (639 core + 568 app + 43 relay), typecheck, lint e
`format:check` puliti su tutti e tre i workspace.

**Prossimo:** lo Step 41 — verifica end-to-end su telefono reale: le tre notifiche, i due
widget, il cambio di lingua a schermo, la valuta di default su una spesa nuova. Con questo
il piano v5 ha tutto il codice scritto; quello che manca è la stessa prova sul campo che
manca ai quattro piani precedenti e al redesign.

---

## 2026-08-17 — Step 43: l'avviso «chiave non salvata», il quarto e l'unico irreversibile

Il gemello dello Step 42, e nasce dalla stessa domanda vista dall'altro lato: il 42 dà una via
d'uscita a chi la chiave l'ha persa, questo prova a far sì che non la perda.

**Il rischio peggiore dell'app era scritto in un posto che lo legge solo chi non ne ha
bisogno.** In cima a `/backup` c'è da sempre la frase giusta — «non esiste un password
dimenticata», il relay conserva blob che non sa leggere, persa la chiave i dati non tornano —
ma la legge chi apre `/backup`, cioè esattamente chi il backup lo sta già facendo. Chi non ci
è mai entrato non ha mai visto quella frase, ed è la persona a cui serve.

**La forma dell'avviso viene da un fatto crittografico, e per questo è più semplice degli
altri tre.** La `vaultKey` nasce con il gruppo e **non cambia mai**: un backup fatto oggi vale
per sempre. Quindi non c'è nessuna scadenza da riarmare — è l'opposto del promemoria spese, che
si riprogramma a ogni apertura — e non c'è un livello che sale come in `near`/`over` o
`stalled`/`stopped`. Lo stato è binario: o la chiave è al sicuro, o non lo è. Salvata una volta,
il gruppo esce dal giro e non ci rientra, e `reviewBackup` esce alla prima riga per il resto
della sua vita.

**La soglia è in spese, non in giorni**, e la ragione è la stessa che decide tutte le soglie di
questo progetto: quello che si rischia si misura in quanto c'è dentro. Un gruppo creato ieri e
ancora vuoto non ha niente da perdere, e avvisare subito insegnerebbe a ignorare l'avviso
proprio prima che diventi vero. Cinque spese: abbastanza da essere una serata di conti che
nessuno ha voglia di riscrivere, poche abbastanza da arrivare mentre salvare la chiave costa
ancora un minuto.

**Un avviso per gruppo, mai ripetuto.** Ripetere «non hai salvato la chiave» a ogni apertura è
il modo più rapido di far spegnere l'interruttore, e la stessa frase resta comunque in
`/backup` per chi ci torna. È la regola dell'«un avviso per episodio» dello Step 33, applicata
a un episodio che non finisce mai.

**Il limite onesto, scritto nel file e non scoperto dopo.** L'app conosce i backup che **ha
visto fare**: `recordBackup` scrive un segno quando la cifratura riesce, e prima di oggi quel
segno non lo scriveva nessuno. Un gruppo salvato l'anno scorso risulta «mai salvato», e
l'avviso lo dirà. Per questo il testo dice «su questo telefono **non risulta** un backup»
invece di «non hai mai salvato»: la prima è vera in entrambi i casi, la seconda sarebbe falsa
in uno dei due — ed è la stessa disciplina che allo Step 7 del redesign ha bocciato «Metà e
metà» e «Tutto mio». L'errore va in questa direzione di proposito: un avviso di troppo fa
controllare, uno mancante fa perdere dei dati.

**Anche `parseBackupMarks` sbaglia dalla parte opposta a `parseSyncMarks`, e non è una
distrazione.** Là un segno illeggibile vale «episodio mai visto», perché sbagliare di là
produrrebbe un avviso su un guasto finito da settimane. Qui un segno illeggibile vale «chiave
mai salvata», perché sbagliare di là produrrebbe **silenzio su una chiave a rischio**. Fra un
avviso di troppo e dei dati persi non c'è partita, e le due funzioni si somigliano abbastanza
da meritare che la differenza sia scritta in tutte e due.

**Marcare il backup è il massimo che si possa osservare, e nemmeno quello è certezza.** Né il
foglio di condivisione né gli appunti dicono se il file è stato poi conservato: `shareAsync`
torna quando il foglio si è aperto, e un annullamento dopo non si vede — lo diceva già
`ShareOutcome`. «Salvato» qui significa «la chiave cifrata ha lasciato l'app», e la scelta di
marcare anche il ripiego sugli appunti discende da lì: in entrambi i casi l'app ha fatto tutto
ciò che poteva vedere.

**Il quarto interruttore non ha toccato le righe degli altri tre**, che era la previsione
scritta in `settings.ts` allo Step 33 e adesso è verificata due volte. L'unica cosa da
aggiornare sono stati i test, che confrontavano l'oggetto intero — e c'è ora un test in più
per il caso vero di chi aggiorna: un JSON con tre chiavi che si legge con il quarto avviso
spento invece di far cadere la lettura.

**Un quarto canale Android**, per la quarta volta la stessa ragione: tre interruttori nella
nostra schermata e tre nelle impostazioni di sistema, o il secondo posto smentirebbe il primo.
Con una nota che vale solo per questo — è l'unico avviso che parla di una perdita
irreversibile, e chi zittisce gli altri tre non deve zittire anche questo.

**Verifica:** 1250 test verdi (639 core + 568 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato. **Nessuna build EAS nuova**: nessun modulo
nativo aggiunto, e il canale di notifica si crea a runtime come gli altri tre.

---

## 2026-08-17 — Step 42: rileggere un export JSON, la metà che mancava

`/export` diceva «per conservarli» e produceva una copia integrale del vault che **nessuno
sapeva rileggere**. Il file serviva a portare i dati altrove, non a farli rientrare: chi perdeva
il telefono senza il backup della chiave si ritrovava con un file pieno di spese e nessun modo
di riaverle dentro l'app se non riscrivendole a mano. Conservare senza poter ripristinare non è
conservare, e la parola nella schermata prometteva più di quanto il codice mantenesse.

**Non è il gemello di `/backup`, ed è la prima cosa che la schermata dice.** Ripristinare una
chiave riapre _quel_ vault: le spese tornano dal relay e la sincronizzazione riprende. Importare
un JSON ricostruisce i **dati** in un gruppo **nuovo**, con una chiave nuova. La differenza non
è un dettaglio implementativo: il file è in chiaro e non contiene alcuna chiave — **non
potrebbe**, o chiunque lo riceva entrerebbe nel gruppo — quindi non c'è nessun vault da
riaprire. Il gruppo importato non si sincronizza con i telefoni di prima, e per tornare a
condividerlo serve un invito. Detto in cima, non scoperto dopo.

**Il parser è una porta, e va trattato come tale.** Tutto il resto del modello riceve dati
scritti dall'app o arrivati cifrati dall'altro telefono. Qui entra un file che può essere stato
modificato a mano, troncato da un trasferimento, o prodotto da una versione futura — e quello
che passa finisce **dentro il documento**, da dove si sincronizza: un dato sbagliato accettato
adesso raggiunge l'altro telefono e non si disfa più. Il criterio è quello di `strList` e
`parseMarks`, applicato con più forza.

**Due livelli di rifiuto, e la differenza è quella che rende la schermata usabile.** Il **file**
si rifiuta intero quando non si sa cosa sia — JSON illeggibile, `format` sbagliato, versione
futura — perché proseguire vorrebbe dire indovinare. Il **record** si scarta da solo quando il
file è giusto ma quella riga non sta in piedi, e ogni scarto finisce nel report **con il
motivo**. Scartare in silenzio sarebbe il difetto peggiore che questa funzione possa avere: chi
importa crederebbe di aver riavuto tutto.

**Le invarianti si difendono alla porta, non a valle.** È l'unico punto del progetto in cui dei
record arrivano già formati senza passare da `addExpense`, quindi le regole che `VaultStore` fa
rispettare in scrittura vanno rifatte qui: quote che sommano al totale, importi interi in
centesimi, riferimenti ai membri che esistono davvero. Una spesa le cui quote non tornano
produrrebbe un saldo sbagliato per sempre e nessuno saprebbe da dove viene; una spesa pagata da
un id che non è nella lista Persone comparirebbe nei totali e sparirebbe dai saldi — visibile in
un posto e non nell'altro, che è il modo peggiore di sbagliare. È la stessa famiglia del bug dei
membri duplicati dello Step 11, con un'altra origine.

**Un `12.5` si scarta invece di arrotondarlo.** È il float che la regola ferrea del progetto
tiene fuori dal modello, e arrotondarlo qui vorrebbe dire decidere per conto di chi ha scritto
il file.

**Categoria e budget hanno criteri diversi, e la differenza è di prodotto.** Una spesa che
riferisce una categoria assente entra **senza** categoria — `categoryId` è già nullabile, e una
spesa senza categoria resta una spesa — mentre un budget senza categoria si scarta: non
comparirebbe in nessuna schermata e non si potrebbe nemmeno cancellare.

**Le versioni vecchie si leggono, quelle future no.** Un file v1 non ha `store` né `tags` e si
legge con gli stessi fallback (`''` e `[]`) che `readExpense` usa sui record scritti prima dello
Step 23: è la stessa additività, vista dall'altro lato. Un file di versione **maggiore** si
rifiuta invece di leggerne la parte comprensibile — la regola dei formati binari di
`architecture.md` applicata qui, perché un client vecchio che legge a metà un formato nuovo
scrive nel documento una versione mutilata dei dati e la sincronizza.

**`importSnapshot` non passa dai metodi normali dello store, ed è tutto il punto.** `addExpense`
e `addMember` chiamano `newId`: rigenerare gli id spezzerebbe `paidBy`, le chiavi di
`split.shares`, il `categoryId` e i due membri di ogni pareggio — un vault fatto di spese pagate
da nessuno. E non valida, deliberatamente: la validazione sta nel parser, e ripeterla sarebbe
una seconda regola da tenere allineata alla prima. Una sola transazione, quindi **un** update
Yjs: c'è il test che lo verifica, perché migliaia di `set` separati vorrebbero dire migliaia di
righe nel log e una UI che si ridisegna a metà di un vault mezzo importato.

**`assertEmpty` rende impossibile da sbagliare ciò che sarebbe stato da ricordare.** Su un
documento che ha già dei record, gli id coincidenti sovrascriverebbero e gli altri si
affiancherebbero: una fusione che nessuno ha chiesto, e che per una spesa cambierebbe dei saldi.
Il nome del gruppo in `meta` non conta come record, così un gruppo appena creato e già nominato
resta importabile.

**Il documento si costruisce in memoria e il gruppo nasce già pieno.** Passare dal runtime
avrebbe voluto dire creare il gruppo, aprirlo, aspettare che il `VaultProvider` lo montasse e
solo allora scrivere — con in mezzo una finestra in cui esiste un gruppo vuoto che l'utente può
già vedere. `GroupRegistry.createFromState` scrive lo stato nel log prima che qualcuno possa
aprirlo, ed è lo stesso meccanismo di `regenerate`: infatti il pezzo comune è uscito in
`seedDocument`, chiamato da entrambi.

**L'export non porta il nome del gruppo**, e non è una dimenticanza: `VaultSnapshot` contiene i
cinque insiemi di record, mentre il nome sta in `meta`, che la fotografia non attraversa.
Aggiungerlo avrebbe voluto dire alzare la versione del formato per un campo che si può
chiedere — e un file vecchio quel campo non ce l'avrebbe comunque. Si propone la data
dell'export, che è l'unica cosa che distingue due file dello stesso vault, e si lascia cambiare.

**Si incolla, non si sceglie un file**, per la sesta volta nel progetto: `expo-document-picker` è
un modulo nativo, cioè una build EAS nuova per una comodità. `/backup` chiede di incollare per
la stessa ragione, e le due schermate restano coerenti fra loro.

**Leggere e importare sono due tocchi**, non uno: creare un gruppo prima di aver detto cosa c'è
dentro vorrebbe dire far scoprire gli scarti quando il gruppo esiste già e va tolto a mano. E
gli scarti si mostrano **raggruppati per motivo**, non per record: un file troncato produce lo
stesso scarto su centinaia di spese, e centinaia di righe identiche nasconderebbero l'unica
diversa.

**Verifica:** 1250 test verdi, typecheck, lint e `format:check` puliti, `expo export --platform
android` completato. **Nessuna build EAS nuova**: il parser è JS puro nel core, e la schermata
usa solo moduli già presenti.

---

## 2026-08-13 — Step 39: il formato dei numeri, e il primo ingresso in `packages/core` da otto step

Uno step che il piano dell'11 agosto non aveva: lo ha reso necessario lo Step 38, che ha
tradotto tre schermate lasciandole a mostrare «1.234,56» anche in inglese. La numerazione da
qui in poi è scalata di uno — la traduzione del resto diventa il 40, la verifica su telefono il
41 — ed è scritto nel piano perché non si scopra rileggendo.

**Non era un dettaglio tipografico, era l'unica cosa che la traduzione diceva ancora di
falso.** A un lettore inglese «1.234,56» non è un numero scritto in un altro modo: è un numero
diverso, perché per lui il punto è il decimale. Tutto il resto dello Step 38 diceva qualcosa di
meno — la riga di stato del sync in italiano, i nomi dei gruppi non tradotti — e questo invece
diceva qualcosa di sbagliato.

**Era previsto da settimane, nel posto giusto e con la data sbagliata.** Il commento in cima a
`packages/core/src/model/currency.ts` dice dallo Step 29 che «la posizione del simbolo e il
separatore decimale sono convenzioni della **lingua**, non della moneta, e vivono nello Step 37
insieme al resto dell'i18n». Il 37 era infrastruttura e non li ha toccati, il 38 li ha lasciati
fuori di proposito: erano un cambiamento a `packages/core` da non infilare in coda a una
sessione di traduzione.

**Il vincolo che ha deciso la forma della soluzione è la regola dello Step 0.** `packages/core`
non può dipendere da `i18next`, e non per gusto: è la condizione che gli permetterà di girare
sul web, ed è verificata da una regola ESLint. Quindi il core **riceve** il formato come
parametro — `NumberFormat`, con i due separatori, il lato del simbolo e cosa ci va in mezzo —
esattamente come dallo Step 29 riceve il simbolo della valuta. I due parametri restano
distinti, e non è pedanteria: **si può leggere in inglese una spesa in euro**, ed è anzi il caso
normale per chi vive qui e non parla italiano.

**La parte che poteva diventare un lavoro enorme è rimasta una riga per file.** I punti che
formattano denaro sono venticinque, e in alcuni la chiamata è dentro un `map` dentro un
grafico: infilarci un terzo argomento avrebbe voluto dire venticinque file da modificare **e**
un argomento da ricordare per sempre. Al suo posto c'è `@/i18n/money`, un modulo di quaranta
righe che espone `formatCents` e `formatMoney` **con la stessa firma di prima** e la lingua
dentro. Il cambiamento su ogni file è stato l'import.

**E una regola ESLint che vieta di tornare indietro.** Senza, la prossima chiamata scritta per
abitudine importerebbe di nuovo dal core e stamperebbe l'italiano fisso, e nessuno se ne
accorgerebbe: il guasto è silenzioso, come quello di `utf8ToBytes` dello Step 3 — stesso
meccanismo, stessa ragione. L'unico file autorizzato a violarla è quello che le avvolge.

**Quattro punti componevano importo e simbolo a mano, e sono la scoperta dello step.** Scritti
come `` `${formatCents(x)} ${symbol}` ``, sembravano formattazione e invece erano una
**decisione**: che il simbolo va dopo. In italiano è vero, in inglese no. Tre erano stringhe e
sono diventate `formatMoney`; il quarto era JSX — la cifra grande in cima alle spese e ai
Grafici, dove il simbolo ha un colore più tenue e quindi è un `<Text>` a parte, che
`formatMoney` non può produrre. Da lì è nato `HeroAmount`, che è anche la fine di una
duplicazione che c'era già: due copie dello stesso JSX diventano un problema il giorno in cui la
regola che contengono cambia, ed è successo oggi.

**Un bug che lo step avrebbe introdotto se non lo si fosse cercato.** `ExpenseForm` apriva una
spesa esistente facendo `formatCents(...).replace(/\./g, '')`, per togliere il raggruppamento
che `parseAmount` non accetta. Con il formato inglese quel punto **è il separatore decimale**:
aprire in inglese una spesa da 12,30 avrebbe mostrato `1230` nel campo, e chi avesse salvato
senza guardare avrebbe moltiplicato l'importo per cento. Adesso toglie
`numberFormat().group`, cioè il carattere giusto per la lingua giusta. Stessa famiglia di
problema in `compactAmount` dei grafici, che scriveva «1,2k» a mano.

**«CHF5.00» ha meritato tre righe in più.** `ENGLISH_NUMBERS` non mette spazio fra simbolo e
cifra perché `€`, `$` e `£` non lo vogliono — ma dove il simbolo _è_ un codice, senza spazio si
legge come una sigla unica. La regola guarda il **carattere di confine**, non un elenco di
valute: `CHF 5.00` e `CA$5.00` escono giusti tutti e due, e una valuta aggiunta domani non ha
bisogno di essere prevista.

**L'export CSV non è stato toccato, e la ragione è che era già stato deciso bene.** `csv.ts` ha
una `centsToDecimal` sua — punto decimale, nessun raggruppamento — con un commento che dice
esplicitamente di essere diversa da `formatCents` perché quella è «la forma italiana
leggibile». Quel commento è stato scritto molto prima che esistesse una seconda lingua, e ha
retto: il file esportato è **identico** in italiano e in inglese, che è l'unica cosa sensata per
un file che un foglio di calcolo deve rileggere.

**Fuori dallo step, di proposito:** `parseAmount`, che accetta già sia la virgola sia il punto e
quindi è indipendente dalla lingua — c'è un test nuovo che lo fissa in entrambe — e le frasi
italiane dentro `insights/query.ts`, che sono core ma sono **traduzione di schermate** e
appartengono allo Step 40.

**Verificato, non assunto**

- **La guardia ESLint morde davvero.** Scritto un file di prova che importa `formatMoney` da
  `@jutrack/core`, ottenuto l'errore atteso, cancellato il file. È la stessa verifica fatta
  allo Step 2 per le regole su `packages/core`, e per la stessa ragione: una guardia che non si
  prova non è una guardia.
- **La resa è quella voluta**, stampata davvero e non dedotta: `1.234.567,89 €` / `€1,234,567.89`,
  `-5,00 €` / `-€5.00`, `0,05` / `0.05`, `CHF 5.00`.
- **I quattro test inglesi dello Step 38 sono falliti**, ed è la conferma che lo step fa
  qualcosa: asserivano «Juju owes you 25,00 €» e adesso leggono «Juju owes you €25.00». Sono
  stati aggiornati, non rilassati.
- **Il segno meno resta davanti a tutto**, anche col simbolo in testa: `-€5.00` e non `€-5.00`.
  Ha un test suo perché è la forma dei saldi, cioè il numero che più conta di tutti.

**Ancora da verificare sul telefono**

Che la cifra grande in cima alle spese non vada a capo con il simbolo davanti: in inglese
`€1,234.56` è più stretto di `1.234,56 €` di un carattere, quindi il rischio è basso, ma è
l'unico posto in cui il numero è a 38 punti. E il campo importo del form aperto **in inglese su
una spesa vecchia**, che è il bug descritto sopra: deve mostrare `12.30`, non `1230`.

**Verifica:** 1170 test verdi (601 core + 526 app + 43 relay, di cui 21 nuovi), typecheck, lint
e `format:check` puliti, `expo export --platform android` completato.

**Prossimo:** Step 40 — la traduzione del resto: grafici e dashboard, quel che resta di Tu,
onboarding, pairing, backup/export, azzera, e le frasi di `insights/query.ts`.

---

## 2026-08-13 — Step 38: la traduzione delle tre schermate, e i test diventati dipendenti dalla lingua della macchina

Le tre schermate che si aprono più spesso — le spese del gruppo, la nuova spesa, l'elenco dei
gruppi — e con esse i sei moduli condivisi che ci scrivono dentro. Dopo lo Step 37 le stringhe
tradotte erano una cinquantina; adesso sono duecento.

**Il problema dello step non erano le schermate, erano i moduli sotto.** `describe.ts` dice da
quanto non si sincronizza, `grouping.ts` scrive «lunedì 1 agosto», `balance-line.ts` decide se
«ti deve» o «devi», `split-text.ts` spiega la divisione, `list.ts` scrive il sottotitolo di ogni
gruppo. Sono moduli **puri di proposito**, perché è lì che stanno i casi limite ed è lì che i
test dell'app arrivano — non importano `react-native`. Un hook non ce lo si può mettere.

La soluzione è una riga: `import i18n from '@/i18n'`, e non `from 'i18next'` che pure sarebbe la
**stessa istanza**. Importare il modulo che la _inizializza_ rende l'ordine una proprietà del
grafo degli import invece che una cosa da ricordare: non esiste un percorso, in app o nei test,
che ottenga una `t` capace di restituire le chiavi al posto delle frasi.

**Ne segue una regola che vale per tutto il resto della traduzione, e va tenuta a mente
disegnando.** Quelle funzioni leggono la lingua **quando girano**, e non avvisano nessuno quando
cambia: a far ridisegnare è `useTranslation()` nel componente. Quindi un componente che mostra
una data o un saldo deve chiamarlo **anche se non ha stringhe proprie** — `SyncBadge` e
`GroupRow` lo fanno senza usare `t` — e un `useMemo` che avvolge una di quelle chiamate deve
avere `t` fra le dipendenze, che è l'unico appiglio che React ha per accorgersi del cambio. In
`GroupHome` quella dipendenza è l'unico `eslint-disable` dello step: la regola vede le variabili
citate nel corpo, e `groupByDay` la lingua se la va a prendere da sé.

**Le date sono la parte che sembrava facile e non lo era.** Da `grouping.ts` sono usciti due
array di parole italiane, e tradurre solo quelli avrebbe prodotto **«Monday 1 August»**: in
inglese il mese viene prima del giorno, e quell'ordine appartiene alla lingua esattamente quanto
la parola «August». Nel dizionario sono finiti quindi cinque **modelli** — `date.dayTitle`,
`dayTitleOtherYear`, `dayShort`, `dayShortOtherYear`, `monthYear` — e nel codice sono rimasti
solo i pezzi da infilarci. Quattro dei cinque cambiano forma fra le due lingue; il quinto è nel
piccolo elenco delle eccezioni del test, insieme a «vault» e a due altre.

Niente `Intl.DateTimeFormat`, che pure saprebbe fare tutto: su Hermes non è verificato — è la
stessa incognita dello Step 37 — e ripiegherebbe in silenzio su un formato qualsiasi. Un modello
scritto da noi si legge, si prova, e non dipende dal motore.

**I plurali si contano a mano, e il motivo è verificato leggendo il sorgente di i18next.**
`plural()` sceglie `.one` o `.other` con un confronto, invece di lasciar fare a
`Intl.PluralRules`. Non è diffidenza generica: `PluralResolver.getRule` intercetta l'errore e
restituisce una **regola finta** quando `Intl` manca, e quella regola sceglie sempre la stessa
forma. Non fallirebbe: scriverebbe «1 spese» senza dirlo a nessuno. Contare a mano è corretto
per italiano e inglese, che dividono uno da molti allo stesso modo, ed è il limite dichiarato
della funzione — il polacco ha tre forme, l'arabo sei, e a quel punto `Intl` va rimesso in mezzo.

Lo stesso sorgente dice anche una cosa che **ridimensiona un rischio dello Step 37**: tutti gli
usi di `Intl` in i18next stanno dentro un `try`, quindi `init` non può fallire per la sua
assenza. Senza `Intl` l'app parte comunque; è solo il plurale che sceglierebbe male, e adesso
non lo sceglie i18next.

**Il guasto che questo step ha scoperto in sé stesso: i test erano diventati dipendenti dalla
lingua della macchina.** L'istanza si inizializza con `resolveLanguage(null, systemLocale())`,
cioè con la lingua di **sistema**: qui è `it-IT` e tutto passava. Forzando l'inglese, **66 test
falliscono** — quelli di date, saldo, sync, divisione, campi extra e sottotitoli, cioè tutti
quelli scritti negli step precedenti e mai toccati oggi. Su un runner di CI inglese sarebbero
diventati rossi senza che dal messaggio si capisse perché. Il rimedio è un `setupFiles` che fissa
l'italiano prima di **ogni** test, `beforeEach` e non `beforeAll` perché chi prova l'inglese
cambia lingua a metà file e senza ripristino il test successivo erediterebbe la scelta secondo
l'ordine di esecuzione.

**Un difetto che lo step stava per introdurre nei widget, e che è stato chiuso qui.** La
didascalia del widget del mese è «Speso in {mese}», e il nome del mese da oggi è tradotto:
sarebbe uscito **«Speso in August»**, che è peggio di entrambe le lingue. I widget non erano
nel piano dello Step 38 — sarebbero il 39 — ma ci sono entrati per forza. Due conseguenze:
`UNKNOWN_BALANCE` e `UNKNOWN_MONTH` sono diventate **funzioni**, perché una costante di modulo
si calcola all'import e resterebbe congelata nella lingua di sistema per tutta la vita del
processo; e il task headless dello Step 36 adesso applica la lingua del profilo, che legge dallo
stesso `loadProfile` che gli serviva già — senza, un widget avrebbe potuto cambiare lingua da
solo ogni mezz'ora rispetto all'app sotto.

**Due cose non passano da `t`, e non ci passeranno mai.** I nomi di gruppi, categorie, persone,
negozi e tag stanno nel documento condiviso e li ha scritti qualcuno: tradurli vorrebbe dire
mostrare all'altro telefono un gruppo con un altro nome. E `state.message` del sync, che viene
dal motore o dal relay: tradurlo significherebbe avere un elenco dei guasti previsti, cioè
esattamente ciò per cui quel campo esiste per non averlo. Meglio una diagnosi vera in inglese che
una generica nella lingua giusta.

**Una frase è stata riscritta invece che tradotta.** Lo stato vuoto diceva «Tocca **Spesa** per
registrare la prima», col nome del bottone in grassetto dentro la frase. Tenere il grassetto
avrebbe voluto dire spezzare la frase in due chiavi, imponendo al traduttore l'ordine italiano
delle parole — che è il modo più comune di rompere una traduzione. Adesso è una frase sola con il
bottone fra virgolette, e in cambio dice anche **dove** si trova.

**Quello che resta italiano, e non è una svista: i numeri.** `formatCents` scrive «1.234,56» in
tutte e due le lingue, perché il separatore decimale sta in `packages/core` e cambiarlo tocca
ogni importo dell'app più l'export CSV. A un lettore inglese «1.234,56» si legge male, e va detto
chiaro invece di nasconderlo: è un lavoro suo, e il posto naturale è prima dello Step 39.

**`packages/core` non è stato toccato, per l'ottavo step di fila** — e stavolta con una tentazione
vera: il separatore decimale sarebbe stato il primo motivo legittimo per entrarci da otto step. È
rimasto fuori perché è un cambiamento che va misurato, non infilato in coda a un altro.

**Verificato, non assunto**

- **I 66 test che sarebbero falliti in CI.** Non è una stima: la prova è stata fatta forzando
  `changeLanguage('en')` nel setup e contando. Il primo tentativo — rieseguire con
  `LC_ALL=en_US` — **non provava niente**, perché su Windows Node ignora quelle variabili e
  prende la lingua dal sistema: `Intl.DateTimeFormat().resolvedOptions().locale` restituiva
  `it-IT` in entrambi i casi.
- **L'inglese è davvero nel bundle Hermes**, non solo nei tipi: `expo export --platform android`
  completa e il `.hbc` contiene «Split evenly», «owes you», «Wednesday», «Spent in»,
  «Half and half» e «Uncategorised».
- **`getRule` di i18next ripiega su una regola finta invece di sollevare**, letto nel sorgente
  installato prima di decidere come fare i plurali. È la ragione per cui `plural()` conta a mano,
  ed è anche ciò che rende `init` sicura senza `Intl`.
- **Ventiquattro test nuovi provano la seconda lingua**, e non ripetono i primi: coprono i punti
  dove le due lingue non sono la stessa frase con parole diverse — l'ordine dei pezzi nelle date,
  il soggetto che l'inglese scrive e l'italiano no («You owe» contro «Devi»), la posizione del
  verbo rispetto all'importo («Mancano 5,00 €» contro «5,00 € missing»), la s dei tag che in
  italiano non c'è.

**Ancora da verificare sul telefono**

Che la tastiera decimale e i tre campi del form si comportino come prima: il form è stato toccato
in venti punti, tutti di testo, ma è la schermata in cui si **scrive** nel documento condiviso.
E che nessuna etichetta inglese sbordi dove l'italiana stava: «Who pays and how it splits» è più
lunga di «Chi paga e come si divide», e le pillole di divisione cambiano larghezza.

**Verifica:** 1149 test verdi (588 core + 518 app + 43 relay, di cui 24 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato.

**Prossimo:** lo Step 39 — grafici e dashboard, Tu che resta da finire, onboarding, pairing,
backup/export, azzera. Prima però conviene il separatore decimale in `packages/core`: è l'unica
cosa che rende ancora sbagliata la lettura inglese delle schermate già tradotte.

---

## 2026-08-13 — Step 37: l'infrastruttura i18n, e la libreria che il piano nominava ma non serviva

Il primo dei quattro step sulla lingua, e il primo posto in cui le frasi dell'app smettono di
stare dentro i componenti. `i18next` + `react-i18next`, il campo `language` sul profilo, un
selettore in Tu, e **una schermata tradotta per intero** per poter dire che funziona.

**Delle tre librerie che il piano nominava ne sono entrate due, e la terza è la decisione dello
step.** `expo-localization` serviva a una cosa sola — sapere in che lingua è il telefono al
primo avvio — ed è **un modulo nativo**. Metterlo dentro avrebbe fatto due danni: reso questo
il terzo step del piano v5 a chiedere una build EAS, mentre il piano lo dà per «Build EAS: No»,
e soprattutto rotto l'app **sulla build oggi installata**, che quel modulo non ce l'ha. Un
telefono che non riesce più ad aprire l'app per sapere se preferisce l'inglese è un prezzo fuori
scala rispetto a quello che si compra. La lingua di sistema si legge invece da
`Intl.DateTimeFormat().resolvedOptions().locale`, che su Hermes c'è già — ed è la stessa
conclusione dello Step 36, dove la sveglia dei widget c'era già e la libreria di background non
serviva.

Serve a una cosa sola e per un momento solo: **il primo avvio, prima che qualcuno tocchi il
selettore**. Sbagliare lì costa un tocco, non un dato, e per questo la sonda sta dentro un `try`
e può rispondere `null`: su un motore senza `Intl` si parte in italiano invece di non partire.

**L'ordine delle sorgenti è tutto lo step in una riga:** scelta, poi telefono, poi italiano.
`resolveLanguage` riceve la lingua di sistema come **parametro** invece di andarsela a prendere,
ed è ciò che rende verificabile senza telefono la parte dove sta davvero la decisione. La scelta
esplicita viene prima perché è l'unica fatta da una persona: chi ha scelto l'italiano su un
telefono in inglese non deve ritrovarsi l'inglese al riavvio.

**`normalizeLanguage` butta via la regione, e non è pigrizia.** Le impostazioni di un telefono
danno `en-GB`, non `en`. Non esiste un dizionario `en-GB` distinto da `en-US`, e trattarli come
lingue diverse vorrebbe dire non riconoscerne **nessuna delle due** — cioè partire in italiano
su ogni telefono inglese del mondo.

**L'italiano è la fonte, l'inglese la copia, e `fallbackLng` punta alla fonte.** `en.ts` si
dichiara `: Dictionary`, cioè della forma di `it.ts`: una chiave aggiunta di là e dimenticata di
qua è un errore di `tsc`, non una schermata che un giorno mostra `you.sync.title` a qualcuno. E
quando la traduzione resterà indietro — succederà, agli Step 38 e 39 — si leggerà la frase
italiana, non la chiave grezza.

**Il test sui dizionari guarda quello che il tipo non può vedere.** Per TypeScript i valori sono
tutti `string`, quindi tutti uguali. A schermo non lo sono: c'è la frase vuota, che non sembra
una traduzione mancante ma un problema di layout; c'è `{{days}}` che diventa `{{day}}` in
traduzione, e si legge «If days go by» senza numero e senza errori da nessuna parte; e c'è
l'italiano ricopiato di sotto per fretta. Sono tre test, e oggi sorvegliano una cinquantina di
stringhe — ma gli Step 38 e 39 ne porteranno qualche centinaio, tradotte a mano.

**Due cose non passano da `t`, e sono la stessa cosa detta due volte.** I nomi delle lingue nel
selettore restano «Italiano» ed «English» in qualunque lingua sia l'app: chi apre quel selettore
proprio perché non capisce quello che ha davanti deve poter riconoscere la propria, e «Inglese»
non aiuta chi cerca «English». E i nomi di gruppi, categorie e persone non si traducono mai:
stanno nel documento condiviso, e tradurli vorrebbe dire mostrare all'altro telefono un gruppo
con un altro nome.

**Qui la lingua e la valuta si separano.** Sono due campi gemelli nel profilo, scritti nello
stesso modo, ma la valuta è **una scelta comune di fatto** — due membri con valute diverse
sommano unità diverse, e la nota sotto il selettore lo dice — mentre la lingua no. Traduce l'app
e nient'altro: due persone possono leggere lo stesso gruppo in due lingue senza che un solo
numero cambi.

**Tradotta `tu.tsx`, e per intero.** È la schermata che contiene l'interruttore, quindi l'unica
in cui il cambio si vede senza andare da nessuna parte; le tre etichette dei tab sono lì a
dimostrare che il cambio **esce** da dove lo si è toccato. Restano fuori due cose, e il confine è
netto: la riga di stato del sync, che la scrive `describe.ts` e che compare identica anche in
fondo alla lista spese — tradurre un modulo condiviso vuol dire tradurre le schermate che lo
usano, ed è lo Step 38 — e i dati del gruppo, che non sono testo dell'app.

**Il campo `language` si legge come la valuta, e la ragione vale il doppio.** Un valore
illeggibile non fa cadere il profilo: si torna al default e si continua. Se mandasse
all'onboarding, renderebbe irrecuperabile il telefono proprio a chi non capisce la lingua in cui
l'onboarding è scritto.

**`packages/core` non è stato toccato, per il settimo step di fila.** Il core non ha stringhe da
tradurre perché non ne ha mai scritte: i mesi, le valute e i formati che produce sono dati, e le
frasi stanno nelle schermate. Se un giorno servisse la posizione del simbolo di valuta o il
separatore decimale per lingua — la nota in `currency.ts` lo prevede — quello sì che entrerebbe
lì.

**Il threat model non cambia, e vale la pena dire perché.** La lingua è una preferenza locale in
`app_meta` accanto alla valuta e agli interruttori delle notifiche, non esce dal telefono, non
entra nel documento cifrato e non produce traffico verso il relay. Le due librerie sono JS puro
senza rete: nessun dizionario scaricato, nessuna telemetria, nessun permesso nuovo.

**Verificato, non assunto**

- **`i18next` entra davvero nel bundle Hermes**, e con lui i dizionari: `expo export --platform
android` completa, e il `.hbc` contiene «Sync stalled», «people and invite» e la chiave
  `you.alerts.reminderHint`. Il typecheck non avrebbe detto niente sul grafo dei moduli, e sono
  le prime due dipendenze nuove da parecchi step.
- **L'istanza vera risponde**, in un test che importa `index.ts` e non ne ricostruisce una copia:
  se `init` sollevasse — risorse malformate, un'opzione che questa versione non accetta più — il
  file non arriverebbe alla prima asserzione. Provati il cambio di lingua a caldo,
  l'interpolazione in entrambe le lingue e il ripiego sull'italiano per una lingua senza
  dizionario.
- **`escapeValue: false` serve, e c'è un test che lo dice.** L'escape di default esiste per non
  iniettare HTML in una pagina; qui pagina non ce n'è, e l'unico effetto sarebbe l'apostrofo
  tipografico di «dell'app» che diventa `&#39;` dentro un `<Text>`.
- **Le due librerie non hanno aggiunto vulnerabilità.** `npm audit` riporta le stesse di prima, e
  sono tutte nella toolchain Expo (`image-size`, `nanoid`, `undici`, `uuid` via `xcode`): niente
  che finisca nel bundle runtime.
- **Un profilo scritto dallo Step 29 si carica intero**, con la valuta al suo posto e la lingua
  assente. È la terza volta che questa promessa regge — `parseSettings` l'aveva mantenuta al 32 e
  al 33, il foglietto dei widget al 35.

**Ancora da verificare sul telefono**

Che `Intl` ci sia davvero su Hermes. Il codice è scritto per non dipenderne — senza, si parte in
italiano — ma quale dei due rami si percorre si vede solo sul dispositivo, con il telefono in
inglese e nessuna scelta salvata. È lo stesso genere di dubbio che lo Step 3 aveva su
`TextEncoder`, con la differenza che qui l'assenza non fa cadere niente.

**Verifica:** 1125 test verdi (588 core + 494 app + 43 relay, di cui 37 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato.

**Prossimo:** Step 38 — traduzione EN delle tre schermate più aperte (home spese, nuova spesa,
gruppi), e con esse i moduli condivisi che ci scrivono dentro, `describe.ts` per primo.

---

## 2026-08-12 — Step 36: il refresh in background, che senza sincronizzare non servirebbe a niente

L'ultimo step del filone widget, e l'unico del piano v5 marcato **opzionale**: i widget si
aggiornano da soli ogni mezz'ora, con l'app chiusa.

**La prima cosa scoperta è che l'idea ovvia non funziona.** «Refresh in background» suona come
«ogni tanto rifai i conti», e rifare i conti non cambierebbe **niente**: il documento locale non
si muove da solo, perché il motore di sync gira solo dentro l'app. Un ricalcolo periodico
darebbe gli stessi numeri di prima, con una sola eccezione — il primo del mese, quando il totale
deve ripartire da zero. L'unica cosa che rende vivo un widget di spese **condivise** è andare a
vedere se l'altro telefono ha scritto qualcosa: quindi il task headless non ricalcola, **fa un
giro di sync**. Monta il vault, parla col relay, applica quello che arriva e riscrive il
foglietto — cioè fa fuori dall'albero React quello che `VaultProvider` fa dentro.

**La seconda scoperta è che non serviva nessuna libreria nuova.** `expo-background-task` e
`expo-task-manager` non sono installati e sarebbero stati due moduli nativi in più; ma il
provider dei widget ha già la sua sveglia — `updatePeriodMillis` in `app.json`, minimo trenta
minuti — e quella sveglia entra dal `WIDGET_UPDATE` del task headless che esiste dallo Step 34.
Lo step è quindi **una riga di configurazione e un file di logica**. Ha però un prezzo che va
detto chiaro: `updatePeriodMillis` finisce nell'XML del provider, quindi **serve una build EAS
nuova**, la seconda del piano v5.

C'è anche un vantaggio che una libreria di background generica non avrebbe dato: la sveglia
esiste **solo se un widget è davvero sulla home**. Chi non li usa non paga nulla — né batteria,
né rete, né una riga di codice eseguita.

**`WIDGET_UPDATE` e non tutti gli eventi.** Android manda `WIDGET_ADDED` quando il widget viene
trascinato sulla home e `WIDGET_RESIZED` quando lo si ridimensiona: sono i due momenti in cui
qualcuno **sta guardando** il rettangolo, e infilarci davanti un giro di rete da qualche secondo
lo lascerebbe vuoto proprio allora. Quelli disegnano subito quello che c'è su disco. Il giro di
rete sta sulla sveglia periodica, che arriva quando non guarda nessuno.

**Tre guardie, e ognuna chiude un modo di fare danno:**

- **Se l'app è in primo piano non si fa niente.** Con l'app aperta c'è già un `SyncEngine` su
  quel vault, e un secondo motore vuol dire due scritture concorrenti sulla stessa
  `y_updates_<id>`. Yjs regge la duplicazione — gli update sono commutativi e idempotenti — ma la
  **compattazione** no: cancella la tabella e la riscrive, e un update infilato nel mezzo
  dall'altro motore si perderebbe. E comunque sarebbe inutile: ad app aperta ci pensa
  `WidgetPublisher`.
- **Venticinque minuti di attesa fra un giro e l'altro**, contro i trenta della sveglia. Il
  motivo principale è banale e frequente: **due widget sulla home sono due risvegli**, perché
  Android chiama un provider per volta. Senza la soglia sarebbero due giri di rete identici a
  distanza di un istante. I cinque minuti di scarto ci sono perché Android non promette la
  puntualità, e una soglia uguale al periodo scarterebbe il giro arrivato in anticipo.
- **Il task non semina niente.** `VaultProvider` chiama `seedDefaults` quando monta un gruppo;
  qui no, e la differenza è di sostanza: seminare le categorie è una **scrittura nel documento
  condiviso**, e un telefono che scrive nel vault mentre nessuno lo usa è esattamente ciò che un
  refresh non deve fare. Qui si legge, si riceve, e si scrive solo su `app_meta`, che è locale.

**Una cosa che lo step regala senza prometterla:** `engine.start()` mette in coda il delta fra il
documento e l'ultima pubblicazione riuscita. Se l'app era stata chiusa senza rete, le spese
registrate allora **partono da qui**, senza aspettare che qualcuno la riapra. Il nome dello step
dice «refresh», ma metà del valore è nell'altra direzione.

**`composeSnapshot` è nato da qui.** Fino al 35 il conto stava nel `useMemo` di
`WidgetPublisher`, ed era il posto giusto con un chiamante solo. Adesso ce ne sono due, e sono i
più lontani possibile fra loro: uno dentro React con gli hook sul vault montato, l'altro in un
task headless che il vault se lo monta da sé. Due copie che devono dare lo stesso numero, di cui
una impossibile da guardare mentre gira, sono la duplicazione che diverge in silenzio. Stessa
ragione per `CURRENT_GROUP_KEY`, uscita da `GroupsProvider`: il task deve rispondere **con la
stessa costante** alla domanda «quale gruppo mostrare», o il widget racconterebbe un gruppo
diverso da quello che si apre toccandolo.

**Il threat model è stato aggiornato, con tre voci e non una.** Il refresh decifra il vault
mentre nessuno guarda — non è un permesso nuovo, su Android la chiave è già leggibile dal
processo in qualunque momento, ma sposta il **quando**. Ne segue una conseguenza da non
scoprire più tardi: **un lock con biometria e il refresh in background si escludono a vicenda**,
perché in background non c'è nessuno che possa autenticarsi. E c'è la voce che mancava dallo
Step 34: i widget mostrano importi sulla home, cioè fuori dall'app, e chi non lo vuole ha un
rimedio completo — non aggiungerli. Sull'analisi del traffico la nota cambia di segno: più
richieste al relay, ma un ritmo regolare dice **meno** di prima su quando si usa l'app.

**`packages/core` non è stato toccato**, per il sesto step di fila — e stavolta è il fatto più
significativo dei sei: il task headless usa `SyncEngine`, `VaultStore` e `SqliteYPersistence`
esattamente come li usa l'app, senza una riga di adattamento. È la ricompensa della regola dello
Step 0, che il core non dipende dalla piattaforma né da React.

**Verifica:** 1088 test verdi (588 core + 457 app + 43 relay, di cui 13 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato, e `expo config --type
introspect` conferma `updatePeriodMillis: 1800000` su entrambi i provider.

**Serve una build EAS nuova, ed è l'unico modo di provare questo step.** Fino a quando non è
installata, sul telefono non cambia niente: la build attuale ha `updatePeriodMillis: 0` e la
sveglia non suona. Dopo l'installazione, nell'ordine: aggiungere un widget, registrare una spesa
**sull'altro telefono**, e lasciar passare mezz'ora senza toccare il primo — il widget deve
cambiare da solo. Poi il caso che vale il doppio: chiudere l'app in aereo dopo aver registrato
una spesa, riaccendere la rete e **non riaprire l'app** — quella spesa deve arrivare all'altro
telefono lo stesso. E la guardia: con l'app aperta davanti, il giro periodico non deve fare
niente.

**Prossimo:** il filone widget è chiuso. Restano lo Step 37 (infrastruttura i18n), il 38–39
(traduzione EN) e il 40, la verifica end-to-end su telefono reale che chiude il piano v5.

---

## 2026-08-12 — Step 35: il totale del mese, e il conto che lo Step 34 aveva pagato in anticipo

Il secondo dei due widget, e il piano v5 chiude il filone dei widget. Il totale speso nel mese
dal gruppo aperto, sulla home di Android, accanto al saldo.

**Lo step è piccolo, e questa è la notizia.** Lo Step 34 aveva scritto tre cose prevedendo
questa sessione — un campo per widget nel foglietto, la lettura difensiva campo per campo, il
rettangolo con gruppo/cifra/didascalia — e tutte e tre hanno retto: `month` è entrato accanto a
`balance` **senza toccare una riga del saldo**, e un telefono rimasto al foglietto dello Step 34
continua a disegnare il saldo con il totale assente, invece del foglietto intero illeggibile.
C'è il test che lo dice. È la stessa promessa che `parseSettings` aveva mantenuto quando lo
Step 33 ha aggiunto il terzo interruttore.

**La didascalia nomina il mese, e non dice «questo mese».** È la decisione dello step, e vale
più del numero che le sta sopra: senza refresh in background il widget resta fermo all'ultima
apertura dell'app, quindi il primo di settembre «speso questo mese» sopra il totale di agosto
sarebbe una **frase falsa scritta da noi**. «Speso in agosto» resta vero anche vecchio di un
giorno — dice qualcosa di meno, non qualcosa di sbagliato. È la stessa regola dei due testi del
promemoria (Step 31) e di «Metà e metà»: si sceglie la frase che il tempo non può smentire. E
`in` invece di `a` regge tutti e dodici i mesi senza dover scegliere fra «a gennaio» e «ad
agosto», che è un modo di sbagliare che si presenterebbe una volta l'anno.

**Il totale è quello del gruppo, non la mia quota.** È il numero grande della card in cima alle
spese, contato sulle stesse spese e con lo stesso taglio del mese: due posti che mostrano lo
stesso importo devono mostrare lo stesso importo, e la quota personale ha già il suo posto — il
saldo, cioè l'altro widget.

**Il totale del mese non è rosso, e non è una dimenticanza.** `colors.expense` è il colore di
**un'uscita**; tingere di rosso la somma di tutte le spese del mese la trasformerebbe in un
allarme. A dire se si sta spendendo troppo c'è il budget, che ha una soglia, un colore e una
notifica sua (Step 32). Questo è un numero, e un numero non giudica.

**`changedWidgets` ha sostituito `sameSnapshot`, ed è la stessa domanda fatta meglio.** Con un
widget solo bastava sapere **se** qualcosa era cambiato; con due serve sapere **quali**, perché
i due numeri cambiano in momenti diversi: una spesa che pago io e tengo per me sposta il totale
del mese e non il saldo, un pareggio sposta il saldo e non il totale. Senza la distinzione, ogni
spesa manderebbe due giri di `RemoteViews` al launcher invece di uno — cioè il doppio del costo
per metà dell'informazione.

**Un `WidgetPublisher` solo, e non uno per widget.** I due numeri dipendono dallo stesso
documento e cambiano nello stesso istante: due componenti avrebbero letto e riscritto lo stesso
`app_meta` a turno, con le due letture accavallate che `chain` esiste per evitare. Distinguere
chi è cambiato è un lavoro da fare **dopo** aver calcolato entrambi.

**Il rettangolo è uno solo per due widget** (`WidgetCard.tsx`), e la sola differenza fra i due è
il colore della cifra, che chi disegna passa come funzione del tema. Due copie del file avrebbero
fatto divergere il secondo widget dal primo alla prima ritoccata. `BalanceWidget.tsx` è diventato
`views.tsx`: venti righe che dicono soltanto quale numero va di che colore.

**`packages/core` non è stato toccato**, per il quinto step di fila.

**Verifica:** 1075 test verdi (588 core + 444 app + 43 relay, di cui 7 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato, con «Speso in» e `MonthTotal`
verificati dentro il bundle.

**Sul telefono, e stavolta c'è una prova che il 34 non poteva fare.** Nell'ordine: aggiungere
«JuTrack — speso questo mese» e vedere se si popola; registrare una spesa e guardare **quale dei
due widget si aggiorna** — una spesa tutta mia deve muovere il totale e lasciare fermo il saldo;
riavviare il telefono, che è il caso del task headless con due nomi da distinguere invece di
uno; e i due widget affiancati sulla home, che devono leggersi come due cose diverse e non come
lo stesso rettangolo ripetuto. La prova che chiede pazienza è il **primo del mese**: il totale
deve ripartire da zero alla prima apertura dell'app, e fino ad allora la didascalia deve dire il
mese giusto per il numero che mostra.

**Prossimo:** il piano v5 arriva allo Step 36, dichiarato **opzionale**: il refresh in background
via `WorkManager`. Va deciso dopo l'uso reale dei due widget, non prima — e se il refresh ad
apertura app basta, si salta e si va allo Step 37, l'infrastruttura i18n.

---

## 2026-08-12 — Step 34: il widget del saldo, che si disegna senza l'app

Il primo dei due widget dichiarati in `app.json` allo Step 30: il saldo del gruppo aperto,
sulla schermata home di Android. Ancora tutto JS sopra quella build, e senza chiederne
un'altra.

**Il fatto che decide tutto lo step è che il widget non lo disegna l'app.** Lo disegna il
sistema, quando lo chiede lui: appena trascinato sulla home, dopo un riavvio del telefono, a
ogni ridimensionamento — cioè quasi sempre ad app chiusa. Chi risponde è un **task headless**,
il bundle JS senza l'app dentro: niente provider, nessun `Y.Doc` montato, nessuna chiave
presa dal portachiavi. Rimontargli il vault sotto vorrebbe dire aprire SecureStore e
ricostruire il documento per scrivere due righe di testo su un rettangolo, ogni volta che
qualcuno accende il telefono.

Quindi il disegno **non calcola: legge**. L'app calcola quando ha già tutto in mano —
`WidgetPublisher` accanto allo `Stack`, dove stanno i due watcher delle notifiche — e lascia
un foglietto in `app_meta` (`widget_snapshot`); il task headless lo raccoglie e lo disegna. È
la stessa divisione dei tre step di notifica (`reminder.ts`, `budget.ts` e `sync.ts` decidono,
il modulo nativo esegue) applicata a un caso in cui i due lati **non sono nemmeno vivi nello
stesso momento**.

**Nel foglietto ci sono frasi già fatte, non numeri**, e non è pigrizia. Formattare un importo
vuole il simbolo della valuta scelta nel profilo (Step 29); dire chi deve a chi vuole i nomi
dei membri. Sono le due cose che il task headless non ha, ed è precisamente ciò che rende la
scelta obbligata: salvare `cents` e ricostruire la frase di là significherebbe rimontare metà
app per riscoprire quello che l'app sapeva già un istante prima.

**`myBalance` è nato da qui, ed è l'unico refactoring dello step.** La card in cima alle spese
scrive «Juju ti deve 25,00 €» in una riga sola; un widget ha un numero grande e una didascalia
sotto, quindi l'importo deve uscire dalla frase. Due frasi, gli stessi fatti: chi deve a chi si
decide una volta in `myBalance`, e `describeMyBalance` sceglie soltanto le parole. Senza, la
seconda sarebbe stata una copia della prima con le parole spostate — cioè un secondo posto in
cui sbagliare il verso di un debito.

**Da solo in un gruppo non si è «pari» con nessuno.** La card sulla home nasconde il saldo
quando il membro è uno solo; il widget non può nascondere niente, perché quella è tutta la sua
superficie, e «Siete pari» parlerebbe di gente che non c'è. Chi è da solo legge «Solo tu in
questo gruppo», e il widget che gli serve è il totale del mese, cioè lo Step 35.

**Non c'è una data di aggiornamento, ed è una decisione, non una dimenticanza.** Senza refresh
in background il widget resta fermo finché l'app non si riapre, e datarlo sarebbe l'unico modo
onesto di dirlo — ma un campo che cambia a ogni scrittura e che nessuno legge è peso morto, e
il problema che risolverebbe è quello che lo **Step 36** esiste per risolvere davvero. Il piano
lo tiene esplicitamente in sospeso: se dopo l'uso reale il widget si dimostra troppo vecchio,
la risposta è aggiornarlo, non datarlo.

**Tre trappole trovate leggendo, non provando.** Nessuna delle tre dà un errore di
compilazione, e tutte e tre si sarebbero viste solo sul telefono:

- **Il task va registrato all'ingresso del bundle**, non in un componente. Quando il sistema
  chiede un widget ad app chiusa, React Native esegue il bundle e cerca subito un task headless
  già registrato: registrarlo dentro l'albero React vorrebbe dire registrarlo solo dopo che
  l'app è partita, cioè mai nel caso che conta. È l'unica ragione per cui `apps/mobile/index.js`
  esiste al posto di `main: "expo-router/entry"`. **E non serve una build EAS nuova**: l'app
  nativa non nomina `index.js`, apre l'entry virtuale di Metro che risolve `main` al momento del
  bundle. Se così non fosse, questo step avrebbe smentito lo Step 30.
- **Il database va aperto con una connessione tutta sua.** Il task può partire mentre l'app è
  aperta e condividere con lei il runtime JS, ed expo-sqlite senza `useNewConnection` **riusa la
  connessione nativa già aperta** per lo stesso file: la `close()` del task l'avrebbe chiusa
  sotto i piedi a chi stava registrando una spesa. `ExpoSqliteDatabase.open` ha imparato
  `isolated`, e lo usa solo il task.
- **«Azzera questo telefono» non azzerava la home.** `wipeDevice` cancella `app_meta`, foglietto
  compreso, ma nessuno ridisegna il widget: il saldo dell'ultimo gruppo sarebbe rimasto scritto
  sullo schermo di un telefono che di quel gruppo non sa più niente, fino al riavvio successivo.
  `clearWidgets()` in `useWipeDevice` chiude il buco. Lo Step 22 aveva stabilito che azzerare
  azzera davvero, e da oggi la home fa parte di ciò che si vede.

**Il freno non è nel calcolo, è nella scrittura.** Il saldo si rifà a ogni modifica del
documento — lo stesso `computeBalances` su tutta la storia che fa la home — e adesso si paga
anche quando la home non è aperta. È accettato: quello che non si fa è **scrivere**.
`publishSnapshot` confronta il foglietto nuovo con quello su disco e quasi sempre non fa
niente, perché il documento cambia a ogni spesa ma il saldo mostrato molto più di rado — una
spesa che pago io e dividiamo a metà lo sposta, una che pago per me solo no. Senza quel
confronto, ogni spesa costerebbe una scrittura su `app_meta` e un giro di `RemoteViews` verso
il launcher, che è il modo in cui un widget diventa una voce nella classifica dei consumi.

**Due palette e non il tema dell'app.** `WidgetRepresentation` accetta `{ light, dark }` e
Android sceglie **nel momento in cui disegna**: un widget che portasse con sé il tema letto
dall'app resterebbe chiaro sulla home scura di chi ha cambiato tema ad app chiusa. Del resto
dell'app non si riusa niente — `FlexWidget` e `TextWidget` producono `RemoteViews`, non viste,
e i `<Text>` della card non sono riusabili qui nemmeno volendo — ma i **token** sì, e la
palette è diventata verificabile: c'è un test nuovo che pretende `#RRGGBB` su ogni colore,
perché il tipo della libreria è `` `#${string}` `` e il cast in `BalanceWidget.tsx` si fida di
quella riga.

**`MonthTotal` risponde ma non disegna**, e va detto: il provider è nel manifest dallo Step 30
— andava dichiarato lì o sarebbe servita una seconda build — mentre il contenuto è lo Step 35.
Chi lo aggiunge oggi trova il rettangolo vuoto del launcher. È meglio di un widget che mostra
il saldo sotto l'etichetta «speso questo mese»: un numero giusto al posto sbagliato.

**`packages/core` non è stato toccato**, per il quarto step di fila.

**Verifica:** 1068 test verdi (588 core + 437 app + 43 relay, di cui 22 nuovi), typecheck, lint
e `format:check` puliti, `expo export --platform android` completato — e il bundle esportato
contiene davvero `registerWidgetTask`, che è la prova che il cambio di `main` ha preso: quel
codice non è raggiungibile da nessun altro punto dell'app.

**Sul telefono resta la prova vera, e questo step non è verificabile altrimenti.** Nell'ordine:
aggiungere il widget dalla tendina dei widget e vedere se si popola invece di restare vuoto;
registrare una spesa che sposta il saldo e guardare la home senza riaprire l'app; **riavviare
il telefono**, che è il caso per cui esiste il task headless; cambiare gruppo dalla pill e
controllare che il widget segua; azzerare il telefono e verificare che il saldo sparisca dalla
home. Da controllare anche il tema scuro, che è disegnato da un ramo di codice che l'app non
percorre mai.

**Prossimo:** Step 35 — il widget «Totale speso nel mese», che entra nello stesso foglietto
accanto al saldo.

---

## 2026-08-12 — Step 33: la sincronizzazione ferma, che è una condizione su una scadenza

Un terzo interruttore in Tu, e una notifica che arriva quando le spese non raggiungono più
gli altri telefoni. Ultimo dei tre contenuti di notifica del piano v5, ancora tutto JS sopra
la build dello Step 30.

**Il piano aveva lasciato una domanda aperta, e la risposta è «tutte e due».** Lo Step 31 non
poteva essere una condizione ed è diventato una scadenza; lo Step 32 era una condizione e
basta. Qui il piano diceva: «bloccato da tempo» ha dentro una durata, quindi è una condizione
**su una scadenza** — e conviene rileggere entrambe le sezioni prima di scriverlo. È
esattamente così che è venuto: si guarda come il budget, ma quello che si guarda è **da
quanto dura**, e la durata da misurare è più lunga di una sessione dell'app. Ne segue la
scelta che regge tutto il resto: i segni stanno su disco (`sync_alerts` in `app_meta`), non in
memoria, perché un contatore che riparte a ogni apertura non arriverebbe mai a
ventiquattr'ore proprio per chi apre l'app tutti i giorni.

**Due guai e non tre, benché le fasi in errore siano tre.** `SyncState` ne ha tre che non
vanno bene, e si dividono in due per il momento in cui vale la pena parlare:

- **`blocked` è fermo.** Il relay rifiuta la chiave (`RelayError.fatal`, cioè 401/403), il
  motore ha **smesso** di ritentare, e nessuna attesa cambierà l'esito. Aspettare un giorno
  per dirlo vuol dire regalare un giorno di divergenza: si avvisa subito.
- **`offline` ed `error` sono in ritardo.** Il motore riprova da solo, e nove volte su dieci
  passa da sé. Un avviso a ogni singhiozzo è il modo più rapido di far spegnere
  l'interruttore: si aspettano ventiquattr'ore.

**`offline` conta come `error`, ed è la decisione discutibile dello step.** Lo Step 17 aveva
stabilito che offline **non** è un errore del relay, e la schermata infatti lo dice senza
allarme. Ma quello che questo avviso serve a evitare — credere che i due telefoni siano
allineati quando non lo sono — succede identico nei due casi, e dopo un giorno intero «sono
in aereo» non è più una spiegazione. Cambia il rimedio, non il fatto: infatti a cambiare è il
testo, non la regola. Tre testi per due livelli — la connessione è una cosa dell'utente, il
relay che non risponde è una cosa che passa da sé, la chiave rifiutata è l'unica che chiede
di fare qualcosa (un invito nuovo).

**`idle` e `syncing` non dicono niente, e il codice le tratta come tali.** Sono il prima e il
durante di ogni giro, e l'app ci passa a ogni avvio: trattarle come «tutto a posto»
azzererebbe il conto a ogni apertura. È la riga più facile da scrivere male in tutto lo step,
perché sbagliata non rompe niente — semplicemente l'avviso non arriva mai, e non c'è modo di
accorgersene se non aspettando invano.

**Il watcher si iscrive alla fase, non allo stato intero.** `SyncState` porta con sé `at` e
`retryAt`, che cambiano a ogni giro di poll: dipendere dall'oggetto vorrebbe dire una lettura
di `app_meta` ogni due secondi mentre tutto funziona. La fase invece cambia solo quando
succede qualcosa — e succede abbastanza, perché ogni ciclo passa da `syncing` prima di
ricadere in `error` o `offline`, quindi la scadenza viene ricontrollata a ogni tentativo anche
restando fermi sulla stessa schermata.

**Le regole contro il ripetersi sono le stesse dello Step 32, riscritte su un altro asse.** Il
livello **sale e non scende**: un episodio che comincia in `offline` e finisce in `blocked`
merita il secondo avviso, perché è un fatto diverso con un rimedio diverso, ma un `blocked`
che al riavvio ricade in `error` no — è lo stesso guaio visto da un'altra angolazione, e
ridirlo insegna a non leggere. **Un avviso per episodio**, e l'episodio finisce al primo
`synced`: solo allora il segno sparisce e il prossimo guaio può parlare di nuovo. **I segni
si aggiornano anche a interruttore spento**, con lo stesso prezzo accettato del 32: chi
accende l'interruttore mentre il guaio è già in corso non riceve niente per quel guaio lì, e
lo legge dalla schermata invece che dalla tendina. **Si scrive prima e si avvisa dopo**, per
la solita ragione: un avviso perso si nota una volta, uno ripetuto fa spegnere l'interruttore.

**La potatura c'è anche qui, su un asse diverso.** I budget si potano al mese in corso perché
un mese finito non può più essere sforato; i segni del sync si potano ai gruppi che esistono
ancora, perché un gruppo da cui si è usciti non può più sincronizzarsi. Senza, uscire da un
gruppo mentre il relay era giù lascerebbe una riga per sempre dentro una tabella che nessuno
guarda.

**Il nome del gruppo entra nel testo, a differenza dell'avviso di budget.** Quello si legge
mentre lo si è appena provocato; questo si legge ore dopo, e con più gruppi sul telefono «non
si sincronizza» senza dire _cosa_ obbliga ad aprire l'app per scoprirlo. Il titolo del caso
fermo è la stessa frase del pallino in Tu — «Sincronizzazione fermata», da `describe.ts` —
perché chi l'ha già vista lì deve riconoscerla, non chiedersi se sono due guasti diversi.

**Il gestore di primo piano vale anche per questo avviso**, e per la ragione opposta a quella
che si direbbe: lo stato del sync **si vede già** in Tu e in fondo alla lista spese, ma solo
lì, e chi ha il sync rotto potrebbe non passarci per giorni. È anche perché `SyncWatcher` sta
accanto allo `Stack` e non dentro una schermata: un guasto che si vede solo dove si va a
cercarlo non ha bisogno di una notifica.

**Tre righe di refactoring, non di più.** `AlertContent` esce da `budget.ts` e va in
`content.ts`: è in comune fra due avvisi che non hanno in comune nient'altro, e lasciarlo lì
avrebbe costretto `sync.ts` a importarlo da un modulo con cui non ha niente da spartire. E
l'invio immediato — canale, `ChannelAwareTriggerInput`, `data.kind` — diventa un `notifyNow`
privato con due entrate nominate sopra, invece di due copie della stessa funzione.
`setReminder` era già diventata `set(kind, on)` allo Step 32 apposta, e infatti non è stata
toccata; `parseSettings` era già scritta per leggere le chiavi una per una, e infatti la terza
è entrata senza toccare le altre due.

**`packages/core` non è stato toccato**, per il terzo step di fila. `SyncState` e `describe.ts`
c'erano già e dicono **cosa** sta succedendo; qui si decide una cosa sola, che nessuno dei due
può sapere: da quanto sta succedendo, e se è già stato detto.

**Verifica:** 1046 test verdi (588 core + 415 app + 43 relay, di cui 30 nuovi), typecheck,
lint e `format:check` puliti, `expo export --platform android` completato.

**Sul telefono, un caso è facile e l'altro no.** Il fermo si prova in due minuti: si esce da
un gruppo con la rigenerazione della chiave da un telefono e si guarda l'altro, che deve
ricevere «Sincronizzazione fermata» quasi subito e in primo piano. Il ritardo invece richiede
ventiquattr'ore vere — oppure la modalità aereo tenuta accesa e l'app riaperta il giorno
dopo — ed è il caso in cui l'avviso deve dire «da un giorno» e non ripetersi il giorno
successivo. Da controllare anche che il canale «Sincronizzazione» esista nelle impostazioni di
sistema separato dagli altri due.

**Prossimo:** Step 34 — il widget «Saldo del gruppo aperto», il primo dei due già dichiarati
in `app.json` allo Step 30.

---

## 2026-08-12 — Step 32: l'avviso di budget, che è una condizione e non una scadenza

Un secondo interruttore in Tu, e una notifica che arriva quando una categoria arriva all'80%
del limite del mese o lo supera. Secondo dei tre contenuti di notifica del piano v5, ancora
tutto JS sopra la build dello Step 30.

**È l'esatto opposto dello Step 31, ed è la cosa più interessante dello step.** Il
promemoria non poteva essere una condizione — nessuno la rilegge quando la notifica suona —
e per questo è diventato una scadenza. Qui è il contrario: «hai superato il budget» **è** una
condizione, e per di più una condizione che cambia solo quando cambia il documento. Non c'è
nessuna data da calcolare. Si guarda il documento, e se è appena successo si avvisa subito,
con un `ChannelAwareTriggerInput` che consegna nell'istante.

**Ne segue il limite onesto della cosa, e sta scritto sotto l'interruttore.** L'avviso lo
produce l'app guardando il documento, quindi **l'app deve essere aperta**. Una spesa
registrata qui avvisa subito; una registrata sull'altro telefono avvisa quando arriva col
sync, cioè alla prima apertura. Un avviso in differita resta vero — il limite è superato
adesso — e l'alternativa sarebbe un processo in background, che è lo Step 36 e resta
opzionale. Quello che non si fa è lasciarlo scoprire: la riga sotto i due interruttori dice
che gli avvisi sui budget riguardano il gruppo aperto e arrivano mentre l'app è in uso.

**Il watcher si iscrive al documento, non a un gesto**, ed è la differenza che si vede nel
codice. `useExpenseRegistered` dello Step 31 va **chiamata** dal form, perché il promemoria
dipende da un'azione. Un budget invece dipende dal documento: sfonda tanto per una spesa
scritta qui quanto per una arrivata col sync, e le due cose non hanno un punto di chiamata in
comune. `BudgetWatcher` legge la versione del documento e le prende entrambe, senza che
nessuna schermata debba ricordarsi di dire niente. Sta accanto allo `Stack` in `_layout.tsx`
e non dentro i Grafici: lì i budget si controllerebbero solo aprendo la scheda dove sono già
disegnati, cioè proprio dove un avviso non serve.

**Senza il gestore di primo piano lo step sarebbe invisibile, e ci si accorgerebbe tardi.**
Di default `expo-notifications` non mostra nulla mentre l'app è aperta — ed è esattamente lì
che questo avviso nasce, per costruzione. `foreground.ts` installa un gestore unico che
decide **per tipo**: l'avviso di budget in primo piano si mostra, perché dice qualcosa che la
schermata aperta non mostra; il promemoria dello Step 31 no, perché inviterebbe ad aprire
un'app già aperta. Quello che non si riconosce non si mostra, che è il comportamento che
`expo-notifications` avrebbe senza gestore. Mai un suono in primo piano: il suono serve a
farsi notare da chi non sta guardando lo schermo, e in primo piano quel caso non esiste.

**Il problema vero è non ripetersi**, e si risolve con dei segni in `app_meta`. Un budget
superato resta superato per tutto il mese: senza memoria, ogni modifica del documento
rifarebbe lo stesso avviso. `budget_alerts` tiene il livello più alto raggiunto per ogni
`vaultId|mese|categoria`, e tre regole lo governano, ognuna contro un modo diverso di
sbagliare:

- **Il livello sale e non scende.** Cancellare una spesa riporta una categoria da `over` a
  `near`, e senza questa regola la spesa dopo riavviserebbe: un budget che oscilla intorno
  all'80% suonerebbe a ogni scontrino, che è il modo più rapido di far spegnere
  l'interruttore.
- **La prima volta si guarda e basta.** Un gruppo mai visto in questo mese — appena creato,
  appena aperto, o semplicemente il primo giorno del mese nuovo — registra lo stato di adesso
  senza dire niente. Un avviso deve raccontare qualcosa di appena successo, e «questo budget
  era già sforato quando ho cominciato a guardare» non lo è. È la ragione per cui i segni
  hanno due campi e non uno: senza `watched`, «tutto sotto controllo» e «non ho mai
  guardato» sarebbero lo stesso stato, cioè un elenco di livelli vuoto.
- **I segni si aggiornano anche a interruttore spento.** Sembra sprecato e non lo è: se si
  smettesse di guardare mentre è spento, riaccenderlo produrrebbe una raffica di avvisi su
  sforamenti avvenuti mentre si era deciso di non essere disturbati. Il watcher tiene il
  conto sempre; a decidere se diventa una notifica è la lettura delle impostazioni, fatta
  **dopo**.

**Si scrive prima e si avvisa dopo.** L'ordine inverso — notifica riuscita, scrittura
fallita — rifarebbe lo stesso avviso al giro successivo, e poi ancora. Un avviso perso si
nota una volta; uno ripetuto fa spegnere l'interruttore.

**I segni si potano al mese in corso**, o crescerebbero di una riga per categoria per mese
per sempre dentro una tabella che nessuno guarda. Si può fare perché un mese finito non può
più essere sforato: la spesa porta la data del giorno in cui viene registrata, e il form non
ha un selettore di date — la scelta del passo 7 del redesign, che qui torna utile. Si pota
per mese e **non** per gruppo: i gruppi aperti sono più d'uno e ciascuno tiene il proprio
conto nello stesso mese, con lo stesso `first` silenzioso alla prima apertura.

**Anche l'80%, non solo il superamento**, benché il piano dicesse «soglia superata». La
soglia `near` esiste già in `insights/budget.ts` e il suo commento è la ragione:
«avvisare al 95% sarebbe inutile — a quel punto il mese è deciso». Un avviso che arriva solo
a limite sfondato arriva quando non si può più fare niente. La soglia si legge dal core anche
nella riga di Tu, invece di riscrivere `80%` a mano: due numeri da tenere allineati sono due
numeri che prima o poi divergono.

**Un avviso solo anche quando i budget sono tre.** Aprendo l'app dopo un sync possono essere
passate di livello più categorie insieme, e tre notifiche identiche in fila sono il modo in
cui si smette di leggerle. Il caso singolo però dice i numeri — `Spesa: 214,00 € su 200,00 €
questo mese, 14,00 € in più` — perché sapere _quanto_ si è sforato è ciò che distingue un
avviso da un rimprovero. E il titolo del caso multiplo dice «superati» solo se lo sono tutti:
con uno soltanto vicino sarebbe una frase falsa accanto a un numero, cioè la cosa che il
progetto rifiuta da «Metà e metà».

**Il simbolo viene dal profilo**, non dall'euro scritto a mano: `budgetContent` lo riceve come
ultimo parametro con default `'€'`, esattamente come `describeBudget` e gli altri moduli puri
dello Step 29. Una notifica che dicesse `200,00 €` a chi ha scelto il franco sarebbe un
numero giusto accanto a una parola falsa.

**Canale `budget` separato, importanza `DEFAULT`.** Separato perché chi trova insistente il
promemoria deve poterlo zittire dalle impostazioni di Android senza perdere l'avviso che sta
sforando un limite: due canali sono due interruttori di sistema. `DEFAULT` e non `LOW` come
il promemoria, perché quello è un invito che ci si è chiesti, questo è un numero appena
cambiato su cui si può ancora fare qualcosa nel resto del mese.

**Un interruttore in più, non una schermata in più.** `NotificationSettings` guadagna
`budget`, `parseSettings` lo legge per conto suo — un telefono con le impostazioni di ieri lo
trova spento senza che il resto cada — e `setReminder` diventa `set(kind, on)`, che è la
firma che lo Step 33 userà senza toccarla. Il messaggio di permesso negato resta **uno solo**:
il permesso è dell'app, non della singola voce, e ripeterlo accanto a ogni riga farebbe
sembrare che i rimedi siano tre.

**`packages/core` non è stato toccato.** `budgetStatuses` e `stateOf` c'erano già e decidono
loro se un limite è vicino o superato. Qui si decide una cosa sola, che il core non può
sapere: se quello stato **è nuovo**.

**Verifica:** 1016 test verdi (588 core + 385 app + 43 relay, di cui 30 nuovi), typecheck,
lint e `format:check` puliti, `expo export --platform android` completato.

**Sul telefono si vede tutto, e in fretta.** A differenza dello Step 31 non c'è niente da
aspettare tre giorni: basta un budget basso su una categoria e una spesa che lo supera, e
l'avviso deve comparire mentre si è ancora nell'app. Da controllare in quest'ordine: la
notifica compare in primo piano (è il pezzo che senza il gestore non si vedrebbe), non si
ripete registrando una seconda spesa nella stessa categoria, e il canale «Budget del mese»
esiste nelle impostazioni di sistema separato da «Promemoria spese».

**Prossimo:** Step 33 — la notifica di sync bloccato, che riusa lo stato già derivato in
`features/sync/describe.ts`.

---

## 2026-08-12 — Step 31: il promemoria, che è una scadenza e non una condizione

Un interruttore in Tu, e una notifica locale che arriva se passano tre giorni senza
registrare una spesa. È il primo dei tre contenuti di notifica del piano v5, ed è tutto JS
sopra la build dello Step 30.

**Il problema vero non è mandare la notifica, è che la notifica si programma prima.** Una
notifica locale si mette in calendario adesso e scatta da sola: nessuno la rilegge quando
suona, e non c'è un processo in background che possa decidere in quel momento se ha ancora
senso — quello sarebbe lo Step 36, dichiarato opzionale. Quindi «avvisami se non registro
una spesa da tre giorni» **non si può scrivere come una condizione**: va scritto come una
**data di scadenza**, calcolata adesso e rifatta ogni volta che succede qualcosa che l'app
vede. Le occasioni sono tre e sono tutte quelle che esistono: l'app si apre, una spesa viene
registrata, l'interruttore viene toccato.

Ne segue una proprietà che vale la pena nominare: **il testo dell'avviso è vero per
costruzione**. Se una spesa fosse stata registrata nel frattempo, quella notifica sarebbe
stata disdetta e rifatta con una scadenza nuova. Non c'è nessun caso in cui la tendina dice
«non registri una spesa da tre giorni» a chi ne ha appena registrata una.

**Senza il riarmo all'avvio il promemoria scatterebbe una volta sola**, e questa è la parte
che si dimentica. Una notifica programmata **sparisce quando suona**: se nessuno la rifà,
chi non registra spese viene avvisato il primo giorno e mai più. `ReminderScheduler` sta
sotto `ProfileGate`, non disegna niente e riarma a ogni apertura.

**Aprire l'app non è registrare una spesa.** Il riarmo rilegge il timestamp salvato invece
di scrivere «adesso», ed è la differenza fra un promemoria che funziona e uno che non
arriva mai: se bastasse aprire l'app a spostare la scadenza, l'avviso non raggiungerebbe
**esattamente chi l'ha chiesto** — quello che l'app la apre, guarda, e non annota niente.

**L'ultima spesa è un fatto del telefono, non del vault.** Sta in `app_meta` e non si
ricava dalle spese, perché di documenti Yjs ne è montato uno per volta: trovare la più
recente fra tutti i gruppi vorrebbe dire aprire ogni vault, N chiavi dal portachiavi e il
motore di sync da riassegnare — la stessa ragione per cui il sottotitolo ricco delle righe
vale solo per il gruppo aperto. E **conta chi scrive, non chi riceve**: una spesa che arriva
dall'altro telefono non sposta la scadenza, perché il promemoria riguarda l'abitudine di
annotare. Il prezzo, accettato: in una coppia dove registra uno solo, l'avviso arriva anche
all'altro — ma a quello dei due che non registra è **vero**.

**Le notifiche si disdicono per tipo, non per identificatore.** Ogni promemoria porta
`data: { kind: 'reminder' }`, e riprogrammare vuol dire cancellare quelli con
quell'etichetta. `cancelAllScheduledNotificationsAsync` sarebbe una riga sola e sarebbe già
sbagliata allo Step 32, che cancellerebbe l'avviso di budget insieme al proprio. Un
identificatore salvato in `app_meta` sarebbe un secondo stato da tenere allineato, e uno
rimasto indietro — app reinstallata, notifica già scattata — lascerebbe promemoria fantasma
impossibili da disdire.

**Il permesso si chiede accendendo l'interruttore, mai all'avvio.** Su Android 13 il dialogo
di sistema si rifiuta **una volta sola**: spenderlo al boot, quando nessuno ha ancora chiesto
di essere avvisato di niente, vuol dire non poterlo più chiedere quando servirà. È la stessa
regola per cui il passaggio 15 della diagnostica **legge** il permesso e non lo chiede.

**Qui la scrittura non è ottimistica**, al contrario del riordino della dashboard: prima si
chiede il permesso, e solo se arriva si salva e si accende. Un interruttore che scatta e
torna giù è brutto; un interruttore acceso che non produce mai una notifica è peggio, perché
non c'è modo di accorgersene se non aspettando invano.

**Un permesso revocato non spegne l'interruttore di nascosto.** Chi lo toglie dalle
impostazioni di Android trova la voce ancora accesa e una riga che dice che il sistema la
sta bloccando. Spegnerla d'ufficio farebbe sparire una scelta che qualcuno aveva fatto,
senza dire perché.

**Canale `LOW`, non `DEFAULT`:** compare nella barra di stato e nella tendina, e **non
suona**. `MIN` sarebbe l'eccesso opposto — resterebbe ripiegato in fondo alla tendina, cioè
invisibile proprio a chi ha acceso l'interruttore per vederlo. Un canale per motivo e non uno
per l'app, così chi vuole zittire i promemoria senza perdere gli altri avvisi può farlo dalle
impostazioni di sistema, che è dove la gente va a cercarlo.

**Due testi e non uno.** Chi non ha **mai** registrato una spesa non ha smesso di farlo:
«non registri una spesa da 3 giorni» a chi ha installato l'app ieri sarebbe la solita frase
falsa. È lo stesso criterio di «Metà e metà» al passo 7 del redesign.

**Le venti, in ora locale, ed è l'unico posto in cui l'ora locale è la scelta giusta.**
`calendar.ts` nel core sta in UTC perché confronta giorni fra due telefoni; qui «le venti»
vuol dire le venti dove si trova chi legge. L'aritmetica passa dai componenti del `Date` e
non da una somma di millisecondi, o l'ultima domenica di ottobre il promemoria arriverebbe
alle 19 — c'è il test che ci passa sopra.

**Verifica:** 986 test verdi (588 core + 355 app + 43 relay, di cui 16 nuovi), typecheck,
lint e `format:check` puliti, `expo export --platform android` completato.

**Sul telefono si può vedere quasi tutto subito, ma non la notifica.** Accendere
l'interruttore fa comparire il dialogo di Android e porta il passaggio 15 della diagnostica
da «permesso non concesso» a «concesso»; l'interruttore sopravvive a un riavvio. L'avviso
vero però arriva **tre giorni dopo**, e non c'è modo di affrettarlo senza toccare
`REMINDER_DAYS` o l'orologio del telefono. La logica della scadenza sta tutta in
`reminder.ts` e ha i test, incluso il caso dell'ora legale: quello che il telefono deve
confermare è che il permesso arriva e che la notifica esce dal canale giusto.

**Prossimo:** Step 32 — l'avviso di soglia di budget superata, che riusa i calcoli già in
`packages/core/src/insights/` e il secondo interruttore.

---

## 2026-08-12 — Step 30: l'infrastruttura nativa, in un colpo solo

`expo-notifications` e `react-native-android-widget` insieme in `app.json`, i due moduli
caricati pigramente come già la fotocamera, e due passaggi nuovi nella diagnostica. **La build
EAS non è ancora stata fatta**: è l'unica parte dello step che non si può scrivere, e il
comando è in fondo a questa entry.

**I due widget vanno dichiarati adesso, non agli Step 34–35.** È la scoperta dello step, e
cambia il piano. Il config plugin di `react-native-android-widget` ha `widgets: Widget[]`
**obbligatorio**, e ogni voce diventa un `<receiver>` `AppWidgetProvider` nel manifest: nome,
etichetta, dimensioni minime, modo di ridimensionamento. È configurazione **nativa**, quindi
aggiungere un widget dopo vorrebbe dire una seconda build EAS — cioè esattamente ciò che questo
step esiste per evitare. `Balance` e `MonthTotal` sono dichiarati qui, e gli Step 34–35 restano
JS puro sopra provider che esistono già.

**`POST_NOTIFICATIONS` era già dichiarato, e il piano diceva di aggiungerlo.** Lo mette il
manifest di `expo-notifications`, che il merger di Android fonde da sé. È rimasto lo stesso in
`app.json` accanto a `CAMERA` — che è ridondante per la stessa ragione, la mette il plugin della
fotocamera — perché `app.json` è il file che una persona legge per sapere cosa chiede l'app, e
un permesso che compare solo dentro `node_modules` non lo sa nessuno.

**Verificato con un `prebuild` usa e getta, non con la build.** `expo config --type introspect`
**non espande l'AndroidManifest** — restituisce l'elenco dei permessi e nient'altro — quindi non
poteva dire se i receiver dei widget nascevano davvero. Un `expo prebuild --platform android
--no-install` in un `android/` buttato via subito dopo l'ha mostrato: `POST_NOTIFICATIONS`, i due
receiver `.widget.Balance` e `.widget.MonthTotal` con i rispettivi `@xml/widgetprovider_*`, e i
quattro `meta-data` dell'icona e del colore delle notifiche. Una build EAS sono quindici minuti:
scoprire lì un nome sbagliato sarebbe stato pagarli per niente.

**Due permessi in più che non c'entrano con questo step.** Il manifest generato contiene anche
`SYSTEM_ALERT_WINDOW` e `VIBRATE`, e la tentazione era attribuirli ai plugin nuovi. Rifatto il
prebuild con l'`app.json` **di prima**: c'erano già — vengono dal manifest di debug di React
Native e dal dev client. Lo step aggiunge esattamente un permesso, `POST_NOTIFICATIONS`.

**Il prebuild ha riscritto due script, e sono stati rimessi a posto.** `expo start --android`
era diventato `expo run:android`, cioè una build locale con Gradle: questo progetto non ha mai
avuto una cartella `android/` e compila su EAS. È il tipo di effetto collaterale che passa
inosservato finché qualcuno non esegue lo script e si trova a installare Android Studio.

**I due moduli si caricano pigramente**, con `require` in `try/catch` come `expo-camera` dallo
Step 7 e come export/sharing dal 9. Qui pesa di più che altrove: la development build installata
sul telefono **è stata compilata prima che questi moduli esistessero**, e un import in cima a una
rotta verrebbe eseguito al boot — expo-router le importa tutte — portando giù l'app intera invece
della sola parte che avvisa.

**La diagnostica passa da 14 a 16 passaggi, e il 16 è quello che conta.** `getWidgetInfo(nome)`
interroga il provider nativo **per nome**: risponde con un elenco vuoto se il widget non è ancora
sulla home, e fallisce se quel provider non esiste. È l'unico modo di accorgersi che la stringa
in `WIDGET_NAMES` e quella in `app.json` hanno smesso di coincidere — uno scarto che non dà
errore di compilazione, perché le due vivono in mondi diversi, e che allo Step 34 si vedrebbe
solo come un widget che non si aggiorna mai. Il 15 legge il permesso delle notifiche con
`getPermissionsAsync` e **non lo chiede**: una sonda che apre il dialogo di sistema lo fa nel
momento in cui l'utente meno se lo aspetta, e su Android 13 lo si rifiuta una volta sola.

**`updatePeriodMillis: 0`**, scritto esplicitamente: nessun aggiornamento automatico del widget.
È la decisione del piano — refresh ad apertura app e a fine sync — e il refresh in background
resta lo Step 36, opzionale.

**L'icona della notifica è quella monocromatica**, non `icon.png`: nella tendina Android maschera
l'icona a bianco pieno, e un'icona a colori diventa una macchia. `android-icon-monochrome.png` è
già una sagoma bianca su trasparente, quindi non è stato aggiunto nessun asset.

**`npm audit` passa da 28 a 29, e il +1 non è una vulnerabilità nuova**:
`react-native-android-widget` viene segnalato perché _dipende_ da `expo`, che dipende dalla
catena metro/`image-size` già segnalata da tempo. Nessun avviso nuovo alla radice. Le «0
vulnerabilità» dello Step 0 sono ferme a quel giorno e vanno lette così.

**Verifica:** 970 test verdi, typecheck, lint e `format:check` puliti,
`expo export --platform android` completato, e il prebuild di controllo descritto sopra.

**La build è stata fatta e installata lo stesso giorno, e la diagnostica dice 16 su 16:**

```
15. notifiche locali: modulo disponibile, permesso non concesso
16. widget Android: 2 provider rispondono (0 + 0 sulla home)
```

Le due formule che sembrano un difetto sono l'esito atteso, e vale la pena dirlo perché la
prossima volta che si legge questa riga non sarà ovvio: **«permesso non concesso» è giusto**
— nessuno l'ha ancora chiesto, lo farà lo Step 31 — e **gli zeri sono giusti**, perché nessun
widget è ancora sulla home. Quello che si voleva sapere è che i due moduli sono linkati e che i
provider rispondono **al nome** con cui il JS li chiamerà: entrambe le cose ci sono.

**Un effetto collaterale che vale più di quanto costa:** questa build porta anche
`expo-file-system` ed `expo-sharing`, aggiunti allo Step 9 e mai finiti in una build installata.
Il foglio di condivisione dell'export dovrebbe funzionare adesso invece di ripiegare sugli
appunti — è una riga che era in «non verificato su hardware reale» da undici giorni, e adesso è
verificabile.

**Prossimo:** Step 31 — il promemoria locale «registra una spesa», il primo dei tre contenuti di
notifica. È JS sopra la build di questo step, e non ne chiede un'altra.

---

## 2026-08-12 — Step 29: la valuta di default nel profilo

Un campo `currency` sul `Profile`, un selettore in Tu, e il simbolo che da lì arriva a ogni
importo che l'app scrive. **Primo step del piano v5**, e il solo dei dodici che non chiede né
una build EAS né una libreria nuova.

**Il piano diceva «l'unico consumatore nuovo è il default nel form», e non stava in piedi.** Il
simbolo `€` era scritto a mano in **48 punti**: quaranta chiamate a `formatMoney` che si
affidavano al suo parametro di default, più otto `€` letterali dentro il JSX. Scegliendo il
franco, il documento avrebbe registrato `currency: 'CHF'` e la schermata avrebbe continuato a
dire `12,00 €` — un numero giusto con accanto una parola falsa, che è la cosa che questo
progetto rifiuta da quando ha deciso che «Metà e metà» non si scrive in tre. Un selettore che
non si vede non è uno step più piccolo: è una funzione che mente. Quindi il passaggio del
simbolo fa parte dello step, ed è la metà grossa del diff.

**Il simbolo passa dal profilo, non da un contesto nuovo.** `useCurrencySymbol()` sta accanto a
`useProfile()`, che è già montato sopra tutta l'app: un `CurrencyProvider` a parte sarebbe stato
un secondo contesto per un dato che sta già nel primo. I moduli **puri** — `split-text.ts`,
`balance-line.ts`, `stats/format.ts`, e `queryParts` dentro `packages/core` — non possono
chiamare un hook e ricevono il simbolo come ultimo parametro, con `'€'` come default: è ciò che
ha tenuto verdi i loro test senza riscriverli, e ciò che rende la firma additiva come lo erano
`store` e `tags` allo Step 23.

**`ExpenseRow` è l'unica riga che non guarda il profilo.** Il simbolo lì viene da
`expense.currency`, perché quella riga mostra **un importo preciso, scritto un giorno preciso**.
Dove invece si somma — totali, saldi, grafici, budget — la valuta del profilo è l'unica risposta
possibile: una somma non ha una valuta propria. La stessa ragione fa sì che la modifica di una
spesa **non riscriva** `currency`: cambiare valuta nel profilo non deve cambiare di significato
le cifre già registrate.

**Il piano insisteva su «mai a livello di gruppo», e la conseguenza va detta ad alta voce.** Il
campo resta locale al telefono e non entra mai nel documento condiviso — su questo il piano ha
ragione, e non c'è niente da fondere fra due membri. Ma **JuTrack non converte**: due persone
dello stesso gruppo con valute diverse registrano importi in unità diverse, e ogni totale li
somma come se fossero la stessa cosa. Il campo è locale nel codice, la scelta è comune di fatto,
e la riga sotto il selettore lo dice invece di lasciarlo scoprire a un saldo sbagliato.

**Sei valute, e le esclusioni sono le decisioni vere.** Fuori le valute a zero decimali (JPY):
tutto il progetto è in centesimi e `formatCents` stampa sempre due cifre, quindi «1.000,00 ¥»
non sarebbe yen. Fuori i simboli ambigui: `kr` vale per tre corone diverse, e dove il simbolo
non distingue si scrive il codice — brutto e vero invece che breve e falso. Il test che formatta
1234 centesimi in ognuna delle sei è quello che tiene ferma la prima regola.

**Posizione del simbolo e virgola decimale non cambiano**, di proposito: «12,00 $» è italiano
con dentro un dollaro, e sarebbe sbagliato in inglese. Ma il separatore e la posizione sono
convenzioni della **lingua** in cui si legge, non della moneta che si spende — vanno con
`Intl.NumberFormat` allo Step 37, non qui, e anticiparle vorrebbe dire scrivere due volte la
stessa regola.

**Una valuta illeggibile non fa cadere il profilo**, a differenza di un `profileId` vuoto: si
torna al default e si continua. Rimandare all'onboarding per un simbolo costerebbe molto più di
quanto vale, e non c'è nessun danno che si propaghi all'altro telefono — è la differenza fra una
preferenza di formattazione e la chiave con cui si è scritti dentro un vault.

**Verifica:** 970 test verdi (588 core + 339 app + 43 relay, di cui 18 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato. Resta da vedere sul telefono:
scegliere una valuta e ritrovarla dopo un riavvio, e che una spesa registrata prima conservi la
sua.

**Prossimo:** Step 30 — i due config plugin (`expo-notifications` e
`react-native-android-widget`) insieme, e **la build EAS nuova**. È l'unico step del piano v5 che
non si può chiudere senza reinstallare l'app sul telefono.

---

## 2026-08-11 — Step 28: la dashboard componibile

Sedici widget in un registro, un layout salvato in `app_meta` e una schermata `/dashboard` per
decidere quali mostrare e in che ordine. Il tab Grafici non è più una sequenza scritta nel file:
è un elenco di id che qualcuno ha scelto. **Il piano v4 è finito.**

**L'ordine esce dal JSX e finisce in un dato.** Era una sequenza di blocchi separati da filetti,
ed è diventata una mappa `WidgetId → contenuto` che il layout percorre. I nodi si costruiscono
tutti e sedici anche quando la dashboard ne mostra tre: creare un elemento React non lo disegna —
solo entrare nell'albero lo fa — e i calcoli sono quelli di prima, già tutti dentro `useMemo`.
Il guadagno è che l'ordine sta in un posto solo, `layout.ts`, invece che nella sequenza del file.

**Il filetto è passato alla cornice, ed era necessario.** Finché i blocchi erano scritti a mano, il
tratto fra l'uno e l'altro poteva stare nel JSX; da quando l'ordine è variabile, il primo tratto
resterebbe appeso in cima appena si toglie il widget sopra. `DashboardWidget` sa quale blocco è il
primo, e `Rule` è sparita da `stats.tsx`.

**Ogni widget dice il proprio nome, anche i due che non lo dicevano.** Il totale in cima e i tre
riquadri di riepilogo non avevano etichetta: un numero grande in testa alla schermata si spiegava
da sé. Da quando lo si può spostare in fondo, o togliere tutto ciò che gli sta intorno, non più.
**È la composizione a rendere obbligatorie le etichette**, non un ripensamento grafico.

**Due modi di non avere niente da dire, e sono due frasi diverse.** `unmet` riguarda il **gruppo**
(«serve almeno un'altra persona», «serve una spesa con un negozio»), `empty` riguarda il
**periodo** («in questo periodo non c'è niente da mostrare»). Mandano a fare due cose diverse, e
per questo non si potevano unire in un'unica riga. La terza possibilità — disegnare il grafico su
zero — direbbe una cosa falsa: «non ho speso niente» invece di «qui non c'è niente da vedere».

**Un widget scelto non svanisce mai.** Prima `stores`, `tags`, `paid`, `balance` e `members`
erano dietro un `&&` che li faceva sparire quando il dato mancava; adesso restano e dichiarano
cosa gli serve, con la **stessa frase** che compare nel selettore accanto al nome — `describeNeed`
è una funzione sola apposta: due formulazioni diverse farebbero pensare a due condizioni diverse.

**Gli id sconosciuti si scartano, i widget nuovi non si aggiungono.** Sembrano due regole opposte
e sono la stessa: il layout salvato è una **scelta**, non una cache. Scartare serve a non
rompersi quando un widget viene tolto dal codice; non aggiungere serve a non far _riapparire_ in
coda alla dashboard qualcosa che era stato deliberatamente tolto — e dal punto di vista del file
salvato, «widget nuovo» e «widget rimosso dall'utente» sono lo stesso caso: un id che non c'è.
La prima regola sta in `parseLayout`, la seconda in `visibleWidgets`.

**Una lista sola invece di due.** Ordine e accensione stanno insieme (`{ id, visible }[]`), così
un widget spento conserva il posto che avrà quando verrà riacceso. Ne segue che `moveWidget`
scambia sull'elenco **intero**, spenti compresi: è l'elenco che si sta guardando mentre si
riordina — nel selettore ci sono tutti — e saltare gli spenti farebbe muovere la riga di due
posti invece che di uno.

**Il default è tutti e sedici, e non è una discarica.** Il piano diceva «il default riproduce la
schermata di oggi, non il catalogo»: dopo lo Step 26 la schermata **è** il catalogo, e un default
più corto sarebbe una sottrazione fatta d'ufficio a chi aggiorna. Che le due cose coincidano è
vero oggi e non è una regola — i widget futuri entreranno nel catalogo senza entrare in un layout
già salvato, che è esattamente il meccanismo del paragrafo sopra.

**Frecce e non trascinamento**, per la quinta volta. Il drag & drop vuole
`react-native-gesture-handler` e `react-native-reanimated`, due moduli nativi, cioè una build EAS
nuova per un gesto. Due chevron fanno la stessa cosa e funzionano con TalkBack senza lavoro
aggiuntivo, e hanno un'etichetta che dice cosa spostano («Sposta Budget più in alto»).

**«Componi» sta fuori dalla barra dei filtri, ed è deliberato.** Dentro la `ScrollView`
orizzontale dei chip finirebbe in coda, cioè fuori dallo schermo appena i filtri attivi sono
due — e sarebbe l'unico modo di riaccendere i widget, nascosto proprio a chi li ha spenti tutti.
Per la stessa ragione la dashboard vuota non è una schermata muta: dice dov'è il comando.

**La scrittura è ottimistica, la lettura no.** Il riordino cambia lo stato subito e salva dopo —
un chevron deve rispondere sotto il dito, e l'unica conseguenza di un salvataggio fallito è
ritrovare al riavvio l'ordine di prima. La lettura invece fa aspettare: partendo dal default si
vedrebbe un lampo di schermata piena a ogni apertura del tab, a chi ne ha tolti dieci.

**`/dashboard` sta sulla radice e funziona senza gruppo.** È una preferenza del telefono, non di
un vault, e deve restare componibile anche a zero gruppi — come `azzera.tsx` e `backup.tsx`. Il
componente è però diviso in due, perché i suggerimenti sulle dipendenze richiedono `useMembers` e
`useExpenses`, che leggono il vault: senza gruppo si compone lo stesso, mancano solo quelli.

**La rotta nuova ha richiesto la procedura dei tipi dello Step 18**, e il typecheck l'ha
intercettata subito: `router.push('/dashboard')` non compilava perché `.expo/types/router.d.ts`
non conosceva ancora quel percorso. Rigenerati con `expo start` da `apps/mobile` — mai dalla root
del monorepo — e ricontrollato `tsc` **con quei tipi presenti**, che è il punto della procedura:
senza, un href sbagliato passerebbe lo stesso.

**Verifica:** 952 test verdi (576 core + 333 app + 43 relay, di cui 29 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato. Restano i punti 4 e 6 del
criterio di «fatto» del piano v4, che vogliono il telefono: togliere un widget, **chiudere e
riaprire l'app**, e ritrovarlo tolto; e con un solo membro nel gruppo, che i widget che ne
vogliono due dicano cosa manca invece di sparire.

**Prossimo:** nessuno step scritto. Il piano v4 è chiuso, come i tre precedenti e il redesign, e
quello che resta è la prova sui due telefoni fisici — che manca a tutti e quattro.

---

## 2026-08-11 — Step 27: i sei filtri, che agiscono su tutto insieme

Periodo, persona, categoria, negozio, tag e fascia di importo, in un solo `ExpenseQuery` che
alimenta ogni grafico della schermata. Sette file nuovi in
`apps/mobile/src/features/stats/filters/` — tre di logica pura con i loro test, quattro di
interfaccia — e `stats.tsx` ricablato. **Da qui i Grafici si possono interrogare**, invece di
mostrare quello che c'è nell'ordine in cui è scritto nel file.

**Lo stepper del mese non c'è più, e a sostituirlo sono le barre mensili.** Erano due controlli
per la stessa cosa: lo stepper diceva un mese per volta, la barra ne mostra sei e ne fa toccare
uno. Toccare una barra imposta quel mese come periodo — `monthPeriod`, che per il mese in corso
ripiega sul preset «Questo mese» così il chip non dice una data — ed è anche il modo di andare
indietro nel tempo più di quanto facciano i preset: ogni tocco riancora le sei barre, quindi si
scorre a ritroso sei mesi alla volta. L'intestazione della schermata è adesso la barra dei filtri.

**I chip portano il valore, non il nome del filtro.** «Spesa», non «Categoria»: un chip che
dicesse il nome costringerebbe ad aprire il foglio per sapere cosa sta filtrando. Le frasi le
costruisce `queryParts` di `@jutrack/core`, la stessa che scrive `describeQuery`, perché due
elenchi scritti in due punti finirebbero per raccontare due domande diverse. E «Azzera» sta
**nella barra**, non dentro il foglio: è l'uscita di sicurezza da una schermata vuota, e
chiederne di aprire un foglio per trovarla vorrebbe dire chiederlo proprio a chi non ha capito
cosa sta succedendo.

**Niente da mostrare non è la stessa cosa di tutto a zero.** Con la query senza risposte, undici
grafici disegnati su una lista vuota sono undici forme piatte che si leggono come un dato — «non
ho speso niente» — invece che come «la domanda non ha risposte». Al loro posto va uno stato vuoto
che distingue i due casi (filtri attivi o periodo senza spese) con la barra ancora in cima, così
si vede **quale** domanda è stata posta.

**Non tutti i grafici rispettano il periodo, ed è voluto.** Tre lo dichiarano nel titolo — «Dodici
mesi», «Giorni della settimana», «Anticipato e a carico» — e leggono la loro finestra di dodici
mesi ancorata al mese in cui il periodo **finisce**: un grafico intitolato «dodici mesi» che ne
mostra sette perché il periodo è corto sarebbe un titolo falso, e l'abitudine settimanale su un
mese solo sarebbe rumore. Rispettano invece gli altri cinque filtri. Saldo e budget non passano
**da nessun filtro**: sono due fatti sul gruppo e non due viste — chi deve quanto a chi non cambia
perché si sta guardando una categoria, e «speso 40 € di 200» diventerebbe falso filtrando per
persona. Ognuna di queste tre righe è scritta sotto il grafico a cui si riferisce, non solo qui.

**La proiezione passa `facets` e non `query` dove la finestra è un'altra.** `amountFor` legge solo
persona e modalità, quindi le due sarebbero equivalenti — ma `totalsByDay` usa `query.from` e
`query.to` come estremi di ripiego, e per i grafici a dodici mesi sarebbero gli estremi sbagliati.
La distinzione è la ragione per cui `QueryFacets` è un tipo a sé (`Omit<ExpenseQuery, 'from' |
'to'>`) invece di una `ExpenseQuery` che ci si ricorda di non riempire.

**Le letture dal documento restano due, non una per widget.** Una ristretta al periodo — è l'unico
filtro che conviene far fare allo store, perché restringe la scansione — e una completa, che serve
al saldo (cumulativo su tutta la storia) e alla finestra di dodici mesi. Tutto il resto sono due
`applyQuery` in altrettanti `useMemo`.

**Il confronto «rispetto a…» aveva bisogno di una regola, e sono tre casi.** Prima era sempre il
mese precedente, perché il periodo era sempre un mese. Con «ultimi 7 giorni» quel confronto non
significa niente, e con un mese **in corso** è peggio che inutile: a metà agosto qualunque mese
finito vince, e la riga direbbe «-60%» ogni giorno fino all'ultimo. `previousPeriod` distingue un
mese intero (si confronta con il mese intero prima), un mese in corso (lo **stesso tratto** del
mese prima, accorciato se quel mese è più corto: il 31 marzo diventa il 28 febbraio) e tutto il
resto (il tratto di pari lunghezza subito precedente, che finisce il giorno prima che il periodo
cominci — un giorno in comune conterebbe due volte).

**Il massimo delle fasce di importo è esclusivo di qua e inclusivo di là.** In `bins.ts` è
`min <= importo < max`, così 10,00 € sta in «10–20» e non in «0–10»; in `ExpenseQuery` `maxCents`
è inclusivo come `from` e `to`. Passare 2000 alla query includerebbe una spesa da 20,00 € nella
fascia «10–20» **e** in «20–50». Il centesimo si toglie in `amount.ts`, una volta, e il test lo
verifica passando dalla stessa `binsFor` che disegna le barre: è il tipo di scarto che nessuno
nota finché non conta due volte la stessa spesa.

**Un filtro su un negozio si spegne anche scritto con un'altra grafia.** `toggleValue` confronta
sulla chiave normalizzata (`storeKey`, `tagKey`), perché il filtro conserva la grafia scelta
mentre i suggerimenti mostrano la più usata: senza, la pillola resterebbe accesa e non ci sarebbe
modo di toglierla. E l'ultima voce spenta lascia la chiave **assente** invece di un elenco vuoto,
o `isEmptyQuery` continuerebbe a contare un filtro che non c'è più — cioè «Azzera» resterebbe
nella barra senza niente da azzerare.

**Il selettore di giorni non porta moduli nativi.** `DayGridPicker` è una griglia di `Pressable`
costruita sugli stessi helper di `calendar.ts` che servono alla heatmap, buchi in testa compresi:
un mese che comincia di sabato deve disegnare i giorni nella colonna giusta. È la quarta volta che
il progetto rifiuta un modulo nativo per un gesto — dopo `@gorhom/bottom-sheet`,
`@react-native-community/datetimepicker` e il drag & drop dei widget — e resta la base da cui
rendere modificabile, un giorno, la data della spesa, ferma dal passo 7 del redesign proprio per
mancanza di un selettore.

**La heatmap non ci stava più in larghezza, e non era un difetto suo.** Con il periodo fisso a un
mese erano cinque colonne; con «ultimi 12 mesi» sono cinquantatré, e diviso la larghezza di un
telefono farebbero celle da tre punti — invisibili e, soprattutto, **impossibili da toccare**, che
è una delle tre compensazioni su cui si regge la leggibilità di quel grafico. Ora la cella non
scende sotto i nove punti e la griglia si trascina, con la colonna dei nomi dei giorni ferma fuori
dallo scorrimento e una riga che dice che si può trascinare.

**Le modifiche del foglio si applicano subito, senza un «Applica».** Uno stato di bozza da
confermare vorrebbe dire tenere due copie della stessa domanda e un modo di sbagliare a
riallinearle; così invece il conteggio in fondo al foglio cambia mentre si tocca, e si vede
l'effetto di un filtro prima di chiudere.

**Verifica:** 923 test verdi (576 core + 304 app + 43 relay, di cui 51 nuovi), typecheck, lint e
`format:check` puliti, `expo export --platform android` completato senza variazioni di peso. Resta
il punto 3 del criterio di «fatto» del piano v4, che si vede solo su un telefono: cambiando un
filtro devono cambiare **tutti** i grafici insieme, e il totale in testa continuare a coincidere
con la somma di ognuno.

**Prossimo:** Step 28 — la dashboard componibile.

---

## 2026-08-11 — Step 26: i grafici nuovi, in SVG

Undici componenti in `apps/mobile/src/features/stats/charts/` e una schermata Grafici tre volte
più lunga di prima. I componenti non calcolano niente: ricevono quello che lo Step 25 ha già
prodotto e provato, scelgono le scale e disegnano. **È il primo step del piano v4 che si vede.**

**«Nessuna logica pura nuova» era sbagliato, e sono trenta test.** Il piano dava questo step per
tutta impaginazione. Quattro cose invece sono logica, e tutte e quattro sbagliano in silenzio:
quali etichette ci stanno sotto un asse (`axis.ts`), come si dispongono i giorni in colonne di
settimane (`heatmap-grid.ts`), come si raccoglie la coda della ciambella senza perdere centesimi
(`slices.ts`), e di che colore va scritto un nome **dentro** il colore di una categoria
(`ink.ts`). Stanno fuori dai componenti, con i loro test, come `format.ts` e `split-text.ts`.

**`inkOn` è nato con un'assunzione sbagliata, e il test l'ha bocciata al primo colpo.** Il primo
test diceva «sui colori di categoria di default scrive bianco», per tutti e otto. Ne sono passati
quattro: arancione, turchese, ocra e grigio hanno luminanza fra 0,23 e 0,27, e col bianco stanno
sotto 3,7:1. Correggere il test sarebbe stato il modo peggiore di chiuderla — la prima versione
usava la soglia WCAG (0,179), che vale contro il **bianco e il nero puri**, mentre i due
inchiostri qui sono `#FFFFFF` e `#14141B`: su un verde come `#2B8A3E` quella soglia indica il
testo scuro, e il chiaro contrasta di più. Ora si calcolano entrambi i rapporti e vince il
maggiore. Due divisioni, nessun caso limite da ricordare, e la palette si divide davvero a metà.

**La heatmap è disegnata in SVG e si tocca in React Native.** L'SVG fa le celle; sopra ci sono dei
`Pressable` trasparenti, uno per giorno, che portano il tocco e l'etichetta d'accessibilità. La
gestione dell'accessibilità dentro l'SVG dipende dalla piattaforma, quella di React Native no ed è
la stessa del resto dell'app. Le tre compensazioni chieste dal piano ci sono tutte e tre —
etichetta per cella («mercoledì 12 agosto: 34,20 €»), legenda con le soglie **in euro**, tocco che
scrive giorno e importo sotto la griglia — e vanno tenute insieme: è l'unico grafico in cui il
colore porterebbe l'informazione da solo.

**Le soglie della legenda si leggono all'indietro.** `dailyHeatmap` assegna i livelli per quantili
e non racconta a nessuno da che cifra comincia ciascuno: `levelThresholds` ricava il **minimo
osservato** per livello. Un livello che nessun giorno raggiunge resta senza soglia invece di
inventarne una, e succede davvero quando i giorni con spese sono meno di quattro.

**Una colonna della griglia comincia di lunedì, non ogni sette celle.** Contare a sette funziona
solo se il periodo comincia di lunedì: agosto 2026 comincia di sabato, e senza i buchi in testa
tutti i giorni scivolerebbero di cinque righe — il grafico direbbe che si spende di lunedì mentre
si spende di sabato. Il test passa da un mese che comincia di sabato, che è il caso vero.

**L'istogramma misura il numero di spese, non la somma.** La domanda è «faccio tanti scontrini
piccoli o pochi grossi?», e su una scala di importi la fascia «200+» vincerebbe sempre con due
spese sole. La somma di ciascuna fascia resta nell'etichetta d'accessibilità, dove serve senza
deformare la lettura.

**La ciambella si usa solo dove le fette sommano al totale.** Chi ha anticipato, sì. Negozi e tag,
no: la prima classifica somma **meno** del totale (le spese senza negozio non ci sono), la seconda
**di più** (una spesa con due tag conta per intero in entrambi). Un cerchio direbbe una falsità
sulla forma stessa, quindi lì va `TopList` — con la nota che dice perché i conti non tornano
scritta sotto l'elenco, non in un documento.

**Sul mese in corso le curve si fermano a oggi.** Una cumulata che prosegue piatta fino al 31 non
dice «non ho ancora speso», dice «non spenderò». La heatmap invece copre il mese **intero**, e i
giorni che restano si vedono spenti: lì il vuoto in fondo è l'informazione che dice a che punto
del mese si è.

**La cumulata è una spezzata, non una curva morbida.** `smoothLinePath` non scavalca i punti — è
la proprietà per cui esiste — ma su una cumulata inventerebbe pendenze nei giorni in cui non si è
speso niente, che sono precisamente i tratti piatti da leggere. La morbida sta sui dodici mesi,
dove i punti sono dodici e radi.

**Non tutto è finito in SVG, ed è una scelta.** `TopList`, `MemberComparison` e `StatTile` restano
`View` di React Native: una barra orizzontale è una vista con una larghezza, e l'SVG lì non
comprerebbe niente pagando il testo che non eredita il font dell'app. L'SVG si guadagna il posto
dove c'è un tracciato o un impacchettamento — linee, aree, archi, treemap, celle. `MonthlyBars`,
`CategoryBars` e `BudgetRows` non sono state toccate, come diceva il piano.

**Ogni grafico si misura da sé** con `onLayout` invece di ricevere la larghezza come prop o
leggere `Dimensions.get('window')`, che darebbe la larghezza dello schermo ignorando i padding
della schermata — il grafico sborderebbe di sedici punti per lato. Costa un render in più a
grafico e li rende autonomi, che è quello che servirà ai widget dello Step 28.

**`stats.tsx` passa una `ExpenseQuery` vuota a ogni aggregazione.** Non serve a niente oggi —
`amountFor` con la query vuota restituisce l'importo pieno, cioè quello che la schermata mostrava
già — e serve a tutto allo Step 27: la barra dei filtri dovrà sostituire un oggetto solo, senza
rileggere undici componenti per scoprire chi legge `amountCents` per conto proprio.

Una cosa trovata dal lint: `react-hooks/immutability` rifiuta un accumulatore riassegnato dentro
una `map` — erano gli angoli progressivi degli spicchi. Riscritto come ciclo che scrive in un
elenco locale, dove ogni arco comincia dove finisce il precedente.

**Verifica:** 872 test verdi (576 core + 253 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato. Il bundle resta quello dello Step 25 (4 MB
secondo expo, 3,81 MB il file `.hbc`): `react-native-svg` c'era già per il QR, quindi i grafici
nuovi pagano solo il proprio codice. Era il rischio dichiarato di questo step — i problemi di
bundling non li vedono né i test né il typecheck — e non si è materializzato.

**Prossimo:** Step 27 — i sei filtri, che agiscono su tutti i grafici insieme.

---

## 2026-08-11 — Step 25: la geometria dei grafici, dove si può provare

Undici moduli nuovi in `packages/core`, nessuna riga di interfaccia. Quattro in `chart/` — scale,
tracciati, treemap, fasce di importo — e sette in `insights/`. È lo step che rende i grafici
verificabili senza un telefono, ed è il motivo per cui viene prima di quello che li disegna.

**`amountFor` è il cuore, ed è una funzione sola apposta.** `paidBy` e `split.shares` sono cose
diverse: filtrando per una persona una cena da 40 € divisa a metà, mostrare 40 € sarebbe falso. Le
regole sono tre e stanno scritte accanto al codice: senza filtro persona l'importo è pieno; con «a
carico di» è la **quota**; con «ha pagato» torna **pieno**, perché la domanda è quanto ha
anticipato — mostrare la sua quota sotto un'etichetta che dice «ha pagato» contraddirebbe
l'etichetta. Il piano dava la prima e la seconda; la terza è una precisazione che serviva.

**La fascia di importo si misura sull'importo proiettato, non su quello pieno.** Altrimenti,
scegliendo «0–10 €» con un filtro persona attivo, l'istogramma costruito su `amountFor` mostrerebbe
barre **fuori** dalla fascia scelta: un filtro le cui soglie non corrispondono all'asse su cui si
legge è una trappola.

**Le tre aggregazioni esistenti hanno preso la query, e non era previsto.** Il piano dice che
`totalCents`, `totalsByCategory` e `totalsByMonth` «si riusano senza toccarle», ma dice anche che
nessun grafico legge `amountCents` per conto suo — e le due cose insieme non stanno in piedi: con un
filtro persona attivo quelle tre sarebbero rimaste le uniche a mostrare importi pieni sotto un
totale fatto di quote. Il parametro è **additivo e in coda**, il default è la query vuota, e con la
query vuota `amountFor` restituisce esattamente `amountCents`: nessun chiamante è stato toccato.

**Il test che attraversa i moduli è quello che vale.** Con lo stesso `ExpenseQuery`, la somma della
serie giornaliera, delle sette barre settimanali, delle categorie, dell'istogramma e della curva
cumulata deve dare **lo stesso numero** del totale in testa; e le aree del treemap devono coprire il
rettangolo in proporzione. Sei query diverse, filtro persona compreso in entrambe le modalità. È il
controllo che si accorge di un filtro applicato due volte o di un modulo che ha dimenticato
`amountFor` — nessuno dei test dei singoli moduli lo vedrebbe, perché ciascuno sarebbe coerente con
sé stesso. Ci sono anche le due identità che tengono in piedi il filtro persona: la somma delle
quote di tutti i membri **è** il totale pieno, e così la somma di quanto ciascuno ha anticipato.

**`smoothLinePath` è una cubica monotona (Fritsch–Carlson), non una spline naturale.** Fra due mesi
bassi e uno alto una spline scavalca i punti e scende sotto la linea di base: disegnerebbe una spesa
negativa in un mese in cui si è speso poco. Il test lo verifica senza campionare la curva, sfruttando
una proprietà delle Bézier — la curva sta nell'inviluppo convesso dei suoi punti di controllo — e
controllando che nessuna ordinata del tracciato esca dall'intervallo dei dati.

**I livelli della heatmap sono per quantili, sui soli giorni con spese.** Con una scala lineare basta
un affitto ad alzare il massimo e schiacciare tutti gli altri giorni al minimo: la griglia direbbe
«non ho speso niente» proprio nei giorni in cui si è speso. Includere i giorni vuoti nei quantili
sposterebbe invece i confini verso il basso, e in un mese tranquillo il livello 1 coprirebbe quasi
tutto. Il confronto sul confine è `>=` perché due giorni con lo stesso importo devono avere lo stesso
colore.

**`calendar.ts` lavora in UTC, non col trucco del mezzogiorno.** Il trucco di `grouping.ts:66` serve
quando il `Date` è costruito con componenti **locali**, dove l'ora legale può spostare la mezzanotte
al giorno prima. Qui non si costruisce mai un `Date` locale: UTC l'ora legale non ce l'ha, quindi il
problema non si pone invece di essere aggirato. I test passano per il 29 marzo e il 25 ottobre 2026,
che sono i due giorni in cui la differenza si vedrebbe.

Tre scelte piccole che vale la pena ricordare. La settimana comincia **di lunedì** (`dayOfWeek`
restituisce 0 per lunedì), perché è come la legge chi userà l'app. `totalsByStore` **non** produce
una voce «senza negozio»: il campo è facoltativo, quella voce dominerebbe ogni grafico dicendo
soltanto che il campo è facoltativo — e la conseguenza, che la classifica somma **meno** del totale,
è scritta dove serve. `totalsByTag` fa il contrario: una spesa con due tag conta per intero in
entrambi, quindi somma **di più**, ed è giusto così perché la domanda è «quanto ho speso in cose
etichettate casa».

`totalsByMemberOverTime` è **l'unica aggregazione che non passa da `amountFor`**, ed è scritto nel
suo commento: _è_ la scomposizione per persona, e proiettare gli importi su un membro scelto altrove
risponderebbe due volte alla stessa domanda.

**Verifica:** 842 test verdi (576 core + 223 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato. Il bundle passa da 3,9 a 4,0 MB: `chart/` esce
dal barrel di `@jutrack/core`, quindi entra nel bundle anche se nessuna schermata lo usa ancora — è
il contrario di quanto successe al passo 3 del redesign, dove i componenti non importati da nessuno
restavano fuori.

**Prossimo:** Step 26 — i grafici in SVG, che consumano tutto questo senza calcolare niente. È il
primo step del piano v4 che si vede.

---

## 2026-08-11 — Step 24: «Informazioni aggiuntive», e la pillola smette di essere scritta a mano

I due campi dello Step 23 arrivano nel form, dietro una tendina chiusa in fondo alla schermata.
Nello stesso commit `Chip` diventa un componente condiviso e i due punti che la scrivevano a mano
passano a usarlo — perché lasciarne tre copie significa che la prossima modifica ne aggiorna due su
tre.

**La riga chiusa dice cosa c'è sotto.** «Esselunga · 2 tag» quando c'è qualcosa, «Facoltativi»
quando non c'è niente. Nascondere dietro una tendina muta dei campi **compilati** è il modo in cui i
dati si perdono senza che nessuno se ne accorga: chi riapre una spesa vecchia per correggerla deve
vedere dalla riga chiusa che lì sotto c'è dell'altro. La tendina resta chiusa **anche** su una spesa
che ha già negozio e tag: a dirlo è il riassunto, non l'apertura d'ufficio.

`extraSummary` sta in `features/expenses/extra-fields.ts` con i suoi test, come `split-text.ts`. Il
troncamento del negozio a 20 caratteri **non è cosmetico**: il `numberOfLines={1}` del `Text`
impedirebbe già l'a capo, ma taglierebbe la **fine** della stringa, cioè proprio il «· 2 tag» che è
l'informazione che dice che sotto c'è dell'altro. Troncando il negozio si perde la coda del nome,
che è la parte che importa meno. Il taglio è per grafemi (`Array.from`), non per unità UTF-16, come
già `initialOf`.

**`Chip` unifica anche una divergenza che non era voluta.** Le due copie non erano identiche: le
modalità di divisione stavano su `medium` sempre, le categorie su `semibold` da selezionate e
`regular` altrimenti. Nato dallo scriverle in due momenti diversi, non da una distinzione. La regola
del componente è una: `semibold` da selezionata, `medium` altrimenti. Quello che invece **è** una
distinzione vera resta: senza `color` la pillola selezionata si riempie d'accento — è una scelta fra
modi, il colore non aggiunge nulla — con `color` prende bordo del colore e fondo `color + '22'`,
perché lì il colore _è_ l'informazione.

`Chip` prende un `icon?: ReactNode` che il piano non prevedeva: senza, le pillole delle categorie non
erano convertibili, e quelle sono metà del motivo per cui il componente esiste.

**Il vocabolario arriva da `useExpenses()`.** Nessun elenco da gestire: `knownStores` e `knownTags`
derivano i suggerimenti dalle spese del gruppo, ordinati per frequenza — i primi sei per i negozi,
perché una riga di pillole non deve diventare un elenco. `tagChoices` mette in cima i tag già scelti
e poi i suggerimenti non ancora presi, confrontando sulla **chiave**: `Regalo` scritto qui e `regalo`
altrove sono lo stesso tag, e due pillole sarebbero due modi di scegliere la stessa cosa. È una lista
e non una stringa, ma la ragione per tirarla fuori dal componente è la stessa, e ha i suoi test.

**Due modi di perdere un tag, chiusi entrambi.** Il campo di aggiunta usa `submitBehavior="submit"`
invece del default `blurAndSubmit`: chi mette due tag di seguito non deve ritoccare il campo dopo il
primo. E `handleSubmit` salva `normalizeTags([...tags, tagDraft])`, cioè **include il tag a metà
scrittura**: chi tocca «Salva» senza aver premuto «fine» sulla tastiera si aspetta di ritrovarlo. Con
`keyboardShouldPersistTaps="handled"` il tocco sul bottone arriva subito e l'`onBlur` non farebbe in
tempo a entrare nello stato letto da `handleSubmit`.

**Niente normalizzazione nel form.** `ExpenseFormValues` porta negozio e tag **così come sono stati
scritti**: a ripulirli è `VaultStore` in scrittura (Step 23), che è l'unico punto da cui il testo
entra nel documento. Una seconda regola nel form sarebbe una seconda regola da tenere allineata.

**Nessuna animazione**, come prescrive il piano: `LayoutAnimation` sulla nuova architettura è a
supporto parziale, e per una tendina non vale il rischio. `useState` e render condizionale.

**Verifica:** 686 test verdi (420 core + 223 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato. Le stringhe nuove sono **dentro il bundle** —
controllate una a una, come al passo 3 del redesign: `Dove è stata fatta` non si trova con un `grep`
perché Hermes memorizza in UTF-16 le stringhe con caratteri non ASCII, e infatti cercata in quella
codifica c'è.

**Prossimo:** Step 25 — la geometria dei grafici in `packages/core`, l'altro step che non si vede.
Ma prima va guardata questa schermata sul telefono **con la tastiera aperta**: è il rischio vero di
questo step, e il salva sta in fondo.

---

## 2026-08-11 — Step 23: il modello impara negozio e tag

Primo step del piano v4, e uno dei due che **non si vedono**: due campi su `Expense`, la loro
normalizzazione, il vocabolario derivato, e le due colonne nuove nell'export. Nessuna schermata
cambia — il form arriva allo Step 24 — ma da qui in poi i filtri hanno di che lavorare.

**Additivo, e la prova è un test.** `store` e `tags` sono campi obbligatori nel tipo e assenti nei
record già scritti: i reader hanno un fallback (`''` e `[]`) e `writeRecord` scrive solo le chiavi
che riceve, quindi una spesa registrata la settimana scorsa si legge senza che nulla la tocchi.
Niente backfill, niente bump di `CURRENT_SCHEMA_VERSION` — che è un meccanismo di **azzeramento**,
non di migrazione, e alzarlo qui cancellerebbe le tabelle. Il test «legge una spesa scritta prima
che i due campi esistessero» scrive a mano nella `Y.Map` un record senza le due chiavi.

**`strList` è difensivo perché il valore arriva dall'altro telefono.** Non è una precauzione di
stile: `listExpenses` è la lettura da cui dipende l'intera lista spese, e un `tags` che è un numero
— versione diversa dell'app, o un record scritto male — la farebbe saltare per intero. Il reader
accetta solo se è un array e tiene solo le stringhe, e restituisce sempre un array **nuovo**, così
chi legge non può modificare per sbaglio il valore dentro il documento. Due test lo fissano
scrivendo `42` e `['buono', 3, null]` direttamente nella mappa.

**I tag si scrivono come array intero, e vince l'ultimo.** La `Y.Array` fonderebbe correttamente due
aggiunte concorrenti, ma vorrebbe reader e writer nuovi in `doc.ts`, che oggi tratta solo valori
piatti, **per un conflitto che richiede che due persone etichettino la stessa spesa nello stesso
momento**. La scelta sta nel codice accanto al campo e non solo nel piano, e c'è un test di
convergenza che la fissa: dopo il sync i due documenti hanno la **stessa** lista, quale delle due non
importa. Diverso da `split`, che è atomico perché ha un'invariante da rispettare — un elenco di
etichette non ne ha.

**`Esselunga`, `esselunga` e `Esselunga ` sono lo stesso negozio.** La normalizzazione sta in
`insights/naming.ts` e si applica **in scrittura**, dentro `addExpense` e `updateExpense`, che è
l'unico punto da cui il testo entra nel documento. Si conserva la grafia scritta, si aggrega sulla
chiave, e `knownStores`/`knownTags` restituiscono la grafia **più usata**. Senza, «top negozi»
sarebbe un elenco di refusi. La deduplica dei tag è sulla chiave, non sulla grafia: `Spesa` e `spesa`
sulla stessa riga sarebbero un doppione che poi produce due barre.

Due dettagli che valgono la funzione a parte. A **parità di frequenza decide la chiave in ordine
alfabetico**, come già fa `totalsByCategory`: i due telefoni devono proporre lo stesso elenco. E le
**spese cancellate non contano**: un negozio nominato solo da una spesa che qualcuno ha cancellato è
sparito con lei, e continuare a suggerirlo mostrerebbe un posto che nell'app non risulta più.

**Il disinnesco delle formule vale anche per negozio e tag.** Un nome di negozio è testo scelto
dall'utente esattamente come la nota: un `=` in testa lo fa valutare da Excel e da Fogli Google. Per
i tag c'è una trappola in più — sono una cella sola, uniti da `;` perché la virgola è il separatore
del file — e il filtro va applicato a **ciascun tag prima di unirli**: unirli prima proteggerebbe
solo il primo, e basta un `=` sul secondo. Il test lo verifica sul secondo elemento, non sul primo.

`EXPORT_FORMAT_VERSION` passa da 1 a 2, con scritto nel commento cosa cambia e come si legge un file
di versione 1: `''` e `[]`, gli stessi fallback dei reader.

**Un'importazione che va nella direzione insolita.** `model/store.ts` importa da
`insights/naming.ts`, cioè il modello dipende dalle aggregazioni e non viceversa. È voluto e non
crea un ciclo a runtime — `naming.ts` importa da `model/types` solo tipi, che spariscono nella
compilazione — ed è dove il piano vuole la normalizzazione: accanto al vocabolario che deve
riconoscere le stesse chiavi.

**Verifica:** 674 test verdi (420 core + 211 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato.

**Prossimo:** Step 24 — «Informazioni aggiuntive» nel form della spesa, con `Chip` promosso a
componente condiviso e i due punti esistenti di `ExpenseForm.tsx` convertiti nello stesso commit.
Resta prima di tutto, però, [la prova sui due telefoni](STATO.md#cosa-non-è-ancora-stato-verificato-su-hardware-reale):
finché il sync non è stato visto funzionare in entrambi i versi non si può sapere se un negozio
scritto di qua arriva di là — che è il criterio di «fatto» di questo step.

---

## 2026-08-02 — Redesign, passo 3: i componenti del registro, e un default che non si tocca

Tre componenti nuovi, due modificati, uno esteso. Nessuna schermata li usa ancora: li useranno i
passi 4-6. Le icone del passo 2 sono state **viste sul telefono** — era l'unica parte non
verificabile da qui, perché il font di `@expo/vector-icons` si carica a runtime da un asset e
avrebbe fallito come quadratini vuoti.

**`Card` prende tre varianti, e il default resta la forma di sempre.** Il documento di design
proponeva `flat` come default: sarebbe stata una regressione silenziosa su 46 usi in 15 file, molti
fuori dal redesign — backup, invito, azzeramento — che sarebbero stati ridisegnati tutti insieme
senza comparire in un diff. Quindi `default` è la forma attuale (superficie, bordo, padding),
`flat` è il contenitore di lista (niente bordo, **niente padding**, che lo mettono le righe dentro
così i loro stati di pressione arrivano al bordo) e `raised` è la card eroe. Quando i passi 4-7
avranno spostato tutte le chiamate, `default` resterà senza usi e si potrà togliere: è un ponte,
scritto per essere smontato.

`flat` porta `overflow: 'hidden'`, che le altre due non hanno bisogno di avere: senza padding, lo
sfondo pieno di una riga premuta arriva fino all'angolo e lo squadra. È il tipo di dettaglio che si
scopre a schermata finita e si paga rifacendo il contenitore.

**`Screen` guadagna `header`, esclusivo con `title`.** Nel redesign il titolo da 34px sparisce da
tre schermate su cinque — le spese usano la pill del gruppo, i grafici lo stepper del mese, Tu il
blocco identità — ma non da tutte, e le modali lo tengono. Un componente con due modi, invece di due
componenti che divergono. Il nodo si riceve **senza padding orizzontale**: quelle intestazioni hanno
spaziature proprie e alcune arrivano a filo dello schermo.

**`AvatarStack` ha due funzioni pure sotto**, ed è lì che stanno le uniche cose che potevano essere
sbagliate:

- `initialOf` taglia con `Array.from` e non con `name[0]`. Il secondo restituisce **mezza coppia
  surrogata** se il nome comincia fuori dal piano base — un'emoji, o parecchi alfabeti non latini —
  e a schermo si vedrebbe il rombo col punto interrogativo. Il ripiego per il nome vuoto è `?`:
  succede davvero, perché il nome del profilo si salva sul blur e fra il campo svuotato e il rientro
  il membro si chiama «».
- `splitAvatars` decide chi entra nei cerchi e chi finisce nel `+N`. Quando serve il conteggio si
  mostra **un cerchio in meno**: con `max` cerchi pieni e un `+1` accanto si occuperebbe lo spazio di
  `max + 1` cerchi dicendo una cosa in meno. Il test lo fissa con `visible.length + overflow` uguale
  al totale.

Il `+N` non usa `textOnAccent`: il suo fondo è `surfacePressed`, una superficie del tema e non un
colore di membro, e il bianco sparirebbe sul tema chiaro. I cerchi delle persone sì, perché i colori
del profilo sono saturi e già validati per contrasto.

**`ListRow` non disegna separatori**, di proposito. A comporre la sezione è la schermata, che sa
quale riga è l'ultima e di quanto rientrare il filetto: una riga che si porta dietro il proprio bordo
inferiore ne lascia sempre uno di troppo in fondo all'elenco. `NavCard` **resta** per i due casi in
cui la frase di spiegazione è l'informazione e non decorazione (Diagnostica, Ripristina da backup).

**`Button`**: `radius.md` → `radius.lg`, `minHeight` 48 → 52. Sono due numeri, ma cambiano l'aspetto
di ogni schermata dell'app da subito — a differenza dei tre componenti nuovi. Il documento li mette
fra le modifiche ai componenti senza assegnarli a un passo: farli qui è l'unico posto in cui non si
perdono.

**Quello che questo passo non può verificare.** I tre componenti nuovi non sono importati da nessuna
parte, quindi Metro non li raggiunge e `expo export` **non li copre**. Non è una supposizione: nel
bundle esportato `Sincronizza adesso` (da una schermata montata) c'è, `e altre` di `AvatarStack` no.
Restano coperti dai test le due funzioni pure, che sono la sola parte che poteva essere logicamente
sbagliata; il resto è JSX che il passo 4 monterà per primo.

**Verifica:** 593 test verdi (387 core + 163 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato.

**Prossimo:** passo 4 — Tu, cioè la fusione di `profile.tsx` e `settings.tsx`, la riduzione a tre
tab e il redirect di `/settings`. Serve `href: null` per togliere la voce dalla tab bar, e
`profile.tsx` → `tu.tsx` cambia l'URL: va rifatta la procedura dei tipi di rotta dello Step 18.

---

## 2026-08-02 — Redesign, passo 2: icone vettoriali, senza toccare i dati sincronizzati

Le emoji spariscono da tab bar e categorie. Restano dove sono parte di una frase e non un'icona —
`⚠️`/`⏳`/`✓` in `describeBudget` e in `describe.ts` del sync — e negli stati vuoti, che verranno
ridisegnati insieme alle loro schermate ai passi 4-6.

**`@expo/vector-icons@15.0.2` installato, e nessuna build EAS.** Il documento lo dava per transitivo
di Expo: non lo era. La verifica che conta non è però quella, è **perché non serve una build**:
`app.json` non è stato toccato (nessun config plugin), `@expo/vector-icons` ha **zero dipendenze**
proprie, e il modulo nativo che gli serve — `expo-font` — è già una dipendenza diretta del pacchetto
`expo`, quindi era autolinkato nella build del 1º agosto. Il font arriva come asset: `expo export`
lo conferma, `Feather.ttf` (56 KB) fra gli asset del bundle.

**L'import è dal sottopercorso, non dal barrel.** `import Feather from '@expo/vector-icons/Feather'`
e non `import { Feather } from '@expo/vector-icons'`: il barrel tira dentro tutti e undici i set di
icone con le rispettive glyph map e i rispettivi TTF. Nel bundle esportato c'è **solo** `Feather.ttf`
e nessun altro font di icone, che è la prova che la differenza è reale e non teorica.

**Il campo `icon` delle categorie non si tocca, e questa è tutta la sostanza del passo.** È
sincronizzato fra i telefoni: riscriverlo per togliere le emoji genererebbe un update per ogni
categoria su ogni dispositivo, e su un documento già pieno non c'è modo di distinguere «l'ho appena
migrata io» da «l'ha rinominata l'altro». Quindi la sostituzione è **in sola lettura**, in
`features/categories/icon.ts`:

1. il valore è il **nome di un'icona Feather** → si disegna quella (categorie create da adesso);
2. è una delle **otto emoji di default** → la traduce `CATEGORY_ICONS` (vault esistenti);
3. **qualunque altra cosa** → `null`, e chi disegna mette un **pallino del colore della categoria**.

Il terzo caso è quello che regge tutto: senza un ripiego onesto servirebbe una migrazione del
documento condiviso. Riguarda le categorie create a mano con la vecchia schermata a emoji.

**`CATEGORY_ICONS` è derivata da `DEFAULT_CATEGORIES`**, non è una tabella parallela: la riga della
categoria porta emoji e nome Feather affiancati, e non si può aggiungerne una dimenticando l'altra.
Il rovescio è che la riga ha ora un campo in più, `feather`, che **non deve finire nel documento**:
`seedDefaults` scrive i tre campi per nome invece di passare la riga intera. `store.addCategory` li
sceglierebbe comunque uno per uno, ma affidarsi a quello significherebbe che un giorno qualcuno può
allargare la firma del core e scrivere `feather` in ogni vault senza accorgersene.

**Il risolutore è un modulo puro** che riceve i nomi validi come `ReadonlySet<string>` invece di
importare la libreria: così si testa in Node, fuori da React Native, ed è il componente
`CategoryIcon` — che la libreria ce l'ha in mano — a passare `Object.keys(Feather.glyphMap)`. La
lista dei nomi validi non è mai riscritta a mano: andrebbe fuori sincrono al primo aggiornamento del
pacchetto. Quattro test, incluso quello che verifica che **tutte e otto** le categorie seminate
trovino la loro icona: il pallino è per le categorie fatte a mano, e se ci cadesse una di default
ogni telefono nuovo aprirebbe l'app con dei puntini.

**Tab bar:** `users`, `bar-chart-2`, `sliders`, `user` — quattro, perché la riduzione a tre è il
passo 4. L'icona ora riceve il `color` che la tab bar le passa, cioè
`tabBarActiveTintColor`/`tabBarInactiveTintColor` già configurati: le emoji distinguevano il tab a
fuoco per opacità, che è un segnale più debole. Il tipo di quel `color` è `ColorValue`, non `string`
— può essere un `PlatformColor` — ed è l'unico errore di typecheck che il passo ha prodotto.

**La schermata Categorie scrive nomi Feather.** Dodici icone selezionabili al posto delle dodici
emoji. Non è cosmesi rimandabile: lasciare il campo a emoji mentre le emoji non si vedono più da
nessuna parte significherebbe far scegliere all'utente un simbolo che non comparirà mai.

**Verifica:** 585 test verdi (387 core + 155 app + 43 relay), typecheck, lint e `format:check`
puliti, `expo export --platform android` completato con `Feather.ttf` fra gli asset.

**Da provare sul telefono:** che le icone compaiano davvero. Il font di `@expo/vector-icons` si
carica a runtime da un asset del bundle, non è compilato nel binario: è l'unica parte di questo
passo che non si può verificare da qui, e il modo in cui fallirebbe è quadratini vuoti o icone
assenti, non un errore.

**Prossimo:** passo 3 — `SectionLabel`, `ListRow`, `AvatarStack`, la variante di `Card` (con il
default che **resta** la forma attuale) e la prop `header` di `Screen`.

---

## 2026-08-02 — Redesign, passo 1: i token, e quattro cose che il documento dava per vere

Comincia il redesign visivo, descritto in [visualdesign.md](visualdesign.md): direzione **2a**, mix
fra card e registro — card dove si agisce e c'è un numero al centro (spese, nuova spesa), registro
dove si legge (grafici, selettore gruppi, Tu). La regola che tiene insieme le due forme è **una sola
card per schermata**. Sette passi, ciascuno lascia l'app funzionante; questo è il primo e non cambia
la forma di nessuna schermata, solo i grigi del tema scuro.

**Cosa è entrato in `theme/tokens.ts`.** Fondo `#0B0B10` (era `#111116`), superficie `#15151C` (era
`#1B1B22`), premuto `#1F1F28`. Accento, semantici e colori di categoria non sono toccati: non è una
palette nuova, è la stessa con più stacco fra i livelli. Tre token che mancavano — `surfaceRaised`
(la card eroe), `divider` (separatore _dentro_ una lista, distinto da `border` che contorna),
`textFaint` (metadati e piè di pagina) — più `radius.xl`, `fontSize.xxs` e `fontSize.display`, e i
due frammenti di stile `numeric` (`fontVariant: ['tabular-nums']`) e `tightTitle`.

Sul tema scuro `surfacePressed` e `divider` valgono **lo stesso colore**, e restano due token: uno è
uno stato, l'altro è una linea, e il giorno in cui il premuto va scurito non si trascina dietro i
separatori di ogni lista. È la stessa ragione per cui il file esiste.

**Il test dei token ordina per luminanza, non per stringa.** `#0B0B10 < #15151C` come testo è vero
per caso: appena un token smette di essere un grigio puro il confronto mente. Con la luminanza WCAG
si può affermare la cosa che conta davvero — il fondo è più scuro di ogni superficie, che è
_l'intero motivo_ dei grigi nuovi — e i tre livelli di testo restano ordinati in entrambi i temi, in
direzioni opposte. C'è anche il controllo che le due palette abbiano le stesse chiavi: un token
aggiunto a una sola passerebbe il typecheck finché nessuno tocca l'altra.

**Quattro affermazioni del documento non reggevano contro il repo**, verificate prima di scrivere:

1. **`@expo/vector-icons` non è installato.** Il documento lo dà per dipendenza transitiva di Expo:
   non è in `node_modules`, non è in `apps/mobile/node_modules`, `npm ls` è vuoto. SDK 57 non lo
   tira più dentro. Va installato al passo 2 — ma è JS più asset font, ed `expo-font@57.0.1` c'è già
   come transitivo, quindi **non serve una build EAS**.
2. **`Card` con default `variant="flat"` sarebbe una regressione silenziosa.** Oggi `Card` ha sempre
   bordo, `radius.lg` e `padding: spacing.lg`; `flat` è senza bordo e senza padding. Ci sono **46
   usi in 15 file**, molti fuori dallo scope del redesign (backup, join, pair, azzera). Il default
   deve restare la forma attuale.
3. **La quota per riga non passa da `computeBalances`.** Sta già dentro la spesa: se `paidBy` sono
   io il credito su quella riga è `amountCents - split.shares[me]`, altrimenti il debito è
   `-split.shares[me]`. Torna coi numeri del mockup (50 − 25 = +25,00; −34,50 su 69,00). È O(1), non
   serve la prop `yourShareCents` che il documento prevedeva per le liste lunghe, e il core non si
   tocca.
4. **Togliere il tab Impostazioni non è cancellare il file.** Finché `settings.tsx` sta in `(tabs)/`
   la voce resta nella tab bar: serve `href: null` nelle options. E `profile.tsx` → `tu.tsx` cambia
   l'URL, quindi al passo 4 va rifatta la procedura dei tipi di rotta dello Step 18.

**Verifica:** 151 test app verdi (147 + 4 nuovi), **581 in totale**; typecheck, lint e
`format:check` puliti; `expo export --platform android` completato — il passo tocca solo costanti,
ma la trappola lib0 non era visibile né al typecheck né ai test e la regola vale sempre.

**Prossimo:** passo 2 — icone Feather al posto delle emoji in tab bar e categorie, con la mappa
emoji→Feather in `seed.ts` e il fallback a pallino colorato per le categorie create a mano. Richiede
`npx expo install @expo/vector-icons`.

---

## 2026-08-02 — Step 22: azzera questo telefono (e il piano v3 finisce qui)

L'ultimo step del piano v3, e l'unico gesto dell'app che **non si può annullare**. La schermata
esisteva già dallo Step 20 e spiegava soltanto: questo step è quindi tutto codice distruttivo e
niente impaginazione, che era esattamente il motivo per cui i due erano stati separati.

**L'ordine delle operazioni è il contenuto dello step.** Il criterio che le tiene insieme è uno:
qualunque interruzione deve lasciare il telefono in uno stato che l'app **sa già disegnare**.

1. **`registry.list()` per primissima cosa.** Le chiavi stanno in SecureStore sotto
   `groupKeyStorageKey(vaultId)`, ed `expo-secure-store` **non sa elencare i propri slot**: l'unico
   modo di nominarle è leggere i `vaultId` dal registro. Cancellare `groups` prima lascerebbe nel
   Keystore di sistema chiavi che nessuno potrà più nominare, per sempre. È il punto più pericoloso.
2. **`registry.forget(vaultId, { wipeRelay: false })` per ognuno**, riusando il percorso già scritto
   e già testato invece di riscriverne il SQL. Il `false` è esplicito: azzerare è un gesto **locale**,
   e cancellare dal relay riguarda tutti gli altri. Un `forget` che fallisce viene raccolto e non
   ferma gli altri.
3. **Spazzata delle `y_updates_*` orfane**, che rende l'azzeramento riparatore: un tentativo
   interrotto ieri si conclude oggi. Solo i nomi nella forma esatta di `updatesTableName` vengono
   eliminati — ciò che arriva da `sqlite_master` finisce in un `DROP TABLE`, dove non esistono
   parametri e tutto è interpolazione di testo.
4. **`SqliteSyncStore.forgetAll(db)`**, nuovo statico accanto a `forget`: l'unico `DELETE` senza
   `WHERE` ammesso nel progetto, e sta dentro la classe che possiede quelle tabelle, sotto il commento
   che spiega perché altrove il `WHERE vault_id` è intoccabile.
5. **`DELETE FROM groups`**, i residui.
6. **`DELETE FROM app_meta` per ultimo**, cioè il profilo per ultimo. Ogni prefisso interrotto della
   sequenza è allora «profilo presente, zero gruppi» — lo stato vuoto dello Step 21. Nell'ordine
   inverso ci sarebbe una finestra con nessun profilo ma i gruppi ancora in elenco: l'app manderebbe
   all'onboarding e poi farebbe **riapparire i gruppi di prima**, che è la peggior cosa che possa
   capitare a una funzione chiamata «azzera».

**Se qualcosa fallisce ci si ferma prima del punto 3**, con l'errore mostrato in schermata. Riprovando,
i gruppi rimasti sono ancora in elenco — quindi le loro chiavi sono ancora nominabili — e
l'azzeramento si conclude. È il test `un'interruzione a metà lascia uno stato coerente`, che fa
sollevare `keyStore.delete` sul secondo gruppo e verifica che il primo sia sparito del tutto, che il
secondo sia intatto e che il profilo ci sia ancora.

**Una cosa non prevista dal piano, trovata da un test rosso.** `ensureSchema` chiude la sequenza,
perché `DELETE FROM app_meta` porta via anche `schema_version` e qui non si riavvia l'app. Ma senza
versione registrata `ensureSchema` cerca lo schema a vault unico e lo **trova**: `sync_state`,
`sync_pending` e `sync_meta` portano gli stessi nomi di allora, e le elimina credendole vecchie. È
innocuo — a quel punto sono vuote da un istante, le ha appena svuotate `forgetAll`, e
`SqliteSyncStore.open` le ricrea alla prima apertura di un gruppo — ma è il tipo di cosa che va
scritta nel codice invece di essere riscoperta fra sei mesi. Il test ora chiede «è sopravvissuto
qualcosa?», che ha la stessa risposta nei due casi.

**Il motore va spento prima, e lo si attende.** `useWipeDevice` (`features/profile/`): `closeCurrent()`
— nuovo su `GroupsProvider`, il gruppo resta in elenco ma non è più corrente — poi il cleanup
dell'effetto di `VaultProvider` ferma engine e persistenza, e **solo quando `phase === 'absent'`** si
cancella. Cancellare a motore acceso significa un ciclo in volo che applica update su una
`y_updates_<id>` appena eliminata, o una coda ricreata dopo la spazzata. Attendere invece di sperare è
la differenza fra un progetto e un `setTimeout(…, 300)`.

**La fase dell'hook è derivata**, non scritta da un `setState` nell'effetto: `requested && absent`
significa «sto cancellando», e «il motore è spento» si legge già dallo stato del vault. È la stessa
regola imparata allo Step 21, applicata senza doverla riscoprire. Un `useRef` impedisce che un
rigiro dell'effetto avvii una seconda cancellazione.

**Il ritorno all'onboarding senza riavvio** è `forgetProfile()` (nuovo su `ProfileProvider`, un
`setProfile(null)`): il `ProfileGate` mostra `ProfileOnboarding` e **smonta `GroupsProvider` e
`VaultProvider` con tutto il loro stato in memoria**. Registrando un profilo nuovo, quei provider
rimontano e trovano le tabelle vuote — identico a un'installazione nuova. Prima di smontare si fa
`router.replace('/')`: il navigatore sparisce per intero con l'onboarding, e al ritorno riaprirebbe
l'ultima rotta, cioè «Azzera questo telefono» come prima schermata dopo un azzeramento.

**La doppia conferma è un `Switch` più un `Alert`**, e non `Alert.prompt`, che su Android non esiste.
L'interruttore «Ho capito che non si torna indietro» è attrito deliberato — il bottone non si preme
scorrendo la pagina — e non viene ricordato fra un'apertura e l'altra. Il link «Fai prima un backup
della chiave» resta in cima: è l'unica cosa che rende reversibile il gesto.

**Verifica:** `format:check`, `lint`, `typecheck` puliti; **577 test** (147 app + 387 core + 43
relay), **sette nuovi** in `state/wipe.test.ts` su `NodeSqliteDatabase` e store in memoria, fra cui
la spia sul `RelayGateway` che pretende zero `deleteVault`; `expo export --platform android`
riuscito; nessuna rotta aggiunta o spostata.

**Non provato sul telefono**, ed è l'unica funzione dell'app dove un errore non si corregge: doppia
conferma, ritorno all'onboarding senza riavviare, e che registrando un profilo nuovo non riappaia
nulla di prima. Da guardare anche il caso con un gruppo aperto e il motore in funzione: fra il tocco
e l'onboarding devono passare frazioni di secondo.

**Il piano v3 è finito.** Non resta codice da scrivere per nessuno dei tre piani: resta il criterio
di «fatto» su due telefoni fisici, che vale ancora e viene prima di qualunque piano v4.

---

## 2026-08-02 — Step 21: al primo avvio non esiste nessun gruppo

Lo Step 12 aveva eliminato lo stato «non c'è ancora un vault» creando un primo gruppo d'ufficio:
faceva sparire un ramo condizionale da mezza dozzina di schermate, e costava 32 byte casuali. Alla
prova a mano è emerso il prezzo: chi apre l'app si trova dentro un gruppo chiamato «Le mie spese» che
non ha chiesto, e non capisce se sia quello condiviso; e chi esce dall'ultimo gruppo si ritrova in un
gruppo vuoto nuovo che sembra il suo appena svuotato.

Lo stato torna, ma **in un punto solo**: il ramo condizionale vive nella guardia
`app/(gruppo)/_layout.tsx` (scritta apposta allo Step 19, prima dello stato vuoto che la attiva) e in
tre stati vuoti dichiarati.

**Il rischio dello step era distruggere i dati di chi ne ha già.** Si tocca **solo** il ramo
`list.length === 0`: nessuna migrazione, nessun bump di `CURRENT_SCHEMA_VERSION` — alzarlo avrebbe
fatto scattare `ensureSchema`, che è scritto per **cancellare** — e `schema.ts` non è stato aperto.

**La logica pura, estratta e provata** (`state/current-group.ts`, 7 test): `chooseCurrentGroup(list,
stored)` e `nextAfterLeave(list, leftVaultId)`, entrambe `string | null`. Sono l'unica parte dello
step che si possa provare senza montare React Native. Il test che conta non è quello della lista
vuota ma **`stored === null` con lista piena → il primo**: è il caso di chi aggiorna avendo già «Le
mie spese» piena di spese, e deve continuare ad aprirla come sempre.

**La fase `absent`, non un provider montato condizionalmente**

`VaultStatus` guadagna `{ phase: 'absent' }`. `<VaultProvider>` resta montato sempre: montarlo solo
quando c'è un gruppo cambierebbe il tipo di un antenato dello `Stack`, e React smonterebbe e
rimonterebbe l'**intero navigatore** nell'istante in cui si crea il primo gruppo — azzerando la pila
di navigazione proprio durante il gesto in cui l'utente ha appena creato qualcosa. Con la fase,
l'albero dei provider è stabile per tutta la vita del processo e `VaultRuntime.keys` resta non
nullable: il runtime o esiste intero, o non esiste affatto.

**`absent` è derivato, non uno stato scritto dall'effetto.** Il primo tentativo faceva
`setStatus({phase:'absent'})` nel ramo d'uscita dell'effetto, e la regola `react-hooks/set-state-in-effect`
l'ha bocciato — a ragione, ed è stata una segnalazione utile: lo stato pubblicato ora si calcola dal
gruppo corrente, e nel farlo ha chiuso **una finestra che esisteva già**. Un runtime `ready` il cui
`vaultId` non è più quello corrente vale `loading`: fra il render in cui il gruppo cambia e il giro
dell'effetto che rimonta il motore, le schermate leggevano lo store del gruppo di prima credendolo
quello nuovo.

`useSyncState()` con `absent` risponde `idle`, non l'ultimo stato del gruppo di prima: un badge che
dice «sincronizzato» quando non c'è niente da sincronizzare risponde a una domanda che nessuno ha
fatto. La costante `IDLE_SYNC` è condivisa, perché un oggetto nuovo a ogni render farebbe ridisegnare
tutti gli iscritti al contesto.

Trappola risolta come prevista dal piano: `VaultProvider` destrutturava `current` in un colpo solo.
Ora estrae `vaultId`, `origin`, `myMemberId` e `name` campo per campo, perché le dipendenze
dell'effetto devono restare **primitive** — con l'oggetto, ogni `refresh()` del registro rimonterebbe
il motore. E dentro la `boot` annidata servono due locali non nullabili (`openVaultId`, `openOrigin`):
il narrowing di TypeScript non attraversa una funzione annidata, e la risposta non è un `!`, che
sarebbe la promessa implicita che il caso non capiti mai — cioè proprio ciò che questo step rende
falso.

**`useCurrentGroup(): GroupRecord | null`**, senza un gemello che solleva. Due hook quasi uguali
diventano il posto in cui qualcuno usa quello sbagliato, e lo userebbe nella schermata che deve
funzionare senza gruppi. Cambiare la firma ha fatto trovare al compilatore tutti i chiamanti:

- **`backup.tsx`**: sparisce la metà «crea un backup» — senza chiave non c'è nulla da cifrare — e
  resta il ripristino, che è ciò per cui si arriva qui da zero. Il titolo diventa «Ripristina una
  chiave». È la conferma pratica della scelta dello Step 19 di tenerla fuori da `(gruppo)`.
- **`[vaultId]/index.tsx` e `manage.tsx`**: guardia in un componente **sopra** quello che lavora, mai
  un `return` in mezzo agli hook — sotto ce ne sono cinque che leggono il vault, e le chiamate devono
  venire prima di ogni uscita. Stesso schema di `PairInviteScreen` → `InviteToGroup`. In pratica sono
  irraggiungibili: il layout `[vaultId]` non li monta finché il gruppo dell'URL non è quello corrente.
- **`pair/invite.tsx`**: era già pronta dallo Step 19.

**I tre stati vuoti**

L'elenco gruppi («Non hai ancora nessun gruppo», con le tre strade: crea, invito, **ripristina da un
backup** — quest'ultima solo qui, perché chi ha già dei gruppi ripristina dalla gestione del gruppo,
dove sa di quale chiave si parla); i Grafici («Nessun gruppo aperto», con la via d'uscita verso
l'elenco: aggregarli su più gruppi vorrebbe dire montare più `Y.Doc` insieme, che è la scelta
architetturale evitata dall'inizio); e `(gruppo)/_layout.tsx`, già scritto.

**Uscire dall'ultimo gruppo** non ne crea più uno vuoto: `nextAfterLeave` risponde `null`, il ricordo
in `app_meta` viene **cancellato** invece di restare a puntare a un vault che non esiste più, e la
schermata torna a `/`. Il testo dell'Alert lo dice: non più «al suo posto ne verrà creato uno vuoto»
ma «resterai senza, e potrai crearne uno o entrare con un invito».

**Verifica:** `format:check`, `lint`, `typecheck` puliti; **570 test** (140 app + 387 core + 43
relay), sette nuovi tutti su `current-group.ts`; `expo export --platform android` riuscito; nessuna
rotta aggiunta o spostata, quindi i tipi di expo-router non cambiano.

**Non provato sul telefono**, ed è lo step in cui conta di più: che al primo avvio da azzerato si
arrivi all'onboarding del profilo e poi a **zero gruppi**, e che i tre ingressi funzionino tutti e
tre; che creare il primo gruppo **non azzeri la pila di navigazione**; che uscire dall'ultimo gruppo
riporti all'elenco vuoto senza spinner appesi; e soprattutto che **chi ha già dei dati non si accorga
di nulla**.

---

## 2026-08-02 — Step 20: quattro tab, e ogni cosa al suo posto

Il primo step del piano v3 che non sposta file: sposta **significati**. Le impostazioni contenevano
tre cose diverse mescolate — l'app, un gruppo, e me — e con più gruppi sullo stesso telefono la
mescolanza era diventata ambigua.

**I quattro tab**

`(gruppi)` 👥 Gruppi · `stats` 📊 Grafici · `settings` ⚙️ Impostazioni · `profile` 🙂 Profilo. Le
icone restano emoji dentro un `<Text>`: nessuna libreria di icone, nessuna build EAS nuova. Il tab
Statistiche si chiama **Grafici** (piano v3), e la schermata sotto ha cambiato titolo con lui —
un'etichetta che apre una schermata intitolata diversamente è un piccolo tradimento gratuito.

**Il tab Profilo, nuovo**

Nome (commit su `onBlur`, il `commitName` di `settings.tsx` traslocato invariato: ogni lettera
sarebbe un update Yjs e una riga nel log del relay), `ColorChoice`, l'elenco dei gruppi in sola
lettura, e l'**identificativo** — il `profileId`, `selectable`, con la frase che dice che è casuale,
opaco, e che non è un account: non c'è niente a cui accedere.

Non è una card dentro le impostazioni perché il profilo non è una preferenza dell'app: è l'unica
cosa che attraversa **tutti** i gruppi. È il `profileId` a rendermi la stessa persona in ognuno, ed è
la ragione per cui i due telefoni non contano più due persone al posto di una (Step 11).

**Impostazioni, ripulite**

Restano `SyncBadge` + «Sincronizza adesso», la Diagnostica e la riga di versione. Spariscono
Categorie, Backup della chiave ed Esporta (sono del gruppo, Step 19), «Il tuo profilo» (è il tab 4) e
la card Gruppi (è il tab 1). Le voci erano rimaste **duplicate apposta** dallo Step 19: toglierle là
avrebbe mescolato due step e lasciato un buco fra i due commit.

Il tab legge il motore con **`useVaultStatus()`, che non solleva**, invece di `useVaultRuntime()`,
che solleva: allo Step 21 dovrà funzionare senza alcun gruppo aperto, e con il vault non pronto
«Sincronizza adesso» è semplicemente disabilitato. È l'unica condizione che questo tab avrà mai — e
non usa più `useGroups().current`, che allo Step 21 diventa nullable.

**Due estrazioni, ciascuna perché la stessa cosa serve in due posti**

- **`features/groups/GroupRow.tsx`**: l'elenco dei gruppi compare adesso nella radice del tab Gruppi
  **e** nel Profilo. Due copie sarebbero divergute, e la prima a divergere sarebbe stata proprio
  l'evidenziazione del gruppo aperto — cioè l'unico segnale che distingue a colpo d'occhio il gruppo
  giusto da quello sbagliato. Prende `currentVaultId: string | null`, già pronta per lo Step 21.
- **`NavCard` guadagna `tone="danger"`**, che colora titolo e bordo. È un **tono, non un pulsante**:
  la riga naviga soltanto, e a chiedere conferma è la schermata che si apre. Un `Button
variant="danger"` lì prometterebbe che il tocco cancella già qualcosa.

**`/azzera`: la schermata prima del codice che distrugge**

`app/azzera.tsx` è sulla radice e fuori da `(gruppo)`: chi azzera resta senza gruppi, e la schermata
deve restare disegnabile mentre lo fa. In questo step **spiega e basta** — che cosa sparisce (il
profilo col suo identificativo, i gruppi con i loro nomi, le spese, le chiavi) e che cosa no (le
copie sul relay, cifrate, che scadono da sole in trenta giorni; e ciò che gli altri hanno già
scaricato). In cima, e non in fondo, il rimando a «Fai prima un backup della chiave»: è l'unica cosa
che rende reversibile il gesto, e va letta prima di decidere.

Che non sia ancora attiva è **scritto sulla schermata**, non taciuto: una pagina che elenca disastri
e non ha un pulsante sembra rotta. Lo Step 22 aggiunge l'interruttore «Ho capito» e il bottone, e
resta così tutto codice distruttivo e niente impaginazione — `wipeDevice` è la parte in cui un errore
d'ordine lascia chiavi orfane nel Keystore di sistema per sempre, e non va scritta insieme alla
grafica.

**Nessuna schermata ha perso il suo ingresso.** Era la trappola dello Step 18 (`manage` l'aveva
perso): controllati uno per uno tutti gli href dell'app contro i tipi rigenerati. `/categories`,
`/backup` ed `/export` — tolti dalle impostazioni — restano raggiungibili dalla gestione del gruppo,
e `/budget` e `/settle` anche dai Grafici.

**Verifica:** `format:check`, `lint`, `typecheck` puliti; **563 test** (133 app + 387 core + 43
relay), invariati — questo step non introduce logica pura nuova; `expo export --platform android`
riuscito; `.expo/types/router.d.ts` rigenerato contiene `/azzera` e
`` `${'/(tabs)'}/profile` | `/profile` ``, **con tutti gli URL preesistenti invariati**, e `tsc` è
stato rieseguito con quei tipi presenti.

**Non provato sul telefono.** Restano da vedere in mano: che quattro etichette stiano nella tab bar
senza troncarsi, che il tab Profilo salvi il nome sul blur, e che `/azzera` si apra e si chiuda.

---

## 2026-08-02 — Step 19: dentro il gruppo c'è tutto il gruppo

L'ultimo spostamento di file del piano v3, e il secondo dei due step «delicati». Stessa procedura
dello Step 18, stesso giudice: `expo export` e i tipi delle rotte rigenerati.

**Lo spostamento, in un solo commit**

```
app/(gruppo)/_layout.tsx        [nuovo]  la guardia «serve un gruppo»
app/(gruppo)/categories.tsx     [git mv da app/categories.tsx]      "/categories"
app/(gruppo)/budget.tsx         [git mv da app/budget.tsx]          "/budget"
app/(gruppo)/settle.tsx         [git mv da app/settle.tsx]          "/settle"
app/(gruppo)/export.tsx         [git mv da app/export.tsx]          "/export"
app/(gruppo)/expense/new.tsx    [git mv da app/expense/new.tsx]     "/expense/new"
app/(gruppo)/expense/[id].tsx   [git mv da app/expense/[id].tsx]    "/expense/<id>"
```

**Gli URL non sono cambiati, e anche stavolta è dimostrato.** Le parentesi non compaiono nell'URL:
`.expo/types/router.d.ts` rigenerato contiene `` `${'/(gruppo)'}/categories` | `/categories` `` e le
altre cinque nella stessa forma, e `/backup` è rimasto sulla radice. Poi `tsc --noEmit` **con quei
tipi presenti**. Nessun `router.push` è stato toccato: il grep sugli href dà zero risultati e i
chiamanti (`stats.tsx` verso `/settle` e `/budget`, la lista spese verso `/expense/…`) non sanno che
i file si sono mossi.

**Una guardia sola, in un file solo**

`(gruppo)/_layout.tsx` controlla `useGroups().current !== null` e altrimenti mostra `GroupRequired`.
**Oggi quella condizione è sempre vera** — c'è sempre almeno un gruppo (Step 12), quindi è una rete
di sicurezza inerte. Allo Step 21, quando al primo avvio non esisterà più alcun gruppo, sarà il
**solo** punto dell'app in cui quel ramo esiste, invece delle condizioni sparse che lo Step 12 aveva
eliminato apposta. È per questo che la guardia viene prima dello stato vuoto che la attiva: quando
arriva il ramo, il posto dove metterlo esiste già.

Il layout rende uno `Stack` vero e non un `<Slot />`: con lo `Slot` si perderebbero le animazioni di
push e la pila di ritorno di schermate che sono compiti da aprire e chiudere.

**Due esclusioni deliberate, che erano la parte da non sbagliare**

- **`backup.tsx` resta sulla radice.** È l'unica schermata da cui si **ripristina** una chiave, cioè
  la cosa che serve proprio a chi non ha nessun gruppo: dopo un azzeramento, o su un telefono nuovo.
  Dietro «serve un gruppo» il ripristino sarebbe irraggiungibile esattamente quando serve.
- **`pair/invite.tsx` non si sposta.** Un gruppo lo richiede, ma `app/(gruppo)/pair/invite.tsx`
  accanto ad `app/pair/index.tsx` farebbe convergere due cartelle diverse sullo stesso segmento
  `/pair`. Usa `GroupRequired` in linea — e la guardia sta in un componente **sopra** quello che
  lavora (`InviteToGroup`), non in un `return` anticipato: le regole degli hook impongono che le
  chiamate vengano prima di ogni uscita, e allo Step 21 sarebbero tutte a leggere un `group` che può
  non esserci.

**Il gruppo diventa il contenitore di ciò che lo riguarda**

`manage.tsx` guadagna cinque `NavCard`: Categorie, Budget, Pareggi, Backup della chiave, Esporta i
dati. È il problema di prodotto numero 1 del piano v3: chi apriva «Backup della chiave» dalle
impostazioni non aveva modo di sapere **di quale chiave** si parlasse — con più gruppi sullo stesso
telefono è una domanda con più risposte. Ora il sottotitolo lo dice: «La chiave di «Casa»…».

`NavCard` è salita da `settings.tsx` a `components/NavCard.tsx`, invariata: la stessa riga serve
adesso in due schermate. Le voci restano **anche** in Impostazioni fino allo Step 20, che è quello
che ripulisce i tab: toglierle qui avrebbe mescolato due step e lasciato un buco fra i due commit.

`stats.tsx` mantiene le sue scorciatoie verso `/settle` e `/budget`: sono statistiche del gruppo
corrente, e da lì quei due gesti sono naturali. Sono scorciatoie verso le stesse rotte, non una
seconda casa.

**Verifica:** `format:check`, `lint`, `typecheck` puliti; **563 test** (133 app + 387 core + 43
relay), invariati — questo step non introduce logica pura nuova; `expo export --platform android`
riuscito, nessuna rotta duplicata; tipi delle rotte rigenerati da `expo start` e ricontrollati con
`tsc`.

**Non provato sul telefono.** Restano da vedere in mano: che le cinque `NavCard` aprano davvero le
schermate giuste dentro il gruppo, e che `Chiudi` riporti al gruppo e non fuori.

---

## 2026-08-02 — Step 18: il tab Gruppi, elenco → gruppo, con gli URL intatti

Lo step dichiarato «rischio numero uno» del piano v3: sposta le rotte con cui si entra in un gruppo
dopo un invito, e può romperle **in silenzio**. Nessuna logica cambia — cambia dove stanno i file.

**Lo spostamento, in un solo commit**

```
app/(tabs)/(gruppi)/_layout.tsx                    [nuovo]  stack del tab 1
app/(tabs)/(gruppi)/index.tsx                      [git mv da app/groups/index.tsx]           "/"
app/(tabs)/(gruppi)/groups/[vaultId]/_layout.tsx   [nuovo]  guardia di selezione + Stack
app/(tabs)/(gruppi)/groups/[vaultId]/index.tsx     [git mv da app/(tabs)/index.tsx]           "/groups/<id>"
app/(tabs)/(gruppi)/groups/[vaultId]/manage.tsx    [git mv da app/groups/[vaultId].tsx]       "/groups/<id>/manage"
```

Un solo commit perché nell'istante in cui esistono sia `app/groups/index.tsx` sia
`(tabs)/(gruppi)/index.tsx` expo-router protesta per rotte duplicate, e in CI se ne accorge solo
`expo export`.

**Gli URL non sono cambiati, e stavolta è dimostrato invece che sperato**

Le parentesi non compaiono nell'URL, quindi `/groups/<vaultId>` è rimasto esattamente dov'era:
`useAdoptPairing`, `backup.tsx` e la lista non sono stati toccati. La prova non è un ragionamento ma
il file dei tipi che genera expo-router: cancellato `.expo/types/router.d.ts`, riavviato `expo start`
da `apps/mobile`, e il file rigenerato contiene `` `${'/(tabs)'}${'/(gruppi)'}` | `/` ``,
`/groups/[vaultId]` e `/groups/[vaultId]/manage`. Poi `tsc --noEmit` **con quei tipi presenti**: è
l'unico momento in cui gli href vengono verificati davvero, perché `.expo/types/` è gitignorato e in
CI il typecheck passa comunque.

Il grep prescritto dal piano — `grep -rn "'/groups'\|'/(tabs)'" apps/mobile/src` — dà zero risultati.
Tre href riscritti: la pill delle spese (sparita del tutto), `settings.tsx:153` e `join.tsx:78` a
`/`, e il `router.replace('/(tabs)')` dopo l'uscita da un gruppo, anch'esso a `/`.

**La guardia di selezione è salita nel layout**

Tutto il blocco di `groups/[vaultId].tsx` — l'effetto che chiama `select`, il controllo `stillExists`,
lo spinner — sta ora in `[vaultId]/_layout.tsx`: gira una volta per gruppo invece che una per
schermata, e le spese e la gestione la ereditano. `manage.tsx` si è ridotta al solo contenuto e può
leggere il runtime del vault dando per scontato che sia il suo.

**Tre cose che il piano non prevedeva, e che servivano**

- **L'elenco dei gruppi non è più una `ModalScreen`.** È la radice del tab, cioè ciò che risponde a
  `/`: un pulsante «Chiudi» che chiama `router.back()` non avrebbe nulla da chiudere. È diventato
  `Screen`.
- **`Screen` ha guadagnato `onTitlePress`.** Da quando l'elenco apre le **spese** invece della scheda
  del gruppo, la gestione non avrebbe più avuto un ingresso. Il titolo della schermata **è** il nome
  del gruppo e toccarlo porta a `/groups/<id>/manage` — che è anche la forma prevista dallo Step 19.
- **Il tab si chiama «Gruppi» 👥 già da adesso**, non dallo Step 20: la sua radice è l'elenco dei
  gruppi, e chiamarlo ancora «Spese» sarebbe stato falso.

Inoltre `create` fa `push` e non più `replace`: l'elenco è la radice dello stack, e sostituirlo
lascerebbe il gruppo appena creato senza nulla sotto — «indietro» uscirebbe dall'app. Per la stessa
ragione entrambi i layout dichiarano `unstable_settings = { initialRouteName: 'index' }`, che è ciò
che mette l'elenco sotto a chi arriva a `/groups/<id>` da un link.

`ModalScreen` ha una prop `closeLabel` (default `'Chiudi'`): `manage.tsx` usa `'‹ Indietro'`, perché
è spinta dentro lo stack del tab e la tab bar resta visibile.

**Logica pura estratta:** `features/groups/list.ts` con `shortVaultId` e `groupSubtitle`, cinque
test. `groupSubtitle` prende già `currentVaultId: string | null` — allo Step 21 «nessun gruppo
aperto» sarà uno stato reale, e il caso è coperto da adesso.

**Il conteggio dei test in `STATO.md` era sbagliato**: diceva 124 app / 554 totali, ma la baseline
misurata prima di toccare nulla era **128 app / 558 totali**. Corretto insieme al resto.

**Verifica:** `format:check`, `lint`, `typecheck` puliti; **563 test** (133 app + 387 core + 43
relay); `expo export --platform android` riuscito (1560 moduli, nessuna rotta duplicata); tipi delle
rotte rigenerati e ricontrollati con `tsc`.

**Non provato sul telefono.** Il punto 2 del criterio di «fatto» (indietro dentro il tab, tab bar
visibile sul gruppo e assente sulle schermate-foglia) e il punto 3 (un invito in chat che apre ancora
`/groups/<id>`) si vedono solo con l'app in mano.

**Prossimo:** Step 19 — dentro il gruppo c'è tutto il gruppo, e la guardia in un file solo.

---

## 2026-08-02 — Il secondo dispositivo monta i moduli veri dell'app

**Il problema del peer della versione precedente**

Il peer costruito poche ore prima usava il core e **si scriveva da sé** la logica dei membri e dei
gruppi. Dei due bug che rendevano sbagliati i saldi alla prima prova con due telefoni, uno stava nel
core (`SyncEngine.start`, corretto allo Step 10) e uno nell'**app** (`VaultProvider`: il membro
nasceva da un id casuale per dispositivo invece che dal profilo, corretto allo Step 11). Un secondo
dispositivo che reimplementa quella logica farebbe la cosa giusta mentre l'app fa quella sbagliata, e
la prova direbbe **verde**. È lo stesso motivo per cui il test del `WHERE vault_id` gira su SQLite
vero e non su un finto motore.

**Cosa è stato fatto**

`apps/mobile/scripts/device.mts` monta i moduli veri: `ensureSchema`, il profilo, `GroupRegistry`,
`SqliteYPersistence`, `SqliteSyncStore`, `resolveMyMemberId`, `seedDefaults` — su SQLite vero e
contro il relay in produzione. È `ProfileProvider` + `GroupsProvider` + `VaultProvider` senza React.
Resta fuori solo ciò che è React o nativo.

- **`resolveMyMemberId` è stata estratta** da `VaultProvider.tsx` a `state/membership.ts`, con
  quattro test. Dentro un componente React era verificabile **solo** su un telefono; è la funzione
  del bug dei membri duplicati, e lasciarla lì significava non poterla provare.
- **`NodeSqliteDatabase` accetta un path**, così il dispositivo sopravvive alla chiusura del processo
  come `expo-sqlite` sopravvive alla chiusura dell'app. I test restano in memoria.
- **`apps/mobile/tsconfig.json` include ora `**/\*.mts`**: l'harness è dentro `npm run typecheck`, e
  cambiare la firma di un modulo dell'app senza aggiornarlo rompe la compilazione. È l'unica cosa che
  gli impedisce di divergere in silenzio e continuare a dire verde.
- `npm run prova` esegue la checklist da sola: dieci sezioni, ~30 controlli, ~90 s, uscita 1 se
  qualcosa è rosso. `npm run peer` resta la versione interattiva, per le prove che hanno bisogno del
  telefono dall'altra parte.

**Due cose imparate scrivendo lo scenario, entrambe da un rosso**

- **Chi entra in un gruppo altrui non ottiene un membro finché non risponde** a «chi sei in questo
  gruppo?». Il primo scenario saltava quel gesto e il controllo sui membri falliva. Non era un bug:
  era la prova che l'harness segue l'app davvero — un peer che si scrive la logica da sé non avrebbe
  mai fatto quella domanda. Da lì `chooseIdentity`, che è il bottone di `GroupIdentityGate`.
- **Una spesa divisa «fra tutti» lo è fra tutti quelli che si conoscono in quel momento.** Il saldo
  risultava −3,75 invece di +6,25 perché A aveva registrato prima che la presenza di B gli arrivasse:
  divisa per uno solo. Il codice era giusto, sbagliata era l'attesa dello scenario. Adesso la prova
  aspetta che i due si vedano **prima** di registrare, e il commento dice perché.

**Esito: trenta controlli verdi** contro il relay in produzione — sync in entrambe le direzioni (2,0 s
e 0,8 s), due membri, saldo +6,25/−6,25 verificato a mano, otto categorie e non sedici, due gruppi
separati, aereo → rete in 11,0 s senza toccare nulla, poll che rallenta a 5 s a riposo, `markActive`
che sveglia in 0,1 s, dati ritrovati dopo la chiusura, e il relay che accetta la cancellazione.

**È la prima volta che il criterio di «fatto» del piano v2 viene esercitato fuori dai test** — con i
moduli dell'app, anche se non ancora con un telefono in mezzo.

---

## 2026-08-02 — Un secondo telefono che gira in un terminale (prima versione)

**Perché**

Il criterio di «fatto» di entrambi i piani chiede due telefoni fisici, e ce n'è uno solo. L'emulatore
richiederebbe tutto l'SDK Android e una build locale con Gradle (la development build di EAS è arm64,
le immagini dell'emulatore sono x86_64): ore di lavoro per una strada peggiore.

**Cosa è stato fatto**

`scripts/peer.mts` — un secondo dispositivo che gira in Node, con `npm run peer`. Non è un simulatore
e non finge nulla: usa `@jutrack/core` così com'è — stesso crypto, stesso `SyncEngine`, stessa scala
di poll, stesso formato d'invito — contro il **relay in produzione**. Per il relay e per il telefono è
indistinguibile da un altro telefono.

**È possibile solo perché il core non importa nulla da react-native o expo**, per vincolo
architetturale imposto da una regola ESLint su `packages/core/src/**`. È la prima volta che quel
vincolo si ripaga davvero, e vale la pena annotarlo: era stato scritto pensando al riuso su web.

Fa il lavoro che sul telefono fanno `SqliteSyncStore` e `SqliteYPersistence` con un file JSON, e
ricarica il documento **prima** di costruire il motore — riproducendo la situazione che rende
necessario il catch-up di `start()`, che è il bug corretto allo Step 10.

**Le due decisioni non ovvie**

- **Il membro nasce da un id stabile salvato nel file**, come il `profileId` sul telefono. Generarne
  uno nuovo a ogni avvio riprodurrebbe il bug dei membri duplicati dello Step 11 — e sarebbe il peer
  a sbagliare, non l'app: la prova direbbe «rotto» su codice giusto.
- **Le arrivi si distinguono per origine** (`origin === engine`): il motore applica ciò che scarica
  con sé stesso come origine. Senza, anche le spese scritte in locale comparirebbero con la freccia
  in entrata e la prova non direbbe più nulla.

Il conteggio delle richieste (`--verbose` stampa ogni GET con l'intervallo dalla precedente) non è un
vezzo: è il modo di **vedere** la scala dello Step 16 e l'`offlineRetryMs` dello Step 17 mentre
lavorano, con i secondi misurati invece che dedotti dai test.

**Verificato subito, con due peer sul relay vero**

Sync in **entrambe le direzioni** (A→B in ~1 s, B→A in ~2 s), **due membri e non quattro**, e saldi
speculari corretti (+3,75 / −3,75, verificati a mano). È la prima volta che il criterio di «fatto»
del piano v2 viene esercitato fuori dai test — anche se non ancora con un telefono in mezzo.

**Cosa resta al telefono:** interfaccia e navigazione, `expo-sqlite` fra due riavvii, la consegna di
`jutrack://join#…` **col fragment** da parte di Android, il foglio di condivisione, la scansione QR.
Tutto ciò che sta sopra il core — e per quello basta **un** telefono.

Guida operativa con le cinque prove in ordine:
[prova-con-un-telefono-solo.md](prova-con-un-telefono-solo.md).

---

## 2026-08-02 — Step 17: offline non è un errore del relay

**Fatto**

Tre sprechi distinti, tutti trovati **leggendo** il motore allo Step 15 e nessuno coperto da un
test. Ultimo step del piano v3 che non tocca una sola schermata: `packages/core/src/sync/` più
`apps/mobile/src/platform/sync-store.ts`.

**17.1 — `offlineRetryMs`, che è il listener di connettività che non possiamo avere**

Una `fetch` che fallisce perché non c'è rete **non tocca il relay**: non c'è niente da proteggere con
un backoff, e salire a cinque minuti significa cinque minuti in cui il ritorno della connettività non
produce nulla. Un listener vero (`netinfo`, `expo-network`) sarebbe un modulo nativo, cioè una build
EAS nuova — che questo piano si vieta. Il sostituto è ritentare presto: default 15 s.

- Campo `retryDelayMs` **distinto** da `backoffMs`, ed è la parte che conta. Un errore non-`RelayError`
  non tocca più `backoffMs`: se il relay stava rispondendo 500 e poi si entra in galleria, al ritorno
  non si riparte da due secondi a martellare un relay ancora in difficoltà. C'è un test che fissa
  proprio la sequenza (500, 500 → 4 s, 8 s; due giri senza rete → 15 s, 15 s; poi 500 → **16 s**, non
  4 s).
- `Math.max(offlineRetryMs, pollIntervalMs())`: quando nessuno guarda e il poll normale è di 60 s,
  ritentare ogni 15 non ha senso. La rete che torna viene comunque intercettata entro un minuto, e
  riaprendo l'app `AppState → active` fa `resume()` con giro immediato.
- Riordinato il `catch` di `runCycle`: il ramo «non è un `RelayError`» ora esce **prima** di toccare
  il backoff, invece di modificarlo e poi uscire. Il vecchio ordine era la ragione per cui il bug
  esisteva.

**17.2 — Lo state vector si riscrive solo se è cambiato**

Era `setPushedStateVector` a **ogni** ciclo, anche a vault fermo: un `fsync` ogni tre secondi per ore.
Campo `lastPushedStateVector`, valorizzato in `start()` con la lettura che **già avviene lì** — nessuna
lettura in più — e confronto byte a byte prima di scrivere.

La cache si aggiorna **dopo** che la scrittura è riuscita, mai prima. Con la cache già avanzata, una
scrittura fallita farebbe credere al giro dopo di aver pubblicato ciò che non ha pubblicato, e al
riavvio il catch-up di `start()` salterebbe quel delta: spese sparite in silenzio. `MemoryCursorStore`
ha guadagnato `failNextStateVectorWrite` apposta, accanto al `failNextWith` di `FakeRelay`.

**17.3 — Le scritture della coda non si accavallano**

`onLocalUpdate` fa `void this.store.setPending(...)` senza `await`, e `setPending` apre una
transazione. Due spese ravvicinate intrecciano due `BEGIN` sulla stessa connessione: il secondo
fallisce con «cannot start a transaction within a transaction», e il suo `catch` esegue un `ROLLBACK`
che annulla la transazione **del primo**. Rimedio: catena di promesse in `SqliteSyncStore`, che
prosegue anche dopo un fallimento — l'errore lo riceve chi ha chiamato, ma la scrittura successiva non
deve restare bloccata per sempre.

**Deviazione dal piano, deliberata: la catena è per connessione, non per vault.** Il piano diceva
`private tail` sull'istanza. Ma la transazione appartiene alla **connessione**, e i due store dei due
gruppi la condividono: cambiando gruppo, la `setPending` ancora in volo del gruppo che si chiude e la
prima del gruppo che si apre sono esattamente il caso da escludere — e `VaultProvider` non attende la
prima prima di montare il secondo. Quindi `WeakMap<SqliteDatabase, Promise<void>>` statica. Il secondo
test nuovo (`nemmeno se arrivano da due gruppi diversi`) copre proprio quello, e con `tail` per
istanza fallirebbe.

**I due test nuovi sono stati visti fallire senza la correzione**, su SQLite vero: rimossa la
serializzazione, entrambi rossi; rimessa, entrambi verdi. Su un finto motore sarebbero passati
comunque — è la stessa ragione per cui il test del `WHERE vault_id` gira su SQLite vero.

**Verifica:** 554 test verdi (387 core + 124 app + 43 relay), da 548. Typecheck, lint e
`format:check` puliti, `expo export --platform android` a posto. Il test esistente `il ritorno in
primo piano azzera il backoff` è verde senza essere stato toccato.

**Sul telefono non è ancora stato visto.** La prova che conta è nel criterio di «fatto» del piano v3:
telefono in aereo, due spese, rete riaccesa → partono entro ~15 s senza toccare nulla.

**Prossimo:** Step 18 — il tab Gruppi diventa uno stack elenco → gruppo. È il primo step che sposta
rotte, ed è il rischio numero uno del piano: **prima conviene fare la prova sui due telefoni fisici**,
altrimenti si perde la baseline.

---

## 2026-08-02 — Step 16: il poll diventa una scala, e l'app dice quando qualcuno guarda

**Fatto**

Il gradino binario 3 s / 30 s dentro una finestra attiva di due minuti è sostituito da una scala per
soglie di inattività, e il motore ha un modo esplicito di sapere che una schermata di dati condivisi
è a fuoco. Solo `packages/core/src/sync/` e due schermate: nessuna rotta toccata, nessun modulo
nativo, nessuna build EAS.

| Inattività | Poll |
| ---------- | ---- |
| 0          | 2 s  |
| 15 s       | 5 s  |
| 60 s       | 15 s |
| 5 min      | 60 s |

**Una tabella, non una formula esponenziale.** Si vuole poter rispondere a «dopo un minuto ogni
quanto chiede?» leggendo quattro righe — e una tabella si prova con `it.each`, che è il primo test
dello step: otto casi, tutti sui confini (14 999 → 2 000, 15 000 → 5 000).

Il primo tratto è **più veloce** di prima (2 s invece di 3): a schermo acceso la latenza percepita
migliora, e il risparmio arriva dal fatto che il ritmo stretto dura quindici secondi invece di due
minuti. Stimate ~400 richieste al giorno contro le ~1.500 misurate allo Step 15.

**Le decisioni che valeva la pena prendere qui**

- **`activePollMs` / `idlePollMs` / `activeWindowMs` restano e vincono se passate**, riscritte come
  scala a due gradini `[{0, active}, {activeWindow + 1, idle}]` — il `+ 1` perché la finestra attiva
  includeva il proprio ultimo istante (`idleFor <= window`). Serviva perché il test
  `rallenta il poll fuori dalla finestra attiva` restasse **identico parola per parola**: riscrivere
  un test insieme al comportamento che verifica è il modo classico di perdere copertura senza
  accorgersene. È verde senza essere stato toccato.
- **Validazione nel costruttore, non al primo uso.** Scala vuota, primo `afterMs ≠ 0`, soglie non
  crescenti, `pollMs <= 0` → `throw`. Scoperta dentro `pollIntervalMs`, una scala malformata
  diventerebbe un `undefined` passato a `sleep`: un ciclo che martella il relay a piena velocità
  senza che nulla lo segnali.
- **`pollIntervalFor(schedule, idleForMs)` è pura ed esportata.** `pollIntervalMs()` è una riga, e la
  logica della scala si prova senza costruire motore, relay e documento.
- **Nel ramo `paused` si dorme l'ultimo gradino** invece di `idlePollMs`: è un sonno che non tocca la
  rete, tanto vale il più largo.

**`markActive()`, e perché non il suo opposto.** Due righe nel motore (`lastActivityAt = now()`,
`wake()`), e un hook `useEngineActivity()` che lo chiama in `useFocusEffect` **solo** dalle due
schermate che mostrano dati condivisi: la lista spese e i Grafici. Sospendere il ciclo quando nessuna
schermata di dati è a fuoco passerebbe da `pause()`, che ferma anche il **push**: una pausa rimasta
appesa sarebbe una spesa scritta che non parte, in silenzio — la classe di guasto che questo progetto
ha già pagato due volte. Dimenticare un `markActive` produce invece solo un poll più lento.

Il `wake()` non è un di più: senza, chi apre la lista spese dopo cinque minuti di inattività
aspetterebbe comunque la fine del sonno da un minuto già in corso. C'è un test apposta.

L'hook legge `useVaultStatus()` e non `useVaultRuntime()`, che solleva: una schermata a fuoco mentre
il vault si sta montando è normale.

**Verifica:** 548 test verdi (383 core + 122 app + 43 relay), da 536. Typecheck, lint e
`format:check` puliti, `expo export --platform android` a posto. **Sul telefono non è ancora stato
visto**: il punto 5 del criterio di «fatto» del piano v3 — una spesa che arriva entro un minuto dopo
cinque minuti di fermo — resta da provare.

**Prossimo:** Step 17 — `offlineRetryMs`, state vector riscritto solo se cambia, scritture della coda
serializzate. Anch'esso tutto dentro `packages/core/src/sync/` più `platform/sync-store.ts`.

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
