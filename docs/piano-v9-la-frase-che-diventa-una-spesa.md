# JuTrack — Piano v9: una frase diventa una spesa, una domanda diventa un grafico

> Punto d'ingresso del progetto: [STATO.md](STATO.md). **Da dove viene questo piano:** una
> conversazione di analisi del 15 settembre 2026 su come rendere l'app diversa da quelle già sul
> mercato, più un check a freddo del codice che tocca. Scritto il 15 settembre 2026.
>
> **Occupa gli Step 67, 68 e 70**, uno per sessione. I numeri sono già scritti in
> [registro.md](registro.md). **Il 69 non c'è, ed è voluto:** era stato assegnato alla categoria
> suggerita dal negozio, ritirata dal piano il 15 settembre 2026 (l'ultima voce di «cosa NON fare»).
> Vale la regola 1 del registro — _un numero ritirato resta bruciato_ — la stessa che tiene fuori
> uso il 48.
>
> **Ogni misura e ogni riferimento qui sotto è stato letto nel codice**, non dedotto. È la regola
> operativa nata dagli errori del piano v6, che aveva sbagliato il perché e il quanto su tre
> decisioni su quindici.
>
> **Questo piano non contiene un solo byte che esca dal telefono.** L'analisi da cui nasce
> immaginava di far leggere la frase a un modello linguistico; il codice ha detto che nove frasi su
> dieci non ne hanno bisogno, perché le parole che contano il gruppo le conosce già. La rete — con
> la chiave da custodire, il tetto di spesa, la riga nuova nel modello di minaccia e la scheda
> _Data safety_ da aggiornare — resta un piano successivo, **e questo piano è ciò che lo rende
> facoltativo**.

## Contesto

Due problemi, tutti e due in «Nuova spesa», e sono lo stesso problema visto da due lati.

1. **La cifra è veloce, tutto il resto no.** Il tastierino dello Step 49 ha risolto l'importo: si
   digita e si salva senza scorrere. Ma negozio, categoria, chi ha pagato e com'è divisa stanno in
   tre righe che si aprono una per volta (decisione 7 del [piano v6](piano-v6-spesa-rapida-e-grafici-componibili.md)),
   e una spesa che le usa tutte costa sei tocchi in più della stessa spesa detta a voce in quattro
   parole.
2. **Il vocabolario si sceglie, e sceglierlo è più lento che scriverlo.** Gli Step 58 e 59 hanno
   dato al gruppo un elenco di negozi e tag da toccare. Con dieci voci è comodo; con quaranta, la
   pillola giusta si cerca — mentre chi scrive «esselunga» quella parola ce l'ha già in testa.

3. **Nei Grafici la domanda si compone, non si fa.** Il periodo si sceglie fra sei preset e i cinque
   filtri stanno in un foglio: per arrivare a «quanto ho speso al supermercato quest'estate» si
   toccano un preset, due date, una categoria e un negozio, in quattro posti diversi, mentre la
   domanda in testa era già una frase.

Il rimedio è uno solo per tutti e tre: **una riga di testo che porta tutti i campi insieme**, e una
grammatica che li riconosce senza chiedere niente a nessuno. I primi due sono la stessa frase
scritta per creare; il terzo è la stessa frase scritta per chiedere, e sotto ha lo stesso
vocabolario.

## La cosa che il codice sapeva già (decisione 0)

**Decisione.** Il pezzo difficile è già scritto, e sta in `packages/core`. La grammatica non
interpreta numeri, non decide quando due parole sono la stessa parola, non fa aritmetica sui giorni
e non calcola quote: **chiama ciò che c'è** e si limita a dire quale pezzo di frase riguarda quale
campo.

**Perché.** Con file e righe:

| Serve…                                              | Esiste già                                                                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| leggere «12,50» e rifiutare «12,505»                | `parseAmount` — [`model/money.ts:38`](../packages/core/src/model/money.ts#L38)                                                                                               |
| sapere che `Esselunga` ed `esselunga ` sono uguali  | `tidy`, `storeKey`, `tagKey` — [`insights/naming.ts:24`](../packages/core/src/insights/naming.ts#L24)                                                                        |
| l'elenco delle parole che il gruppo usa davvero     | `knownStores`/`knownTags` ([`naming.ts:94`](../packages/core/src/insights/naming.ts#L94)) e `useVocabulary` ([`state/hooks.ts:122`](../apps/mobile/src/state/hooks.ts#L122)) |
| «ieri», «venerdì», «il 3»                           | `addDays`, `dayOfWeek` — [`insights/calendar.ts:25`](../packages/core/src/insights/calendar.ts#L25)                                                                          |
| trasformare «a metà» in quote che tornano           | `splitEvenly`, `splitByWeights` — [`money.ts:163`](../packages/core/src/model/money.ts#L163), già chiamate da `buildSplit` dentro il form                                    |
| una tabella di parole italiane iniettabile dal core | il precedente è `ITALIAN_QUERY_STRINGS` in [`insights/query.ts`](../packages/core/src/insights/query.ts)                                                                     |
| un foglio dal basso senza moduli nativi             | `Modal` di React Native — [`GroupSwitcherSheet.tsx:21-27`](../apps/mobile/src/features/groups/GroupSwitcherSheet.tsx#L21-L27)                                                |

**Il commento che questo piano prende alla lettera.** La docstring di
[`ExpenseForm.tsx:114`](../apps/mobile/src/features/expenses/ExpenseForm.tsx#L114) dice:
_«La spesa si detta a voce così ("ventiquattro e cinquanta") e finisce lì nove volte su dieci»_.
Era una metafora per giustificare l'importo grande in cima. Questo piano la rende vera per
davvero — **scritta**, non detta: la dettatura vorrebbe un modulo nativo, la scrittura no.

**Serve una build EAS?** **No, per nessuno dei tre step.** Non entra alcun modulo nativo: è l'ottava
volta che il progetto lo rifiuta — dopo il foglio dei gruppi, il selettore di date, la griglia dei
giorni, il riordino della dashboard, il tastierino, i capitoli dei grafici e la griglia dello Step 58. Tutto e tre gli step arrivano al telefono in test chiuso **via etere**, e vale la regola di
[versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md): **`version` in `app.json` resta
invariata**, perché entra nell'impronta della `runtimeVersion` e alzarla impedirebbe
all'aggiornamento di arrivare, in silenzio.

---

## La pipeline, su una frase vera

Prima delle decisioni, il meccanismo. La frase è

```
25 spesa esselunga ieri metà a te
```

e attraversa sei riconoscitori in quest'ordine, ognuno dei quali **consuma** i caratteri che ha
capito, così il successivo non li rilegge:

| #   | Riconoscitore | Cosa cattura qui | Come                                                           |
| --- | ------------- | ---------------- | -------------------------------------------------------------- |
| 1   | importo       | `25`             | l'unico numero nudo rimasto, passato a `parseAmount`           |
| 2   | data          | `ieri`           | parola del lessico → `addDays(oggi, -1)`                       |
| 3   | persone       | `te`             | pronome, risolto solo perché il gruppo ha due membri           |
| 4   | divisione     | `metà a`         | parola del lessico → `SplitMode` `equal`                       |
| 5   | negozio e tag | `esselunga`      | la chiave `storeKey('esselunga')` è nel vocabolario del gruppo |
| 6   | categoria     | `spesa`          | il nome di una categoria esistente                             |
| —   | nota          | _(niente)_       | tutto ciò che resta, ripulito con `tidy`                       |

L'esito è una **bozza**: importo 2500, data di ieri, categoria Spesa, negozio «Esselunga» (nella
grafia del vocabolario, non in quella digitata), divisione `equal`. Nessuna scrittura, nessuna rete,
qualche decina di microsecondi.

Su `cena con i suoi 40` la stessa pipeline cattura solo l'importo e mette `cena con i suoi` nella
nota — che è comunque più di quanto si sarebbe scritto a mano in quel tempo. **È il caso normale,
non il fallimento.**

---

## Le decisioni

### 1 · La grammatica sta in `packages/core/src/parse/`, accanto a `insights/` e non dentro

**Decisione.** Un modulo nuovo di primo livello nel core, riesportato da
[`packages/core/src/index.ts`](../packages/core/src/index.ts) con una riga come gli altri sette.

**Perché.** Tre ragioni, in ordine di forza. Primo: gli serve `parseAmount` dal modello, `storeKey`
e `tidy` da `naming`, `addDays` da `calendar` — sta dove stanno le cose che chiama. Secondo: è
**tutto logica che può essere sbagliata**, cioè esattamente ciò che il progetto tiene fuori dai
componenti perché i test dell'app non caricano `react-native` (la regola è scritta in
[`extra-fields.ts:8-11`](../apps/mobile/src/features/expenses/extra-fields.ts#L8-L11), in
`split-text.ts` e in `choices.ts`). Terzo: **non dentro `insights/`**, perché `insights` risponde
alla domanda «che numero esce dalle spese che esistono» — è un'aggregazione in lettura, e il suo
commento d'apertura ([`query.ts:7-11`](../packages/core/src/insights/query.ts#L7-L11)) è tutto sul
costo di scandire la lista. Qui la direzione è opposta: da un testo si propone una spesa che **non
esiste ancora**, e non si legge nessuna lista se non il vocabolario.

**Vincolo.** `parse/` non importa `react-native` né `i18next` — la regola dello Step 0, ribadita nel
commento di [`money.ts`](../packages/core/src/model/money.ts) sul perché il formato dei numeri
arriva come parametro. E da `insights/` importa soltanto `naming` e `calendar`: se un giorno gli
servisse `query` o `breakdown`, vuol dire che sta facendo il mestiere sbagliato.

### 2 · La frase non inventa niente: negozi, tag e categorie si riconoscono solo se il gruppo li conosce già

**Decisione.** Un riconoscitore propone un negozio **solo se** `storeKey(parola)` è già nel
vocabolario o fra i negozi usati; idem per i tag con `tagKey`, idem per le categorie sul nome. Una
parola sconosciuta non diventa un negozio nuovo: finisce nella nota.

**Perché.** [`naming.ts:10`](../packages/core/src/insights/naming.ts#L10) lo dice del campo di
testo: _«Senza questo, "top negozi" diventa un elenco di refusi»_ — e il
[piano v7](piano-v7-data-e-vocabolario-del-gruppo.md) lo ripete come terzo problema, _«una casella
in cui si digita è il modo più rapido per trasformare "top negozi" in una classifica di refusi»_,
che è la ragione per cui lo Step 59 ha fatto il catalogo. Un parser che battezza un
negozio a ogni parola che non riconosce farebbe quel danno **più in fretta di un umano**, in
silenzio, e i grafici per negozio sono la cosa che ci perde.

**Vincolo.** Nessuna bozza può contenere un negozio o un tag la cui chiave non esisteva già prima
della frase. Il test che lo protegge è una frase piena di parole mai viste che produce una bozza con
`store` vuoto e tutto nella nota.

### 3 · Ogni campo capito si porta dietro i caratteri da cui viene

**Decisione.** La bozza contiene un elenco di `marks`: per ogni campo riempito, l'intervallo di
caratteri della frase originale che l'ha prodotto.

**Perché.** Serve a tre cose diverse, e nessuna delle tre si può aggiungere dopo senza rifare il
tokenizzatore. **A schermo:** il foglio dello Step 68 evidenzia la frase mentre la si scrive, ed è
così che si impara la sintassi senza un manuale da leggere. **Nei test:** si asserisce _quali_
caratteri hanno prodotto un campo, quindi un riconoscitore ingordo — che si mangia anche la parola
dopo — fa fallire un test invece di nascondersi dietro un risultato giusto per caso. **Domani:** una
bozza senza importo e con un avanzo lungo è una frase che la grammatica non ha capito, ed è
**l'unico modo onesto di misurare** se valga la pena chiedere a un modello, invece di deciderlo a
naso.

**Vincolo.** Gli span sono offset sul **testo originale**, non su una versione ripulita, e nascono
solo su confini di token: così non spezzano mai una coppia surrogata, e l'evidenziazione combacia
con ciò che l'utente ha scritto anche quando ha battuto due spazi.

### 4 · Un numero nudo è un importo; una data ha sempre un marcatore

**Decisione.** Un numero senza contorno è l'importo. Una data si riconosce solo con un marcatore:
una parola del lessico (`oggi`, `ieri`, `l'altro ieri`, i sette giorni, i dodici mesi), una barra
(`3/9`), o una preposizione seguita da un numero fino a 31 (`il 3`). Se restano **due** numeri nudi
non consumati, l'importo **non si compila** e il foglio lo dice.

**Perché.** È l'unica ambiguità che renderebbe imprevedibile tutto il resto, e l'imprevedibilità è
peggio dell'assenza: chi non si fida di ciò che compare smette di usarlo. La regola «il marcatore
distingue» si spiega in una riga a chi guarda, cosa che «vince il numero più grande» non fa. E il
non compilare è sempre disponibile: sotto c'è il tastierino di sempre.

**Vincolo.** **Mai una data nel futuro.** «venerdì» è il venerdì appena passato; una data futura è
quasi sempre una lettura sbagliata, e una spesa datata domani entra nei grafici del mese senza che
nessuno l'abbia chiesto.

### 5 · «te» esiste solo in un gruppo di due

**Decisione.** I pronomi `io`/`me`/`mio` valgono sempre e risolvono a `myMemberId`. `te`/`tu`/`tuo`
si risolvono **solo se il gruppo ha esattamente due membri**; con tre o più restano nella nota e non
compilano niente. I nomi propri dei membri, invece, valgono sempre.

**Perché.** [`threat-model.md`](threat-model.md) dice cosa protegge l'app: _«le spese personali di
due persone»_. In un gruppo di due «te» è l'altro, senza ambiguità; in uno di quattro è chiunque, e
un `paidBy` sbagliato produce saldi sbagliati che si scoprono settimane dopo — è la stessa ragione
per cui l'invariante dello split è verificata in scrittura
([`model/types.ts:22-27`](../packages/core/src/model/types.ts#L22-L27)).

**Vincolo.** Con `members.length > 2` nessun `paidBy` e nessuna divisione si deducono da un pronome.

### 6 · La bozza non è una spesa, e non tocca il documento

**Decisione.** `parseExpense` restituisce una struttura in memoria. Entra nel vault solo passando
per il form e il suo `onSubmit`, come qualunque spesa scritta a mano.

**Perché.** La normalizzazione di negozio e tag avviene in un punto solo — `VaultStore` in scrittura
(Step 23), come dichiara il commento di
[`ExpenseForm.tsx:51-55`](../apps/mobile/src/features/expenses/ExpenseForm.tsx#L51-L55): _«Non
normalizzati qui: lo fa VaultStore, che è l'unico punto da cui il testo entra nel documento»_. Una
seconda porta d'ingresso sarebbe una seconda regola da tenere allineata alla prima. E poi: una
lettura sbagliata che si salva da sola è molto peggio di una che si vede prima.

**Vincolo.** `parse/` non conosce `VaultStore`, e il foglio dello Step 68 non chiama `addExpense`.

### 7 · Il form si semina con una prop nuova, `draft`, e non riusando `initial`

**Decisione.** `ExpenseFormProps`
([riga 78](../apps/mobile/src/features/expenses/ExpenseForm.tsx#L78)) guadagna `draft?:
ExpenseDraft`. La precedenza negli inizializzatori di stato (righe 155–203) diventa `initial` →
`draft` → default di oggi.

**Perché.** `initial?: Expense` significa **«spesa in modifica»**, e non è un dettaglio di nome:
accende `onDelete`, e soprattutto porta con sé la regola della valuta scritta alle
[righe 60-65](../apps/mobile/src/features/expenses/ExpenseForm.tsx#L60-L65) — _«su una spesa in
modifica è la sua, non quella di adesso»_. Fabbricare un `Expense` finto per seminare il form
vorrebbe dire inventare un `id`, un `createdAt` e una valuta, e far credere al form di star
modificando qualcosa che non esiste. Due prop distinte, mutuamente esclusive per costruzione.

**Vincolo.** Senza `draft`, ogni stato iniziale resta **identico a oggi**. I test del form non si
toccano: se uno va cambiato, la semina è stata fatta nel posto sbagliato.

### 8 · Alla schermata della spesa viaggia la frase, non la bozza

**Decisione.** Il foglio passa il testo a `/expense/new` come parametro di rotta; è la schermata a
rifare il `parseExpense` e a passarlo al form.

**Perché.** Una rappresentazione sola, e viva: serializzare la bozza nell'URL vorrebbe dire avere
due versioni della stessa cosa che possono divergere — e la seconda invecchia appena si aggiunge un
campo. Rifare l'analisi costa microsecondi e non tocca il disco. In più la schermata può mostrare la
frase di partenza, che è ciò che serve quando qualcosa non è stato capito.

**Vincolo.** Il parametro passa da `encodeURIComponent`; una frase con `&` o `#` non deve
troncare la rotta.

### 9 · Solo italiano, e il lessico è un parametro

**Decisione.** `ITALIAN_LEXICON` è il default esportato; il tipo `Lexicon` è pubblico; l'inglese è
un file che ancora non esiste. Il punto d'ingresso nell'app compare **solo quando la lingua è
l'italiano** — nascosto, non rotto.

**Perché.** È la stessa forma di `QueryStrings`/`ITALIAN_QUERY_STRINGS` in `insights/query.ts`, che
il progetto ha già scelto una volta. Una grammatica **è** una lingua: spedire un lessico inglese
scritto senza averlo mai usato in inglese significherebbe promettere una superficie mai provata, e
la scheda del Play Store non ha bisogno di promesse in più. Costo per aggiungerlo, il giorno che
serva: un file e i suoi test.

**Vincolo.** Nessuna stringa italiana finisce nel codice dei riconoscitori: stanno tutte nel
lessico, o il file inglese non basterà ad aggiungere l'inglese.

### 10 · La stessa grammatica risponde a due domande, e sono due funzioni

**Decisione.** `parse/` espone **due** punti d'ingresso sopra un tokenizzatore solo:
`parseExpense(text, context)` per la spesa da creare, `parseQuery(text, context)` per la domanda da
fare ai Grafici. Membri, categorie, negozi e tag si riconoscono con gli stessi riconoscitori; data,
numeri e divisione no.

**Perché.** Le parole del gruppo sono le stesse in tutte e due le frasi, e duplicarne il
riconoscimento vorrebbe dire due elenchi di sinonimi che divergono. Ma **un numero vuol dire due
cose diverse**: in «25 spesa esselunga» è l'importo della spesa; in «spesa sopra i 25» è una soglia,
cioè `minCents` — lo stesso numero, due campi opposti. Una funzione sola con un interruttore
`modo: 'spesa' | 'domanda'` sarebbe la stessa cosa scritta peggio, con l'interruttore da passare
giusto a ogni chiamata.

**Vincolo.** Il tokenizzatore, il lessico e i riconoscitori di persone e parole sono **condivisi per
davvero**: se `parseQuery` ne riscrive uno, la condivisione è fallita e lo dice il test che dà la
stessa frase alle due funzioni aspettandosi gli stessi negozi riconosciuti.

### 11 · La domanda produce **periodo e filtri**, non un `ExpenseQuery`

**Decisione.** `parseQuery` restituisce `{ period, facets }` — esattamente i due `useState` di
`app/(tabs)/stats.tsx:160-161` — e non la query composta.

**Perché.** La schermata non tiene un `ExpenseQuery`: tiene un `Period` (uno dei sei preset, o
`custom` con due date) e dei `QueryFacets`, e li compone in un `useMemo` alla riga 201. Il `Period`
non è ricavabile all'indietro da `from`/`to`: «questo mese» e «dal 1° al 15» hanno lo stesso
intervallo il 15 del mese, ma il primo è un preset che si muove col calendario e porta l'etichetta
che il chip mostra — `periodPresets()` in [`filters/period.ts`](../apps/mobile/src/features/stats/filters/period.ts).
Restituire la query composta significherebbe buttare via quell'informazione e poi provare a
indovinarla.

**Vincolo.** `QueryFacets` è `Omit<ExpenseQuery, 'from' | 'to'>`
([`filters/facets.ts`](../apps/mobile/src/features/stats/filters/facets.ts)): la frase riempie
quelli e nient'altro. Chi tocca un chip dopo aver scritto la frase deve poter continuare a filtrare
a mano — la frase **imposta** i filtri, non prende il posto della barra.

---

## Step 67 — «il motore della frase»

Nessuna interfaccia. Solo il core e i suoi test.

| File                                 | Cosa                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `packages/core/src/parse/types.ts`   | **nuovo** — `ExpenseDraft`, `DraftMark`, `ParseContext`, `Lexicon` (decisioni 1, 3)     |
| `packages/core/src/parse/lexicon.ts` | **nuovo** — `ITALIAN_LEXICON`: le parole di data, divisione, pronomi, preposizioni (9)  |
| `packages/core/src/parse/tokens.ts`  | **nuovo** — da testo a token **con gli span**, e il registro di ciò che è consumato (3) |
| `packages/core/src/parse/amount.ts`  | **nuovo** — il numero nudo, i marcatori di valuta, la regola dei due numeri (4)         |
| `packages/core/src/parse/dates.ts`   | **nuovo** — parole, `3/9`, `il 3`, mai nel futuro (4)                                   |
| `packages/core/src/parse/people.ts`  | **nuovo** — nomi dei membri, pronomi, divisione (5)                                     |
| `packages/core/src/parse/words.ts`   | **nuovo** — negozio, tag e categoria **a vocabolario chiuso** (2)                       |
| `packages/core/src/parse/draft.ts`   | **nuovo** — `parseExpense(text, context, lexicon?)`: l'ordine dei riconoscitori (4)     |
| `packages/core/src/parse/index.ts`   | **nuovo** — riesporta                                                                   |
| `packages/core/src/index.ts`         | una riga: `export * from './parse'`                                                     |
| `scripts/frase.mts`                  | **nuovo** — `npm run frase -- "…"` stampa la bozza in tabella                           |
| `package.json` (root)                | lo script `frase`, accanto a `prova` e `peer`                                           |

Ogni modulo col suo `.test.ts` accanto, come tutto `insights/`. In più `draft.test.ts` è una
**tabella di frasi vere** — quaranta righe, dalla più secca (`25`) a quella che non si capisce — con
la bozza attesa: è il posto in cui si vede se la grammatica serve, e il posto in cui si aggiunge la
frase che un giorno non funzionerà.

**Esiste già e non si riscrive:** `parseAmount` (`model/money.ts:38`), `tidy`/`storeKey`/`tagKey`
(`insights/naming.ts:24,34,46`), `addDays`/`dayOfWeek` (`insights/calendar.ts:33,25`),
`knownStores`/`knownTags` (`insights/naming.ts:94,99`).

### Il punto che non va dimenticato

**Si tokenizza sul testo originale, non su quello ripulito.** La tentazione è normalizzare prima
(minuscole, spazi collassati) e tokenizzare poi: è una riga in meno e rompe tutto. Gli span
finirebbero a puntare la stringa ripulita, e l'evidenziazione dello Step 68 mostrerebbe i caratteri
sbagliati — **ma solo nelle frasi con due spazi di fila o una maiuscola accentata**, cioè quasi mai
mentre si prova, e sempre a casa di qualcun altro. La forma giusta: i token conservano l'intervallo
originale e ne portano _anche_ la forma ripiegata per il confronto.

### Criterio di «fatto»

**Eccezione dichiarata:** questo step non ha niente a schermo, quindi il gesto non è sul telefono ma
sulla tastiera — ed è comunque un gesto, non «i test passano».

```
npm run frase -- "25 spesa esselunga ieri metà a te"
```

stampa importo `25,00`, data di ieri, categoria `Spesa`, negozio `Esselunga`, divisione `a metà`,
nota vuota. Poi:

```
npm run frase -- "cena con i suoi 40"
```

stampa importo `40,00` e nota `cena con i suoi`, e nient'altro compilato.

---

## Step 68 — «la frase, sul telefono»

| File                                                  | Cosa                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/mobile/src/features/expenses/SentenceSheet.tsx` | **nuovo** — il foglio: un campo, l'anteprima viva, «Continua» (pattern di `GroupSwitcherSheet`)          |
| `apps/mobile/src/features/expenses/sentence.ts`       | **nuovo** — costruisce il `ParseContext`, traduce la bozza in pillole da mostrare                        |
| `apps/mobile/src/features/expenses/sentence.test.ts`  | **nuovo** — la logica sta fuori dal componente: regola di `extra-fields.ts:8-11`                         |
| `apps/mobile/src/features/expenses/ExpenseForm.tsx`   | la prop `draft?` e gli otto inizializzatori che la leggono (decisione 7)                                 |
| `apps/mobile/src/app/(gruppo)/expense/new.tsx`        | legge il parametro di rotta, rifà l'analisi, passa `draft` (decisione 8)                                 |
| `apps/mobile/src/features/expenses/GroupHome.tsx`     | un secondo bottone accanto al FAB di [riga 392](../apps/mobile/src/features/expenses/GroupHome.tsx#L392) |
| `apps/mobile/src/i18n/locales/it.ts` e `en.ts`        | le chiavi nuove in tutte e due — `dictionaries.test.ts` pretende la simmetria                            |

**Esiste già e non si riscrive:** il `Modal` di React Native col fondo che chiude
(`GroupSwitcherSheet.tsx:33-40`), `Chip` per le pillole dell'anteprima, `ModalScreen` per la
schermata della spesa, e tutto il form.

### Il punto che non va dimenticato

**Il `ParseContext` va in un `useMemo` sulle spese, non sulla frase.** `knownStores(expenses)` è una
scansione lineare di tutte le spese del gruppo: costruito nel corpo del componente, rigira **a ogni
tasto premuto**, e su un gruppo con qualche migliaio di spese la scrittura diventa a scatti mentre
tutto sembra funzionare. È lo stesso difetto che `insights/query.ts:7-11` descrive per i grafici —
lì si filtra una volta e si passa il risultato a tutti i widget. Qui: il contesto si costruisce
quando cambiano spese, membri, categorie e vocabolario; la frase ci passa sopra.

### Criterio di «fatto»

Col telefono in mano, in un gruppo che ha già «Esselunga» in elenco e due membri:

1. gruppo aperto → tocca **«Scrivi»** accanto a «Nuova spesa»;
2. digita `25 spesa esselunga ieri metà a te` — **mentre scrivi** le parole riconosciute si
   colorano e sotto compaiono quattro pillole;
3. tocca **«Continua»**: il form si apre con 25,00 € nel numero grande, la riga Dettagli che dice
   «Esselunga», la data di ieri e la divisione a metà;
4. **Salva** → la spesa compare nell'elenco sotto «Ieri», con quei valori;
5. riaprila: è una spesa normale, si modifica e si cancella come tutte le altre.

---

## Step 70 — «la domanda che diventa un grafico»

| File                                                       | Cosa                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/core/src/parse/query.ts`                         | **nuovo** — `parseQuery`: periodo, soglie, filtri (decisioni 10 e 11)                             |
| `packages/core/src/parse/periods.ts`                       | **nuovo** — «questo mese», «ad agosto», «l'anno scorso», «ultimi 7 giorni» → un preset o due date |
| `packages/core/src/parse/index.ts`                         | riesporta `parseQuery`                                                                            |
| `apps/mobile/src/features/stats/filters/QuestionField.tsx` | **nuovo** — il campo sopra la barra dei filtri                                                    |
| `apps/mobile/src/features/stats/filters/question.ts`       | **nuovo** — dal `ParseContext` alla coppia `period`/`facets` da impostare                         |
| `apps/mobile/src/app/(tabs)/stats.tsx`                     | il campo chiama `setPeriod` e `setFacets`: due `setState` che esistono già                        |
| `apps/mobile/src/i18n/locales/it.ts` e `en.ts`             | le chiavi nuove, in tutte e due                                                                   |

**Esiste già e non si riscrive:** tutto il resto della schermata. `applyQuery`, i sedici widget, la
`FilterBar` con i suoi chip, `queryParts` di `@/i18n/query` che scrive le frasi dei filtri, e i sei
preset di `periodPresets()`. La frase **non disegna niente**: imposta due stati, e il resto della
schermata reagisce come se i chip fossero stati toccati a mano.

### Il punto che non va dimenticato

**Una domanda che non si capisce non deve azzerare i filtri di prima.** Il caso è banale e capita
subito: si scrive mezza frase, il parser non ne cava niente, e applicando comunque il risultato la
schermata si svuoterebbe — cioè esattamente ciò che `FilterBar` descrive nel proprio commento: _«un
filtro che non si vede è un filtro che non si sa di avere»_, che a schermata vuota _«si legge come
un guasto dell'app»_. Regola: si applica **solo** ciò che è stato riconosciuto; se non è stato
riconosciuto niente, non si tocca niente, e il campo lo dice.

### Criterio di «fatto»

Col telefono in mano, nel tab Grafici:

1. tocca il campo in cima e scrivi `spesa da esselunga questo mese`;
2. la barra dei filtri si accende con i chip «Questo mese», «Spesa» ed «Esselunga» — **gli stessi**
   che si sarebbero ottenuti dal foglio;
3. il totale in testa e i grafici sotto cambiano di conseguenza;
4. tocca la × su «Esselunga»: il chip se ne va e i grafici si riaprono, cioè la frase ha impostato
   dei filtri veri e non una modalità a parte;
5. scrivi `sopra i 50`: resta il periodo, si aggiunge la soglia.

---

## Cosa questo piano ha deciso di NON fare

- **Ritirato: la categoria suggerita dal negozio**, che era lo Step 69 di questo piano fino al 15
  settembre 2026. Non guardava l'importo — da un importo non si può sapere niente, ed è vero — ma il
  **negozio**: tre spese «Esselunga» già messe in «Spesa» avrebbero fatto comparire «Spesa?» alla
  quarta, da accettare con un tocco. È stata tolta lo stesso, perché è l'unica parte del piano che
  **indovina** invece di riconoscere, e tutto il resto vale senza. Si riapre solo se, usando la
  frase, la categoria risulterà la casella che si compila a mano più spesso. Il numero 69 resta
  bruciato.
- **Rimandato: chiedere a un modello quando la grammatica non capisce.** È il piano successivo, e le
  sue condizioni sono note — un Worker separato da `services/relay` (che è documentato e provato
  come incapace di leggere), un tetto di spesa che renda impossibile una bolletta, una riga nuova
  nella tabella degli avversari di `threat-model.md`, un pannello che mostri il payload esatto prima
  di spedirlo, e la scheda _Data safety_ del Play Console aggiornata. Si riapre quando i `marks`
  dello Step 67 avranno detto **quante** frasi vere restano incomprese: sotto una certa soglia, non
  vale il prezzo.
- **Rimandato: i numeri scritti a parole** («venticinque e cinquanta»). Si digita, non si detta, e
  chi digita scrive `25,50`. Si riapre con la dettatura, che vuole un modulo nativo.
- **Rimandato: la divisione personalizzata dettata** («20 io 5 tu»). Lo split è l'unica cosa il cui
  errore produce saldi sbagliati, e le quote personalizzate hanno già un'interfaccia che le fa
  tornare. Si riapre se le frasi vere lo chiederanno.
- **Rimandato: salvare direttamente dal foglio**, senza passare dal form. Oggi il form è la rete di
  sicurezza che rende accettabile una lettura sbagliata. Si riapre quando l'anteprima avrà
  dimostrato di non sbagliare, e comunque solo per le bozze complete e non ambigue.
- **Rimandato: l'inglese.** Un file di lessico e i suoi test; la condizione è che qualcuno usi
  davvero l'app in inglese.
- **Non si tocca: come il testo entra nel documento.** Resta `VaultStore` in scrittura (Step 23,
  decisione 6). Il parser non normalizza, non deduplica e non scrive.
- **Non si tocca: nessun modulo nativo**, quindi nessuna build EAS — l'ottava volta, con la stessa
  motivazione della decisione 0 del [piano v7](piano-v7-data-e-vocabolario-del-gruppo.md).
- **Non si tocca:** la coda dello Step 41 e le verifiche col telefono del Piano v8 restano aperte
  dove sono, in [STATO.md](STATO.md) e [verifica-sul-telefono.md](verifica-sul-telefono.md). Questo
  piano non le assorbe.

## Riepilogo

| Step | Cosa                                           | Rischio                                                              | Build EAS |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------- | --------- |
| 67   | Il motore della frase, nel core                | Basso: non tocca niente di esistente, solo aggiunge                  | No        |
| 68   | Il foglio, l'anteprima viva e il form seminato | Medio: è l'unico che modifica `ExpenseForm`, che è il cuore dell'app | No        |
| 70   | La domanda scritta nei Grafici                 | Basso: imposta due stati che esistono già, e non disegna niente      | No        |

Baseline di partenza: **1469 test verdi** (723 core + 692 app + 54 relay), `typecheck`, `lint` e
`format:check` puliti, come dichiara [STATO.md](STATO.md) al 13 settembre 2026.
