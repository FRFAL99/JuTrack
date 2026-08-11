# Devlog

Registro cronologico dell'avanzamento. Entry in ordine cronologico inverso (più recente in alto).

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
- **`apps/mobile/tsconfig.json` include ora `**/*.mts`**: l'harness è dentro `npm run typecheck`, e
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
