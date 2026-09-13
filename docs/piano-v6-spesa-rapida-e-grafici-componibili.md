# JuTrack — Piano v6: spesa rapida e grafici componibili

> Punto d'ingresso del progetto: [STATO.md](STATO.md). Le decisioni di questo piano vengono da due
> artifact Claude Design del 12 settembre 2026: `JuTrack UI.dc.html` (turni 0, 1 e 2 — la
> ricostruzione dello stato attuale, le tre direzioni provate, le due composizioni dei Grafici) e il
> registro delle decisioni che questo file riprende punto per punto.
>
> **Gli Step 49, 50 e 51 sono nel codice (13 settembre 2026); resta il 52.** Le 15 decisioni sono
> prese, la direzione è scelta —
> **Lastra** (turno 1a: stessi token, gerarchia rifatta) contro le due scartate, **Insegna** (1b:
> fondo nero pieno, accento lime acido, cifre Space Grotesk) ed **Estratto** (1c: serif per le cifre,
> monospazio per i metadati) — e per la composizione dei Grafici si va con **2b**, comporre dentro i
> Grafici stessi. Il [redesign precedente](visualdesign.md) resta chiuso, sette passi su sette, e non
> viene toccato: questo è un **secondo giro**, sugli stessi token e sugli stessi componenti.

## Contesto

Due problemi dichiarati, verificati contro il codice attuale (`GroupHome.tsx`, `stats.tsx`,
`tu.tsx`, `ExpenseForm.tsx`, `theme/tokens.ts` — la ricostruzione del turno 0 del mockup):

1. **Nuova spesa** ha ancora la tastiera di sistema: il salva finisce sotto la tastiera e la
   schermata va scorsa, mentre le due cose che servono sempre — la cifra e il salva — dovrebbero
   stare insieme a schermo.
2. **Comporre i sedici widget dei Grafici non è chiaro**, per tre ragioni: si compone in
   `app/dashboard.tsx` e si guarda altrove, quindi l'effetto non si vede mentre lo si decide; sedici
   righe di pari peso con nomi astratti («Dodici mesi», «Quante spese, per fascia») non hanno
   anteprima; e due chevron non dicono _dove_ finirà la riga spostata.

## Direzione (decisioni 1–3)

### 1 · Si tiene l'identità attuale e si rifà la gerarchia

**Decisione.** Fra le tre direzioni mostrate si va con **Lastra**: accento, semantici, colori di
categoria e grigi di `darkPalette` restano intatti.

**Perché.** Il problema dichiarato era «il blocco eroe è denso e la lista è un muro di righe
uguali»: è un problema di gerarchia, non di palette. Cambiare i colori non l'avrebbe risolto, e
avrebbe rimesso in discussione i colori di categoria — già validati per protanopia, deuteranopia e
tritanopia (`state/seed.ts`). Regola operativa: **un solo numero grande e una sola cosa d'accento
per schermata**, tutto il resto scende di un gradino di contrasto.

### 2 · Il carattere resta quello di sistema

**Decisione.** Nessun font nuovo nel bundle. Manrope nei mockup serve solo alla resa in HTML, come
già scriveva [visualdesign.md](visualdesign.md#14-tipografia); su device il peso equivalente è
quello di default.

**Perché.** Un carattere per le cifre era il cuore di _Insegna_ e di _Estratto_, e sarebbe stato
possibile senza build EAS — `expo-font` è già autolinkata. Scartando quelle due direzioni cade anche
la ragione per introdurlo: in _Lastra_ il carattere non porta identità, la porta la gerarchia. Le
due regole tipografiche che contano restano quelle che ci sono già: `numeric` (cifre tabulari) su
ogni importo e `tightTitle` sopra i 28px.

### 3 · Nessun modulo nativo nuovo, di nuovo

**Decisione.** Il tastierino è una griglia di `Pressable`, i capitoli un `useState`, la modalità
modifica un booleano. Nessuna animazione di apertura dei gruppi.

**Perché.** È la sesta volta che il progetto rifiuta un modulo nativo per un gesto o un'animazione —
dopo il foglio dei gruppi, il selettore di date, la griglia dei giorni, il riordino della dashboard
e il trascinamento dei widget. La coerenza qui ha un valore misurabile: una sola development build
installata copre tutto il codice scritto.

## Nuova spesa (decisioni 4–9)

### 4 · L'importo è la schermata, e il tastierino sta nell'app

**Decisione.** La cifra a 62 punti in cima, il tastierino sempre visibile sotto, il salva in fondo.
L'importo resta un `TextInput` con `showSoftInputOnFocus={false}`, non un `Text`.

**Perché.** Con la tastiera di sistema il salva finisce sotto la tastiera e la schermata va scorsa;
con il tastierino nell'app le due cose che servono sempre — la cifra e il salva — stanno insieme a
schermo. Resta un `TextInput` perché un `Text` perderebbe l'annuncio di campo editabile, e con esso
l'unico modo di sapere, con TalkBack, che quella cifra si può cambiare.

### 5 · Il tasto decimale scrive il separatore della lingua, non una virgola

**Decisione.** Il primo tasto dell'ultima riga scrive `numberFormat().decimal`.

**Perché.** In inglese il separatore decimale è il punto. È la stessa trappola che lo Step 39 ha già
chiuso sul separatore di raggruppamento in `ExpenseForm` — questa volta va chiusa prima di scriverla.

> **Correzione dello Step 49.** Questa decisione diceva che un tasto fisso a «,» renderebbe
> `parseAmount` «sempre nullo». Verificato contro `packages/core/src/model/money.ts`: non è vero —
> `parseAmount` sostituisce la prima virgola con un punto, quindi in inglese `12,50` dà 1250
> centesimi senza protestare. La decisione resta, per due ragioni diverse e più serie: in inglese la
> virgola separa le **migliaia**, quindi `12,50` si legge a schermo come dodicimilacinquanta mentre il
> core lo intende 12,50; e `1,234` — milleduecentotrentaquattro per chi lo scrive — `parseAmount` lo
> rifiuta davvero, perché dopo il separatore conta tre cifre. Nessuno dei due dà un errore nel momento
> in cui si preme il tasto.

### 6 · Ciò che la tastiera impediva, ora lo impedisce una funzione con dei test

**Decisione.** `applyKey(text, char)` in `features/expenses/amount-pad.ts`, con i test.

**Perché.** Il secondo separatore decimale, il terzo decimale e lo zero iniziale ripetuto li
impediva `keyboardType="decimal-pad"`. Togliendola, senza questa funzione il campo mostrerebbe
`1,2,3` e l'errore comparirebbe solo al salvataggio. Una validazione a valle non basta: il difetto è
che la cifra sbagliata si può _scrivere_.

### 7 · Tre gruppi, uno aperto per volta

**Decisione.** «Chi paga e come si divide», «Categoria», «Dettagli» — `useState<GroupKey | null>`.
Aprendone uno l'importo scende da 62 a 38 e il tastierino si smonta; il salva non si muove.

**Perché.** Con due gruppi aperti il salva scende sotto la piega e la schermata torna quella densa
di prima. L'importo non sparisce del tutto perché è il numero che si sta decidendo mentre si
scelgono le quote.

> **Correzione dello Step 50.** Questa decisione diceva «da 62 a 28». Il mockup, in tutti e due gli
> artboard a gruppo aperto, usa **38** (`letter-spacing: −1,2`), ed è la misura entrata nel codice:
> 28 è `fontSize.xl`, e a quella misura la cifra smetterebbe di essere il soggetto della schermata
> proprio mentre si decidono le quote che la dividono. Nessuna delle due misure è andata in
> `fontSize`: non sono gradini della scala ma i due capi di una transizione, e stanno in
> `ExpenseForm.tsx` come costanti.

### 8 · La riga chiusa porta il valore, non un segnaposto

**Decisione.** «Paghi tu · metà e metà», «Casa», «Oggi · facoltativi». La parte che porta un valore
in `text` o `textMuted`; solo il segnaposto in `textFaint`. Le frasi sono funzioni con dei test,
accanto a `extraSummary`.

**Perché.** È la regola che `extraSummary` già applica alla tendina di oggi, estesa a tutti e tre i
gruppi: nascondere campi _compilati_ dietro una riga muta è il modo in cui i dati si perdono senza
che nessuno se ne accorga. Il commento in `tokens.ts` — «testo terziario, mai per il contenuto» —
vale esattamente qui: un riassunto a 2,1:1 di contrasto _è_ una riga muta.

> **Aggiunta dello Step 50.** Le tre funzioni tornano dei **pezzi** con un tono, non una stringa: la
> regola non è _cosa_ si scrive ma che `textFaint` tocchi solo ai segnaposto, e una stringa sola non
> la può esprimere. E c'è un quarto tono che il piano non prevedeva, `danger`: chiudere un gruppo può
> nascondere uno stato che **spegne il salva** — quote libere che non quadrano — e lì il riassunto
> deve dirlo, con la frase di `describeGap`. È una conseguenza dell'apribilità che si vede solo
> scrivendo il codice.

### 9 · Data e Nota entrano in «Dettagli»

**Decisione.** Perdono la card propria e diventano le prime due righe del terzo gruppo, sopra
Negozio e Tag. La data resta non modificabile.

**Perché.** Erano l'unico blocco a non essere né soldi né facoltativo, e occupavano una card intera
per due righe che si toccano di rado. Il riassunto chiuso continua a dire la data, quindi
l'informazione non si perde. La data non diventa toccabile perché un selettore vuole
`@react-native-community/datetimepicker`, cioè una build nuova — e una riga che non finge di essere
toccabile è più onesta di un campo che lo finge.

> **Aggiunta dello Step 50.** Restava fuori dal piano `onDelete`, che esiste solo in modifica. Nella
> barra in fondo accanto al salva avrebbe fatto due bottoni nello spazio del tastierino, e messo
> un'azione distruttiva a un pollice da quella che si tocca ogni volta: è rimasta **dentro lo
> scorrimento**, sotto la card dei gruppi.

## Grafici (decisioni 10–15)

### 10 · Tre capitoli, e «Abitudini» è un insieme che esisteva già

**Decisione.** I sedici widget si dividono in **Mese** (10), **Abitudini** (3) e **Fra di voi** (3).
Il capitolo è una proprietà del widget, dichiarata come `Record<WidgetId, Chapter>`.

**Perché.** «Abitudini» non è un raggruppamento inventato: è _esattamente_ l'insieme dei grafici che
leggono una finestra ancorata e non il periodo scelto — quelli che oggi si portano dietro, ciascuno,
la stessa nota di scuse. La nota sale all'intestazione del capitolo e si scrive una volta sola.
`Anticipato e a carico` resta in «Fra di voi» e tiene la sua, perché nel suo capitolo è l'unico
ancorato.

> **Correzione dello Step 51.** «La stessa nota di scuse» non era la stessa: `weekdays` aveva quella
> vera («sugli ultimi dodici mesi, non sul periodo scelto»), `months` ne aveva una **diversa e
> condizionale** («i mesi sono interi, anche quando il periodo scelto è più corto»), e `year` non ne
> aveva nessuna — lo diceva il sottotitolo. Il risultato è quello previsto, una nota sola sopra il
> capitolo, ma sono spariti **due** testi e non tre copie di uno. Con loro è sparito
> `startsAtMonthStart()` in `period.ts`, rimasto senza chiamanti.
>
> **Due scelte che la decisione non copriva.** Le tre pillole stanno **sopra tutti i widget**, non
> sotto il totale come nel mockup: `total` è un widget del capitolo «Mese», e disegnarlo sopra il
> selettore che decide quali widget si vedono lo renderebbe l'unico a non obbedirgli. E il widget del
> saldo è stato rinominato da «Fra di voi» a **«Chi deve a chi»**: era il suo titolo _ed_ è il nome
> del capitolo che ora lo contiene. Il `Record` e non un campo opzionale: così TypeScript pretende una voce per ogni id, e un
> widget nuovo non compila finché non si è deciso dove vive. Con un campo opzionale finirebbe in
> silenzio in nessun capitolo, cioè invisibile.

### 11 · Si compone dentro i Grafici, non in un'altra schermata

**Decisione.** L'icona a griglia muta diventa un «Modifica» scritto. In modifica ogni grafico
continua a disegnarsi al 45% di opacità, con su/giù e la × sopra; in fondo il cassetto «Non
mostrati · N» come pillole da rimettere con un tocco. `app/dashboard.tsx` sparisce. Scartata
l'alternativa — un selettore a sé con miniature dei grafici (turno 2c).

**Perché.** La composizione non era chiara per tre ragioni, e due sono di collocazione: si componeva
in una schermata e si guardava in un'altra, quindi l'effetto non si vedeva mentre lo si decideva; e
l'elenco dei widget _tolti_ non esisteva in nessun posto — l'unico modo di vederli era il selettore,
dove una riga spenta si distingue da una accesa per la posizione di un interruttore. Comporre in
posto risolve entrambe. Il selettore con le miniature (2c) risolveva solo la terza ragione — i nomi
astratti — e a un costo maggiore: sedici miniature da disegnare e mantenere accanto a sedici grafici
veri.

### 12 · `moveWidget` va riscritta, non riusata

**Decisione.** Nasce `moveWithin(layout, id, delta, chapter)`, che scambia fra i widget _visibili
dello stesso capitolo_. `moveWidget` si cancella con il suo unico chiamante.

**Perché.** Il commento attuale motiva lo scambio sull'elenco _intero_, spenti compresi, con «è
l'elenco che si sta guardando mentre si riordina». Nel selettore era vero. In modalità modifica si
guarda un capitolo, e solo i suoi widget accesi: con la regola di oggi la freccia sposterebbe la riga
di un posto senza che a schermo cambi niente, e a quel punto sembra rotta. **È la stessa ragione che
portava alla regola opposta**, applicata a una schermata diversa — e va scritta accanto alla
funzione, o al prossimo lettore sembrerà un'incoerenza.

### 13 · Il contenuto in modifica non è premibile

**Decisione.** In modalità modifica il contenuto di ogni widget va avvolto in una `View` con
`pointerEvents="none"`.

**Perché.** A opacità 0,45 il widget resta montato e i suoi `Pressable` restano attivi: toccare una
barra dei mesi cambierebbe il periodo _mentre si compone_, e toccare una cella della heatmap
scriverebbe un giorno. È il prezzo di tenere il contenuto vero a schermo, ed è un prezzo di una riga.

### 14 · La × che rimuove è `danger`, non `expense`

**Decisione.** `colors.danger` (#FF6B6B) e non `colors.expense` (#F06595).

**Perché.** `tokens.ts` li definisce come due cose diverse: _uscite di denaro_ e _azioni
distruttive_. Su una schermata il cui soggetto sono i soldi, il rosa di `expense` si legge come un
importo. Il precedente giusto è `ListRow tone="danger"` in `tu.tsx`. I due colori sono vicini a
vista: è proprio per questo che la distinzione va tenuta dove è dichiarata, cioè nei nomi.

### 15 · `/dashboard` resta come redirect per un ciclo

**Decisione.** Il file diventa `<Redirect href="/stats" />` e si cancella al ciclo dopo. Il formato
salvato in `app_meta` non cambia: nessuna migrazione.

**Perché.** expo-router persiste l'ultima rotta: chi riapre l'app dopo l'aggiornamento con
`/dashboard` come stato salvato deve arrivare da qualche parte. È la procedura già usata per
`settings.tsx` al [passo 4 del redesign](visualdesign.md#45-tu--profilo--impostazioni-stile-registro).
Il layout salvato si rilegge com'è perché il capitolo è una proprietà del codice, non un dato.

---

## Decisioni prese (riepilogo)

| Ambito                           | Scelta                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Direzione visiva                 | **Lastra** — stessi token, gerarchia rifatta. Scartate Insegna ed Estratto            |
| Tipografia                       | Nessun font nuovo. Restano `numeric` e `tightTitle`                                   |
| Moduli nativi                    | **Nessuno nuovo.** Tastierino, capitoli e modalità modifica sono JS puro              |
| Importo in Nuova spesa           | Tastierino in-app, `TextInput` con `showSoftInputOnFocus={false}`                     |
| Tasto decimale                   | Scrive `numberFormat().decimal`, non una virgola fissa                                |
| Validazione della cifra digitata | `applyKey` in `amount-pad.ts`, non il solo `keyboardType`                             |
| Struttura del form               | Tre gruppi apribili, uno alla volta; il salva non si muove                            |
| Riassunto dei gruppi chiusi      | Porta il valore vero, non un segnaposto                                               |
| Data e Nota                      | Entrano nel gruppo «Dettagli»; la data resta non modificabile                         |
| Widget dei Grafici               | Tre capitoli — Mese (10), Abitudini (3), Fra di voi (3) — `Record<WidgetId, Chapter>` |
| Composizione dei Grafici         | **In loco** (2b): «Modifica» nei Grafici stessi. Scartato un selettore a sé (2c)      |
| Riordino dei widget              | `moveWithin` per capitolo, sostituisce `moveWidget`                                   |
| Interazione in modalità modifica | Contenuto sotto `pointerEvents="none"`                                                |
| Colore della × di rimozione      | `colors.danger`, non `colors.expense`                                                 |
| `app/dashboard.tsx`              | Redirect a `/stats` per un ciclo, poi eliminato                                       |

## Step

Tre step su quattro sono nel codice. Prosegue la numerazione globale da 49, e vale la stessa regola
delle altre serie: **uno step per sessione**.

| Step                                         | Stato | Cosa contiene                                                                                                           |
| -------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 49 — Il tastierino in-app per l'importo      | ✅    | `TextInput` senza tastiera di sistema, `amount-pad.ts` con `applyKey`, tasto decimale per lingua (decisioni 4, 5, 6)    |
| 50 — I tre gruppi apribili della nuova spesa | ✅    | `useState<GroupKey \| null>`, riassunto col valore vero, Data/Nota in «Dettagli» (decisioni 7, 8, 9)                    |
| 51 — I capitoli dei grafici                  | ✅    | `Record<WidgetId, Chapter>`, i sedici widget divisi in Mese/Abitudini/Fra di voi (decisione 10)                         |
| 52 — La composizione in loco                 | ⬜    | «Modifica» nei Grafici, `moveWithin`, `pointerEvents="none"`, × `danger`, redirect di `dashboard.tsx` (decisioni 11–15) |

## Resta aperto

Quattro punti discussi nei mockup e non decisi in questo giro:

- **Il default dei sedici widget accesi.** Con i capitoli, «Mese» ne mostra dieci: è ancora molto da
  scorrere. Ridurre il default contraddirebbe la ragione scritta in `layout.ts` («una sottrazione
  fatta d'ufficio a chi aggiorna»), che però era stata scritta quando la schermata era una lista
  sola. Va deciso, non ereditato.
- **Home spese e selettore gruppi.** Non ridisegnate in questo giro. In _Lastra_ cambierebbero poco
  — la home è già la schermata più curata — ma «un solo numero grande per schermata» andrebbe
  verificato anche lì.
- **Tema chiaro.** Fuori scope, come nel redesign precedente. I token nuovi non ce ne sono, quindi
  `lightPalette` non va toccata.
- **Le altre funzionalità candidate.** Spese ricorrenti, budget in home, ricerca nella lista, swipe
  sulla riga, foto dello scontrino, insight testuali: nessuna scelta in questo giro. La sola entrata
  è la spesa rapida.

## Cosa non cambia

- `packages/core` — nessuna modifica. Nessun calcolo nuovo: i capitoli sono un dato di
  presentazione, non un'aggregazione.
- Lo schema Yjs (`state/schema.ts`) e il formato di `app_meta` — invariati.
- `darkPalette`, l'accento, i semantici e i colori di categoria — invariati. `lightPalette` resta
  fuori scope.
- Sync, crypto, relay, backup, export, azzeramento — invariati, come nel redesign precedente.
