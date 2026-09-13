# Stato del progetto — punto di partenza

Aggiornato: 2026-09-13 — **il criterio di «fatto» end-to-end è stato soddisfatto**: la mattina del
12 settembre il sync è stato visto funzionare nei due versi con un telefono vero, coi membri e i
saldi giusti, e i due widget si sono popolati con numeri identici a un calcolo indipendente. Tutti e
quattro i piani e il redesign sono nel codice, il quinto è a dodici step su tredici, e la build EAS
che tiene tutto questo è installata.

> **L'app è nel Play Store dal 12 settembre 2026.** Account Play Console aperto, **1.0.0** caricata
> (build `807161bd`, commit `777b958`, versionCode 2) e in **test chiuso con un'altra persona**: il
> profilo sviluppatore non è più un blocco. Restano gli **screenshot** della scheda — l'insegna
> 1024×500 è in `store/` — e il calendario: **12 tester per 14 giorni** che Google chiede a un
> account personale prima della produzione. Oggi i tester sono due.
>
> Da qui in avanti vale [versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md), e la regola
> controintuitiva è una: **un `eas update` si pubblica con `version` invariata**, perché `version`
> entra nell'impronta della `runtimeVersion` e alzarla impedisce all'aggiornamento di arrivare. Il
> binario in test ha impronta `d862b56d…`, **la stessa di `main` oggi**: gli Step 49–60 sono tutti
> JavaScript e possono andare via etere, senza consumare una build.

> **Lo stesso 12 settembre, dopo la verifica su telefono, sono state prese le 15 decisioni del
> [Piano v6](piano-v6-spesa-rapida-e-grafici-componibili.md)**: un secondo giro di redesign, su
> spesa rapida e grafici componibili, da due artifact Claude Design (un mockup a più direzioni e il
> registro delle decisioni). La direzione scelta è **Lastra** — stessi token del redesign chiuso in
> [visualdesign.md](visualdesign.md), gerarchia rifatta — contro le due scartate, **Insegna** e
> **Estratto**. **Il Piano v6 è chiuso: tutti e quattro gli step sono entrati il 13 settembre** — il
> 49 (tastierino in-app per l'importo), il 50 (i tre gruppi apribili), il 51 (i capitoli dei grafici)
> e il 52 (la composizione in loco, con `app/dashboard.tsx` ridotto a un redirect da cancellare al
> ciclo dopo).

> **Lo stesso 13 settembre, chiuso il v6, è stato scritto il
> [Piano v7](piano-v7-data-e-vocabolario-del-gruppo.md): la data della spesa che si sceglie, e tag e
> negozi che diventano un elenco del gruppo.** Non viene da un mockup ma dall'app in mano, come gli
> Step 54–57, e portava tre step — **58, 59 e 60, tutti e tre entrati lo stesso 13 settembre**.
> **Nessuno dei tre ha chiesto una build EAS**: la griglia di giorni che serviva al 58 esisteva già
> dallo Step 27 (`DayGridPicker`), e il commento in `ExpenseForm.tsx` che motivava la data non
> modificabile con un modulo nativo era **superato dal codice stesso**. Il 60 raccoglieva un check
> del repo fatto a freddo, e ne ha chiuse sette voci su otto: l'ottava — la guardia su `paidBy` — è
> stata tentata e ritirata, per una ragione che vale la pena rileggere prima di ritentarla.

> **La sessione del 12 settembre è raccontata in
> [La verifica su telefono](#la-verifica-su-telefono-del-12-settembre-step-41)**, divisa fra ciò che
> ha una prova rileggibile e ciò che è riferito da chi aveva il telefono in mano. Il solo difetto
> trovato è cosmetico: le anteprime dei widget nel selettore di Android sono riquadri vuoti.

> **Il 5 settembre sono entrate le due cose che impedivano di pubblicare, e nessuna delle due
> chiedeva un telefono.** L'**informativa privacy** è in produzione su
> [`/privacy`](https://jutrack-relay.jutrack-relayfrfal.workers.dev/privacy), servita dallo stesso
> Worker di `/j`, in italiano e in inglese; e l'**icona** non è più quella dello scaffold Expo — il
> chevron azzurro con le linee guida di costruzione, mai toccata dal 1° agosto — ma una lente con la
> J di JuJu ritagliata dentro, rigenerabile da un unico sorgente vettoriale. Dettaglio in
> [devlog.md](devlog.md). **Il 41 resta l'unico step scritto che manca**, e la build EAS che lo
> sblocca — che serve anche a guardare l'icona sul telefono — **è stata fatta il 5 settembre stesso
> ed è installata** (vedi il riquadro qui sotto).

> **Gli Step 42 e 43 non vengono da un piano, ma da una rilettura del progetto**, e chiudono i due
> lati dello stesso rischio — perdere i dati. Il **42** dà una via d'uscita a chi la chiave l'ha già
> persa: `/export` produceva una copia integrale del vault che **nessuno sapeva rileggere**, e adesso
> `parseVaultExport` la rilegge e `/importa` la ricostruisce in un gruppo nuovo. Il **43** prova a
> far sì che non la perda: un quarto avviso dice, una volta per gruppo, che la chiave non risulta
> salvata da nessuna parte. Nessuno dei due chiede una build EAS. Dettaglio in
> [devlog.md](devlog.md); il **41** resta l'unico step scritto che manca.

Il quarto — [piano-v4-grafici-e-dashboard.md](piano-v4-grafici-e-dashboard.md),
**Step 23–28** — si è chiuso l'11 agosto con la dashboard componibile, e i sette passi del redesign
sono chiusi da prima ([visualdesign.md](visualdesign.md)). Lo stesso giorno è stato scritto il
**quinto piano**, [piano-v5-notifiche-widget-profilo.md](piano-v5-notifiche-widget-profilo.md) —
notifiche locali, due widget Android, valuta e lingua nel profilo — e ne sono entrati nel codice i
**primi dodici step su tredici**: la valuta di default nel profilo, l'infrastruttura nativa, il
promemoria spese, l'avviso di budget, quello di sincronizzazione ferma, **tutti e due i widget**, il
refresh in background che li tiene vivi, l'**infrastruttura i18n**, la **traduzione EN delle tre
schermate più aperte**, il **formato dei numeri per lingua** e, il 19 agosto, **il resto della
traduzione**: grafici, dashboard, onboarding, pairing, backup, export, import e azzeramento, più
budget/categorie/pareggi del gruppo e la sonda diagnostica. Resta solo la verifica su telefono
(41). Il piano ne aveva dodici: il tredicesimo è lo Step 39, nato dallo Step 38 e inserito in mezzo.

> ✅ **La build EAS che serviva è stata fatta ed è installata, e da qui non c'è più niente di
> bloccato sul telefono.** È del **5 settembre 2026**, profilo `development`, commit
> [`9606e0f`](https://github.com/FRFAL99/JuTrack) — cioè **la punta di `main`**: contiene sia
> l'`updatePeriodMillis: 1800000` dello [Step 36](#il-refresh-in-background-step-36), che finisce
> nell'XML dei due provider dei widget, sia l'**icona nuova** del passo 45. Prima di lei ce n'era
> stata una il **15 agosto** (Step 40), a sua volta mai annotata qui: fino all'11 settembre questo
> documento diceva ancora che l'ultima installata fosse quella dello Step 30, e mandava a rifare
> una build già fatta.
>
> **Non resta un solo pezzo di codice che il telefono non possa eseguire**: la build combacia con
> `main`, quindi Metro serve esattamente ciò che c'è nel binario. Tutto il piano v5 — notifiche,
> widget, refresh in background, lingua, valuta — più l'icona, i due step di robustezza e il
> redesign, sono davanti a un dito che li tocchi.
>
> ```bash
> cd apps/mobile && npx eas-cli build -p android --profile development   # solo se app.json cambia
> ```
>
> **Notifiche e widget sono tutti nel codice**: lo [Step 31](#il-promemoria-spese-step-31), lo
> [Step 32](#lavviso-di-budget-step-32) e lo [Step 33](#la-sincronizzazione-ferma-step-33) per le
> tre notifiche, il [34](#il-widget-del-saldo-step-34), il [35](#il-totale-del-mese-step-35) e il
> [36](#il-refresh-in-background-step-36) per i widget. **Anche la traduzione è tutta nel codice**,
> Step 40 compreso: il prossimo è il **41**, la verifica su telefono.
>
> **Lo Step 37 si è scostato dal piano su un punto, ed è scritto qui perché non si scopra dopo:**
> `expo-localization` **non** è stato installato. Serviva solo a leggere la lingua del telefono al
> primo avvio, è un modulo nativo, e avrebbe reso questo il terzo step a chiedere una build —
> rompendo per giunta l'app sulla build oggi installata. Quella lettura la fa
> `Intl.DateTimeFormat().resolvedOptions().locale`, che su Hermes c'è già, dentro un `try` che
> ripiega sull'italiano. Entrate solo `i18next` e `react-i18next`, entrambe JS puro.
>
> **Fra i primi quattro piani non c'è più uno step scritto da fare: quello che resta è la prova su
> due telefoni veri**, e i criteri di «fatto» di tutti e quattro ci passano in mezzo. Il piano v5 è
> un'aggiunta di prodotto separata e procede in parallelo, uno step per sessione.

Documento di orientamento: cosa è fatto, cosa manca, cosa è bloccato. Per il dettaglio di ogni
passaggio c'è [devlog.md](devlog.md), ma **questo file basta per riprendere il lavoro**.

## Avanzamento

L'elenco completo degli step — numero, titolo, piano di appartenenza, stato e data del devlog —
sta in **[registro.md](registro.md)**, che è anche il posto in cui si legge quale sia il
prossimo numero libero. Qui sotto resta soltanto ciò che una tabella non sa dire.

**Fuori dai piani, lo stesso 13 settembre: lo Step 53** ha ridotto «Tu» a righe che dicono il proprio
valore. Lingua, Valuta, Colore e Avvisi non stanno più tutti aperti — erano tre selettori e quattro
interruttori con altrettante spiegazioni, circa centosessanta righe di schermata — ma in quattro righe
che si aprono in un foglio dal basso (`SettingSheet`). È la **decisione 8 del Piano v6 applicata a una
schermata che quel piano non toccava**: «Tu» era nel turno 1 dell'artifact insieme alle altre due, ma
non era mai diventata uno step. Resta uno **Step 54** per l'intestazione, la card del sync e la
sezione del gruppo — dove serve uno stato nuovo, «Backup della chiave · Mai fatto», che oggi non
esiste.

**Il 13 settembre gli step 49–53 sono stati visti su un telefono vero**, sulla development build
nuova (commit `b9b9593`) — e da lì è nato lo **Step 54**, tre correzioni che nessun ragionamento
avrebbe prodotto: il pallino del sync non lampeggia più a ogni chiamata, «Tu» prende l'intestazione e
la card dell'artifact, la **nota esce da «Dettagli» e diventa il primo campo** della nuova spesa
(contro la decisione 9 del Piano v6: chi registra una spesa la sta anche nominando), e il salva
ancorato in fondo prende la safe area inferiore — **era davvero sotto la barra dei gesti**, difetto
introdotto dallo Step 50 e rimasto invisibile per tre step.

Subito dopo, lo **Step 55** ha portato lo stesso stile nelle schermate di impostazioni che si aprono
da «Tu»: `export`, `backup`, `importa` e la parte secondaria di `azzera` erano card con un titolo in
grassetto e sotto duecento o trecento caratteri, cioè una spiegazione che pesava quanto il comando.
Adesso sono `SectionLabel` più `components/Note.tsx` — 418 caratteri di prosa in meno, senza perdere
niente che serva a decidere. **Non** è stata alleggerita la card rossa «Cosa sparisce» di `azzera`:
è il blocco che deve fermare la mano.

Lo **Step 56** ha chiuso il giro sulla gestione del gruppo: cinque `NavCard` con due o tre righe di
sottotitolo sono diventate cinque `ListRow` sotto una `Note` sola, e **le tre voci che comparivano sia
lì sia in «Tu»** — categorie, backup, export — vivono ora solo nel gruppo, perché sono sue: con due
gruppi aperti «Backup della chiave» dalle impostazioni è una domanda con due risposte. Nel farlo è
emerso che quella schermata **non era tradotta affatto** (zero `t()`, undici stringhe italiane nel
JSX): ora il suo `manage.*` esiste in tutte e due le lingue.

Lo **Step 57** ha chiuso il giro col **pairing** (`pair/invite`, `pair/scan`, `pair/index`, `join`),
che era la sezione più lunga del dizionario. Lì però la regola si rovescia: una parte di quel testo
non è una spiegazione ma un **consenso** — è il giro in cui la chiave esce dal telefono — quindi la
card in cima all'invito è rimasta pesante com'era, e sono scese solo le parti operative. Dieci
schermate parlano ora la stessa lingua; le quattro `Card` con un paragrafo dentro che restano sono
tutte volute.

**1322 test verdi** (639 core + 629 app + 54 relay), typecheck, lint e `format:check` puliti.

Piano v7 — [piano-v7-data-e-vocabolario-del-gruppo.md](piano-v7-data-e-vocabolario-del-gruppo.md),
**scritto e chiuso il 13 settembre, tre step su tre.**

**Lo Step 58 è entrato il 13 settembre.** La data di una spesa si sceglie: la riga di
«Dettagli» che era di sola lettura apre due pillole — «Oggi» e «Ieri», che sono la risposta
quasi sempre — e sotto la griglia del mese. La griglia è la stessa dei filtri dei Grafici,
estratta in `features/calendar/MonthGrid.tsx`: **non sa cosa sia un intervallo né cosa sia una
scelta singola**, riceve `stateOf` e `onPress`, e i due selettori restano due perché la
differenza — un giorno o due — sta nelle sei righe di chi chiama e non nelle quarantadue
celle. `DayGridPicker` è ora un involucro, a comportamento invariato.

Tre cose emerse scrivendo, che il piano non aveva:

1. **Il contenitore di `DayGridPicker` non poteva diventare un frammento.** Il genitore
   (`PeriodPicker`) è un flex con `gap: spacing.md` e prima riceveva **un** figlio solo:
   restituire griglia e didascalia come fratelli avrebbe cambiato la spaziatura di una
   schermata che questo step non doveva toccare.
2. **La riga della data è diventata un pulsante alto quanto una riga di testo.** Da contenuto
   a bersaglio senza che nulla lo dicesse: ha preso `minHeight: 44` e il fondo premuto, come
   il `minHeight: 52` di `Button`.
3. **Le due chiavi del navigatore mese sono uscite da `stats.grid`** e stanno in un blocco
   `calendar`: una chiave `stats.*` letta da un selettore della nuova spesa è un nome che
   mente. `yesterdayIso` è uscita da dentro `formatDayTitle`, dove era un `Date` locale con
   un `setDate`, e ora passa da `addDays` — aritmetica sulla stringa, nessun fuso.

`MonthGrid` legge il mese corrente dal `today` che riceve invece di rileggere l'orologio:
due letture nello stesso componente possono cadere ai lati della mezzanotte, e la freccia
resterebbe accesa su un mese dalle celle tutte spente.

**1338 test verdi** (651 core + 633 app + 54 relay), typecheck, lint e `format:check` puliti,
e il bundle Android esporta.

**Lo Step 59 è entrato il 13 settembre.** Tag e negozi non sono più due caselle di testo con
dei suggerimenti derivati: sono un **elenco del gruppo**, con due schermate in «Gestione
gruppo» accanto a «Categorie» e, nel form, pillole più un `+` che mette una voce in elenco e
la sceglie insieme.

**`Expense.tags` e `Expense.store` non sono cambiati: restano testo.** È la decisione che
rende tutto additivo — zero migrazione, `insights/stores.ts`, `query.ts`, i filtri e i grafici
intatti — e che dà a «togliere una voce» il significato giusto: la spesa porta la parola e non
un riferimento, quindi togliere non archivia niente e non lascia orfano nessuno. È la
differenza con le categorie, che infatti si archiviano soltanto.

**La chiave di una voce è derivata dal nome** (`tagKey`/`storeKey`), non un `newId`: due
telefoni che toccano «Vacanza» separatamente convergono su una voce sola, ed è provato in
`convergence.test.ts`. Il prezzo dichiarato è che una voce non si rinomina — si toglie e si
riaggiunge. Rimozione = tombstone, mai `delete` della chiave, con il suo test di fusione.

**`parseVocabularyKey` taglia al primo `:` e non all'ultimo come `parseBudgetKey`**: là la
parte variabile sta davanti, qui sta dietro ed è un nome scritto da una persona. Un negozio
chiamato «Coop: centro» sarebbe finito in una famiglia inesistente e sparito dall'elenco senza
che nulla lo dicesse. C'è un test che confronta le due funzioni sulla stessa chiave.

Quattro cose nate scrivendo:

1. **Il tipo obbligatorio ha fatto il lavoro.** Aggiungere `vocabulary` a `VaultSnapshot` ha
   rotto la compilazione in nove punti — export, import, `assertEmpty`, sei fixture: nessuno
   di quei posti poteva dimenticarsene in silenzio.
2. **`totalKept` e `LABELS` di `features/import/summary.ts` andavano estesi**, o un file che
   portasse solo l'elenco avrebbe detto «non c'è niente da importare».
3. **La casella di testo è finita dietro il `+`**, non lasciata a schermo: una casella visibile
   invita a riscrivere, ed è riscrivere che produceva due insegne per lo stesso negozio.
4. **Le bozze del `+` stanno nel form e non nei selettori**, così `handleSubmit` le vede: chi
   tocca «Salva» senza premere «fine» ritrova ciò che ha scritto, e quella parola entra anche
   in elenco.

Tolte tre chiavi orfane da `expense.extra` (`title` era morta dallo Step 50, le altre due da
questo), e dichiarata l'eccezione per `vocabulary.tag.count.one`: «tag» è invariabile in
italiano e prende la s solo al plurale inglese.

**Export a v3.** Un file v2 resta leggibile e vale come elenco vuoto: le spese portano
comunque le loro parole, quindi non si perdono dati, si perdono suggerimenti — e si riadottano
dal blocco «già usati» della schermata di gestione. Quel blocco è anche ciò che impedisce, sui
gruppi nati prima di questo step, che i tag già scritti diventino irraggiungibili il giorno in
cui la tendina sostituisce il testo libero.

**1363 test verdi** (670 core + 639 app + 54 relay), typecheck, lint e `format:check` puliti,
e il bundle Android esporta.

**Lo Step 60 è entrato il 13 settembre, e con lui il Piano v7 è chiuso: tre step su tre.** Otto voci
uscite da una lettura del codice, sette entrate e una no.

**L'italiano fisso è finito**, e stava dove pesava di più: i due `Alert` di «esci dal gruppo» e
«rigenera» (`'Annulla'` compreso), i tre titoli di guasto fatale di `_layout.tsx`, la coda della
ciambella, e **tutti i testi delle notifiche più i nomi dei canali Android**. Le notifiche sono state
prese per intero e non solo alle righe elencate nel piano: una notifica si legge **fuori** dall'app,
ore dopo, senza niente attorno che spieghi perché è in un'altra lingua, e i nomi dei canali restano
nelle impostazioni di sistema anche a app chiusa.

**Non tradotti di proposito:** i nomi delle otto categorie di partenza e `FIRST_GROUP_NAME`. Sono
**dati** dentro il vault, rinominabili, non etichette: tradurli vorrebbe dire che due telefoni con
lingue diverse scrivono due categorie diverse nello stesso documento condiviso.

**La guardia su `paidBy` è stata tentata e ritirata, ed è la cosa da non ritentare senza rileggere
questo.** Messa in `addExpense` fa cadere **46 test** in quattro file, e non per fragilità delle
fixture: i test del motore di sync e della persistenza misurano gli update Yjs **uno a uno**, e in un
documento i membri sono contenuto quanto le spese. Non si aggira fingendo che i membri siano già
sincronizzati — Yjs tiene in sospeso gli update di un client finché non ha tutti quelli che li
precedono, quindi se i membri non viaggiano le spese che li nominano non arrivano affatto. E la
premessa del piano era imprecisa: «i pareggi rifiutano un membro sconosciuto» non descrive
`addSettlement`, che quel controllo non ce l'ha, ma `readSettlements` dell'**import** — dove la
simmetria esiste già, perché `readExpenses` valida `paidBy` contro `memberIds` da sempre. Il buco
resta solo sulla scrittura locale, dove `paidBy` arriva da un selettore di membri esistenti e togliere
un membro non si può.

L'altra metà del punto 2 invece è entrata: `assertKnownCurrency` sta accanto a `isKnownCurrency` — che
era una guardia scritta e mai collegata — e la chiamano `addExpense` e `updateExpense`.

Le altre sei: `MAX_EXPENSE_NOTE = 140` sulla nota (e `MAX_ENTRY_NAME`, che era scritto due volte,
spostato in `choices.ts`); `peak` di `TopList` allineato a `CategoryBars` — **che il piano dava per un
difetto visibile e non lo è**, perché `totals` arriva ordinato e i due calcoli coincidono, ma
l'ordinamento qui non è dichiarato da niente; `tidy()` esportata da `naming.ts` invece di essere
riscritta in quattro punti; il `console.error` del core diventato un `onError` facoltativo, collegato
a `markError` nei tre punti che costruiscono una persistenza — **prima una scrittura fallita non
emergeva da nessuna parte nell'app**; cinque funzioni morte tolte con i loro test, più
`app/dashboard.tsx`, il redirect che lo Step 52 aveva lasciato «per un ciclo»; e `parseHex`, che
accettava `#00FF00zz` perché la regex guardava solo i primi sei caratteri.

**1359 test verdi** (665 core + 640 app + 54 relay), typecheck, lint e `format:check` puliti, e il
bundle Android esporta. Il totale scende da 1363 perché i dieci test del codice morto sono usciti con
lui, e ne sono entrati sei nuovi.

**Resta da guardare sul telefono**, come per il 58 e il 59: i due `Alert` tradotti, la nota che si
ferma a 140, e le notifiche in inglese con la lingua di sistema cambiata.

**Il devlog non ha le voci degli Step 58 e 59**: sono state saltate in quelle due sessioni e sono
raccontate solo qui. Non ricostruite a posteriori di proposito — una voce di devlog scritta
rileggendo il diff dice quello che il codice fa, non quello che si stava pensando scrivendolo.

> **Il redesign è finito nel codice, e adesso tocca al telefono.** Sette passi su sette, e da qui
> non resta niente da scrivere: resta da **guardare**. È la stessa frase che valeva per i tre piani
> funzionali, ma questa volta pesa di più — i passi 4, 6 e 7 hanno rifatto le tre schermate che si
> aprono più spesso, e il 6 ha spostato la radice del primo tab. Cosa provare, in ordine di rischio,
> in [Cosa non è ancora stato verificato su hardware reale](verifica-sul-telefono.md#cosa-non-è-ancora-stato-verificato-su-hardware-reale).

**I piani chiusi sono due.** Il piano originale (Step 0–9), e
[piano-v2-profili-gruppi-sync.md](piano-v2-profili-gruppi-sync.md) (**Step 10–14**), nato dalla prima
prova con due dispositivi che aveva fatto emergere due bug sui numeri e tre limiti di prodotto.

**Anche il terzo è chiuso:** [piano-v3-tab-gruppi-azzeramento-sync.md](piano-v3-tab-gruppi-azzeramento-sync.md),
**Step 16–22**, tutti fatti. Nasceva dalla prova a mano delle funzionalità: la gestione dei gruppi
non era intuitiva, il gruppo di default al primo avvio generava confusione, e il poll del relay
andava tarato. **Uno step per sessione.** La taratura del motore è finita, **gli spostamenti di rotte
pure** — erano i due step più delicati del piano, quelli che potevano rompere in silenzio l'ingresso
da un invito, e sono chiusi entrambi con gli URL intatti (vedi sotto) — la riorganizzazione dei tab
anche, il gruppo di default non c'è più, e «Azzera questo telefono» adesso azzera davvero.

**Anche il redesign visivo è chiuso** — sette passi su sette: vedi
[visualdesign.md](visualdesign.md) e la sezione [Redesign visivo](#redesign-visivo) qui sotto.

**Anche il quarto piano è chiuso:** [piano-v4-grafici-e-dashboard.md](piano-v4-grafici-e-dashboard.md),
**Step 23–28** — grafici, filtri e dashboard componibile. Nasceva da una richiesta di prodotto e non
da un difetto, e dai tre limiti dei Grafici di allora: **non si poteva chiedere niente** (lo risolve
il 27), **il repertorio era fatto di barre** (il 25 e il 26), **la schermata era la stessa per tutti**
(il 28). Il 23 e il 25 sono i due che **non si vedono**, tutti dentro `packages/core`, e il piano
stesso li indicava come il posto giusto da cui cominciare; il 24 porta negozio e tag nel form, dietro
una tendina chiusa. Vedi [Negozio e tag](#negozio-e-tag-step-23-e-24),
[La geometria dei grafici](#la-geometria-dei-grafici-step-25),
[I grafici nuovi, in SVG](#i-grafici-nuovi-in-svg-step-26),
[I sei filtri](#i-sei-filtri-step-27) e
[La dashboard componibile](#la-dashboard-componibile-step-28).

Resta però vero che il seguito più urgente è
[la prova sui due telefoni](piano-v3-tab-gruppi-azzeramento-sync.md#criterio-di-fatto-end-to-end), che
manca a tutti e tre i piani precedenti e ora anche al redesign. Il piano v4 aggiunge due campi alla
spesa, quindi il suo criterio di «fatto» **dipende** da quella prova: finché il sync non è stato visto
funzionare in entrambi i versi, non si può sapere se un negozio scritto di qua arriva di là.

Le WebSocket sul Durable Object restano una possibilità dichiarata fuori perimetro, **da valutare solo
dopo** aver provato sul campo la taratura degli Step 16 e 17.

> **Di quanto è stato scritto finora non resta codice da scrivere: resta la prova sul campo.** Vale
> per i tre piani e ora anche per il redesign — il piano v4 è un'aggiunta, non il completamento di
> qualcosa, e non sostituisce questa riga.
> Dallo Step 10 in poi nulla è mai stato visto funzionare su un telefono: quello che manca è
> il [criterio di «fatto» end-to-end](piano-v2-profili-gruppi-sync.md#criterio-di-fatto-end-to-end) su
> due dispositivi fisici. Finché non è stato fatto, «i test passano» e «funziona» restano due frasi
> diverse — e adesso la distanza fra le due è più larga di prima, perché **i passi 4, 6 e 7 hanno
> rifatto le tre schermate che si aprono più spesso** e il 6 ha spostato la radice del primo tab. Gli
> URL sono rimasti quelli di prima e i tipi generati da expo-router lo confermano a ogni passo, ma è
> una ragione in più per farla adesso, non una in meno. Gli spostamenti di file sono finiti: da qui in
> poi la struttura delle rotte non si tocca più.
>
> **Con un telefono solo si fa quasi tutto lo stesso:** `npm run prova` esegue la checklist da sola
> — due dispositivi senza schermo che montano **i moduli veri dell'app** su SQLite vero contro il
> relay in produzione, una trentina di controlli in ~90 s — e `npm run peer` è la versione
> interattiva, per le prove che hanno bisogno del telefono dall'altra parte. Cosa copre e cosa no in
> [prova-con-un-telefono-solo.md](prova-con-un-telefono-solo.md).

**La pagina `/j` è in produzione** (deploy del 2026-08-02, versione `b351a959`): risponde 200 con
gli header attesi — `Referrer-Policy: no-referrer`, CSP `default-src 'none'`, `noindex` — e l'HTML
servito è quello del repo, senza risorse esterne. Resta da provare col telefono in mano.

**Dal 2026-09-05 il Worker ne serve una seconda: [`/privacy`](https://jutrack-relay.jutrack-relayfrfal.workers.dev/privacy)**,
l'informativa richiesta dal Play Store, verificata identica byte per byte al sorgente in `main`. Le
sue **due differenze rispetto a `/j` sono deliberate e hanno un test ciascuna**, perché sono ciò che
si copierebbe per abitudine dalla pagina accanto: **niente `noindex`**, perché questo documento deve
essere trovabile e citabile mentre `/j` porta una chiave nel fragment; e **`script-src 'none'`**
invece di `'unsafe-inline'`, perché non c'è nulla da calcolare nel browser e le due lingue stanno una
sotto l'altra dietro due ancore, così si legge anche con gli script disattivati. Titolare e recapito
sono costanti in cima al modulo, e un test impedisce che tornino a essere segnaposto.

## Redesign visivo

Documento: [visualdesign.md](visualdesign.md). Direzione **2a**: card dove si agisce e c'è un numero
da mettere al centro (spese, nuova spesa), registro — liste a tutta larghezza, filetti, etichette
maiuscoletta — dove si legge (grafici, selettore gruppi, Tu). Regola unica: **una sola card per
schermata**. Il redesign passa da quattro tab a tre, e non tocca `packages/core`, lo schema Yjs,
sync, crypto, relay, backup, export né azzeramento.

**Un passo per sessione**, come per i piani precedenti. **Tutti e sette chiusi.**

### Il passo 7 ha riscritto il form della spesa

L'ordine adesso è **importo → chi e come → categoria → dettagli**, che è l'ordine in cui la spesa
viene detta a voce. Prima era importo, descrizione, categoria, chi ha pagato, come si divide: la
parte sui soldi stava in due tronconi separati dal resto, ed è la schermata che si apre più spesso.

**Il salva non sta più in alto**, ma a piena larghezza in fondo, dove arriva il pollice. In cima
resta solo la x per uscire: `ModalScreen` ha una prop `compact` — x tonda a sinistra, titolo al
centro — usata da queste due rotte e da nessun'altra delle quattordici, perché altrove il pulsante
in alto **è** l'unico modo di uscire.

**L'importo è la card eroe e la cifra è il campo**: si tocca il numero, non un riquadro attorno.
Sotto ogni persona compare la quota che le toccherebbe, aggiornata mentre si scrive — è ciò che rende
visibile la differenza fra le tre modalità senza provarle una per una. Il riquadro selezionato prende
il **colore del membro**, non l'accento, così dice _chi_ e non solo _scelto_.

**Due etichette del mockup erano false, e non sono state copiate** — sesta e settima correzione al
documento:

- **«Metà e metà» è vero solo in due.** In tre sarebbe falso, e su un'app di conti una frase falsa
  accanto a un numero è peggio di una lunga: `splitModeLabel` dice «Metà e metà» con due membri e
  «In parti uguali` da tre in su.
- **«Tutto mio» è falso quando ha pagato un altro.** La modalità `single` mette la spesa a carico di
  **chi ha pagato**, e una spesa pagata da un altro si può registrare. L'etichetta è «Solo chi paga»,
  vera in entrambi i casi.

**La data resta non modificabile, com'era prima.** Un selettore di date vuole
`@react-native-community/datetimepicker`, cioè un modulo nativo, cioè una build EAS nuova. La riga la
**mostra** — su una spesa vecchia dice di quale giorno si parla — e non finge di essere toccabile.

**`describeGap` e `splitPreview` sono usciti dal componente** in `features/expenses/split-text.ts`,
dove hanno dei test: stavano in `ExpenseForm.tsx` senza, e `splitPreview` ha il caso del centesimo di
resto (10,00 € in tre fa 3,34 / 3,33 / 3,33), che è esattamente il tipo di cosa che si vuole fissata.

**La logica di calcolo non è cambiata:** `parseAmount`, `buildSplit`, la validazione delle quote e la
costruzione dello `split` sono quelle di prima, riga per riga. È un passo di impaginazione.

### Il passo 6 ha invertito la radice del primo tab

Era `elenco dei gruppi → gruppo aperto`, adesso è `gruppo aperto`, e l'elenco è un foglio. Si apre
l'app per registrare una spesa, non per scegliere in quale gruppo si è: quella domanda ora sta nella
pill dell'header.

**Gli URL non sono cambiati, di nuovo.** `/` era l'elenco ed è la home delle spese; `/groups/<id>` —
l'indirizzo su cui atterra chi entra da un invito — c'è ancora e mostra la stessa schermata. La
procedura dello Step 18 è stata rifatta: tipi rigenerati con `expo start`, `tsc` **con quei tipi
presenti** (ha subito trovato un errore di sintassi vero), rotte verificate una per una.

**Le due rotte condividono `features/expenses/GroupHome.tsx`, e non un redirect.** La strada corta
era un `<Redirect href="/" />` in `/groups/<id>/index`, e sarebbe stata un bug: in uno stack le
schermate **sotto** quella a fuoco restano montate, quindi quel redirect scatterebbe anche mentre si
guarda `/groups/<id>/manage`, che sta nello stesso stack, chiudendo la gestione appena aperta. Un
componente condiviso non naviga. La differenza fra le due rotte è solo chi decide il gruppo: il
registro in `/`, l'URL in `/groups/<id>` attraverso la guardia del layout, che è rimasta com'era.

**Cambiare gruppo dal foglio fa `dismissTo('/')` prima di `select()`.** Se si sta guardando
`/groups/<id>` la guardia di quel layout riporterebbe corrente il gruppo dell'URL, disfacendo il
cambio all'istante. Si naviga prima, così quella guardia è già smontata quando il corrente cambia.
`dismissTo` e non `replace`: dalla radice è già a posto e non impila nulla.

**`GroupPicker` è un componente e due contenitori**, come chiedeva il documento: il foglio
(`GroupSwitcherSheet`) e lo stato vuoto «nessun gruppo» a piena pagina. Due copie divergerebbero, e
la prima cosa a divergere sarebbe un ingresso dimenticato in una delle due.

**Il foglio è una `Modal` di React Native, non `@gorhom/bottom-sheet`.** Quello porterebbe
`react-native-reanimated` e `react-native-gesture-handler`, due moduli nativi: una build EAS nuova
per un'animazione, con una sola development build installata sul telefono. Si paga quando servirà
trascinare il foglio col dito, non prima.

**La quota per riga non passa da `computeBalances`** — la correzione n. 3 qui sotto, applicata:
`features/expenses/share.ts` è `amountCents - shares[me]` se ho pagato io, `-shares[me]` altrimenti.
O(1) per riga, nessuna prop da propagare. Il test ha trovato subito un difetto vero: `-shares[me]`
con quota zero dà **`-0`**, che non è `0`, e un `Math.sign` a valle lo leggerebbe come debito.

**Il gruppo non ha un colore nello schema, e non gliene è stato aggiunto uno.** La pill lo vuole:
`groupColor(vaultId)` lo deriva dal `vaultId`, che è già lì, stabile e **uguale sui due telefoni** —
quindi lo stesso gruppo ha lo stesso colore su entrambi, senza un update Yjs né una domanda a chi
crea un gruppo. Terza famiglia di colori, distinta da persone e categorie perché nell'header le tre
cose compaiono insieme; e nel quadratino c'è sempre l'iniziale, quindi il colore non porta mai
l'identità da solo.

**`numeric` non compilava, e nessuno lo sapeva.** Il token è nato al passo 1 con `as const`, che
rende `fontVariant` un tuple `readonly` mentre `TextStyle` lo vuole mutabile. È rimasto invisibile
per tre passi perché **nessuno lo applicava**: il primo `Text` che l'ha usato è stato anche il primo
a non compilare. Ora è tipizzato `Pick<TextStyle, 'fontVariant'>`.

**`Screen.onTitlePress` è stato smontato.** Serviva al nome del gruppo come titolo toccabile verso la
gestione; adesso il gruppo è una pill che apre il selettore, e alla gestione porta il bottone con le
leve. Era il suo unico chiamante.

**Il sottotitolo ricco delle righe vale solo per il gruppo aperto** — quinta correzione al documento,
che lo mostra su ogni riga. Spese e totali stanno dentro il documento Yjs di quel gruppo, e di
documenti ne è montato **uno solo per volta**: riempirlo su tutte le righe vorrebbe dire aprire ogni
vault, N chiavi dal portachiavi e il motore di sync da riassegnare. Le altre righe tengono il
`vault <short>`, che è comunque ciò che distingue due gruppi con lo stesso nome.

**Il passo 5 riscrive `stats.tsx` in forma registro**, senza toccare `packages/core`: lo stepper
del mese diventa l'header della schermata (`Screen header=`, come già per Tu), l'importo del mese è
l'unico numero grande (`fontSize.display`/`fontWeight.heavy` — nuovo, **800**, perché a quella
scala anche `bold` a 700 si legge sottile), e `MonthlyBars`/`CategoryBars` perdono il contenitore a
card. `CategoryBars` perde anche l'icona di categoria: colore della barra e nome bastano, ed era
l'unico punto in cui l'icona ripeteva un'informazione già data dal colore. `BudgetRows` resta
**invariata** di proposito, com'è scritto nel documento.

**`EmptyState` accetta un nodo oltre a un'emoji.** `icon` era `string`, reso sempre come `<Text>`;
ora accetta anche un `ReactNode` — usato dai due stati vuoti dei Grafici per un'icona Feather
(`bar-chart-2`, `colors.textFaint`) — e i tre chiamanti rimasti (`GroupRequired`, l'elenco spese di
un gruppo, la spesa non trovata) continuano a passare un'emoji senza toccare una riga.

**Il bottone "Pareggia"/"Storico" è un componente locale**, non `Button`: quest'ultimo è pensato a
piena larghezza, e qui serve un tocco compatto accanto a una riga di testo. Non è salito fra i
componenti condivisi perché lo usa una sola schermata.

**Il passo 4 fonde `profile.tsx` e `settings.tsx` in `tu.tsx`.** Tre tab invece di quattro: il tab
Impostazioni sparisce, e con lui il file omonimo — che però **non si cancella**, diventa un
`<Redirect href="/tu" />`, perché expo-router persiste l'ultima rotta e chi riapre l'app dopo
l'aggiornamento con `/settings` come stato salvato deve arrivare comunque da qualche parte. Va
tolto dopo un ciclo, quando nessuna installazione può più avere quello stato. Lo stesso vale per il
tab nella tab bar: `href: null` nelle `options`, non la cancellazione dello screen, o la rotta
resterebbe raggiungibile ma senza un modo di arrivarci dal redirect.

**`profile.tsx` → `tu.tsx` cambia l'URL**, quindi la procedura dei tipi di rotta dello Step 18 è
stata rifatta: `.expo/types/router.d.ts` rigenerato con `expo start` e verificato con `tsc` prima di
scrivere gli `router.push` di `tu.tsx` — non dopo, perché senza quei tipi presenti un href sbagliato
passa il typecheck lo stesso.

**Solo la sezione «Il gruppo aperto» si smonta senza un gruppo.** Sincronizzazione e Questo telefono
restano sempre montate — «Sincronizza» si disabilita e basta, come già faceva Impostazioni dallo
Step 21 — perché Diagnostica e **Azzera questo telefono** devono restare raggiungibili proprio
quando i gruppi sono zero.

**Il pallino dello stato di sync è condiviso, non duplicato.** `syncTone()` in
`features/sync/describe.ts` estrae la scelta fase→tonalità (`ok`/`warn`/`muted`) che prima viveva
solo dentro `SyncBadge`; il componente la usa ancora per colorare icona e testo, e il pallino nudo di
Tu la stessa funzione per colorare un cerchio di 7px. `describeSync()` non è stata toccata — il suo
`icon` testuale resta quello di sempre, coperto dal test esistente.

**Il default di `Card` resta la forma di sempre.** Le varianti nuove sono `flat` (contenitore di
lista: niente bordo, niente padding) e `raised` (card eroe, una per schermata); `default` è un ponte
scritto per essere smontato quando i passi 4-7 avranno spostato tutte le chiamate.

**Le icone delle categorie non migrano i dati.** Il campo `icon` nel documento Yjs resta com'è —
è sincronizzato, riscriverlo genererebbe un update per ogni categoria su ogni telefono — e la
sostituzione avviene in sola lettura in `features/categories/icon.ts`: nome Feather → si disegna;
emoji di default → la traduce `CATEGORY_ICONS`, derivata da `DEFAULT_CATEGORIES` in `state/seed.ts`;
qualunque altra cosa → **pallino del colore della categoria**. Il terzo caso è ciò che permette di
non migrare nulla, e riguarda le categorie create a mano con la vecchia schermata a emoji.

**`@expo/vector-icons` non ha richiesto una build EAS**, e la ragione va ricordata: `app.json` non è
stato toccato (nessun config plugin), il pacchetto ha zero dipendenze proprie, e il modulo nativo che
gli serve — `expo-font` — è già dipendenza diretta di `expo`, quindi era autolinkato nella build del
1º agosto. Il font viaggia come asset del bundle. **Importare sempre dal sottopercorso**
(`@expo/vector-icons/Feather`): il barrel tira dentro tutti e undici i set con i rispettivi TTF.

**Quattro punti in cui il documento va corretto**, verificati contro il repo prima di cominciare —
sono nel documento come sono stati scritti, quindi vanno letti da qui:

1. **`@expo/vector-icons` non è installato** e non è transitivo di Expo SDK 57, contrariamente a
   quanto dice §3. Va aggiunto al passo 2 con `npx expo install`. È JS più asset font ed `expo-font`
   c'è già: **niente build EAS**.
2. **`Card variant` non può avere `flat` come default** (§2.1): oggi `Card` ha sempre bordo e
   padding, e ci sono 46 usi in 15 file, molti fuori scope. Il default resta la forma attuale.
3. **La quota per riga di `ExpenseRow` non passa da `computeBalances`** (§2.1): è
   `amountCents - split.shares[me]` se ho pagato io, `-split.shares[me]` altrimenti. O(1), niente
   prop da propagare.
4. **Togliere il tab Impostazioni richiede `href: null`** nelle options (§4.1): cancellare il file
   non basta finché sta in `(tabs)/`. E `profile.tsx` → `tu.tsx` cambia l'URL, quindi al passo 4 va
   rifatta la procedura dei tipi di rotta dello Step 18.

## Negozio e tag (Step 23 e 24)

Due campi su `Expense` — `store: string` e `tags: string[]` — nel modello (23) e nel form (24). Il 23
è il primo dei due step del piano v4 che **non si vedono**, e insieme allo Step 25 è quello che
decide se il resto mostrerà numeri giusti.

- **Sono campi, non entità.** Niente mappe `stores` e `tags` con i propri id: il vocabolario si
  deriva in lettura da chi li usa (`insights/naming.ts`), quindi un negozio esiste finché esiste una
  spesa che lo nomina e sparisce da solo quando non ne resta nessuna. Niente schermate di gestione,
  niente cancellazioni, **nessun orfano**. Il prezzo, accettato: non si può dare un colore a un tag
  né rinominarne uno in tutte le spese insieme.
- **Additivo per davvero.** I reader hanno un fallback (`''` e `[]`) e `writeRecord` scrive solo le
  chiavi che riceve: una spesa registrata prima di oggi si legge senza che nulla la tocchi. **Nessun
  backfill** e **nessun bump di `CURRENT_SCHEMA_VERSION`**, che è un meccanismo di azzeramento e non
  di migrazione — alzarlo qui cancellerebbe le tabelle. C'è il test che scrive a mano un record senza
  le due chiavi.
- **`strList` è difensivo perché il valore arriva dall'altro telefono.** `listExpenses` è la lettura
  da cui dipende l'intera lista spese: un `tags` che è un numero la farebbe saltare tutta. Si accetta
  solo se è un array, si tengono solo le stringhe, e si restituisce sempre un array **nuovo** — così
  chi legge non modifica per sbaglio il valore dentro il documento.
- **I tag si scrivono come array intero: vince l'ultimo.** Una `Y.Array` fonderebbe due aggiunte
  concorrenti, ma richiede reader e writer nuovi in `doc.ts` — che oggi tratta solo valori piatti —
  per un conflitto che vuole due persone che etichettano la stessa spesa nello stesso momento. Il
  test di convergenza fissa ciò che conta: dopo il sync i due documenti hanno la **stessa** lista.
  Diverso da `split`, atomico perché ha un'invariante da rispettare.
- **`Esselunga`, `esselunga` e `Esselunga ` sono lo stesso negozio.** La normalizzazione si applica
  **in scrittura**, dentro `addExpense` e `updateExpense`, che è l'unico punto da cui il testo entra
  nel documento; si conserva la grafia scritta e a schermo compare la **più usata**. A parità di
  frequenza decide la chiave in ordine alfabetico, come già per le categorie: i due telefoni devono
  proporre lo stesso elenco. Le spese cancellate non contribuiscono al vocabolario.
- **L'export sale a v2**, e le colonne nuove sono `negozio` e `tag`, quest'ultima con i tag uniti da
  `;` perché la virgola è il separatore del file. Il disinnesco contro la CSV injection si applica a
  **ogni tag prima di unirli**: farlo dopo proteggerebbe solo il primo.

Nel form (Step 24) stanno dietro **«Informazioni aggiuntive»**, una tendina in fondo alla schermata,
dopo i dettagli e prima del salva — l'ordine importo → chi e come → categoria → dettagli del passo 7
non è stato toccato.

- **La riga chiusa dice cosa c'è sotto**: «Esselunga · 2 tag», oppure «Facoltativi». Nascondere
  campi **compilati** dietro una tendina muta è il modo in cui i dati si perdono senza che nessuno se
  ne accorga. Resta chiusa anche su una spesa che ha già negozio e tag: a dirlo è il riassunto.
- **Il negozio si tronca a 20 caratteri, e non è cosmetico.** `numberOfLines={1}` taglierebbe la
  **fine** della stringa, cioè proprio il «· 2 tag» che dice che sotto c'è dell'altro. La logica è
  `extraSummary` in `features/expenses/extra-fields.ts`, con i test, come `split-text.ts`.
- **Due modi di perdere un tag, chiusi entrambi**: il campo usa `submitBehavior="submit"` invece del
  default `blurAndSubmit`, così due tag di seguito non richiedono di ritoccarlo; e `handleSubmit`
  salva `normalizeTags([...tags, tagDraft])`, cioè include il tag a metà scrittura di chi tocca
  «Salva» senza premere «fine».
- **Il form non normalizza.** `ExpenseFormValues` porta il testo com'è stato scritto: a ripulirlo è
  `VaultStore` in scrittura, l'unico punto da cui entra nel documento. Una seconda regola nel form
  sarebbe una seconda regola da tenere allineata.
- **`Chip` è ora un componente condiviso** (`components/Chip.tsx`), e i due punti che lo scrivevano a
  mano dentro `ExpenseForm.tsx` — modalità di divisione e categorie — sono convertiti nello stesso
  commit. Senza `color` la pillola selezionata si riempie d'accento (una scelta fra modi), con
  `color` prende bordo del colore e fondo `color + '22'` (lì il colore **è** l'informazione).
  Unificato anche il peso dell'etichetta, che nelle due copie divergeva senza una ragione:
  `semibold` da selezionata, `medium` altrimenti.

## La geometria dei grafici (Step 25)

Undici moduli in `packages/core`, nessuna riga di interfaccia: quattro in `chart/` (`scale`, `path`,
`treemap`, `bins`) e sette in `insights/` (`query`, `calendar`, `series`, `weekday`, `heatmap`,
`stores`, `people`). Serve a rendere i grafici verificabili **senza un telefono**, ed è la ragione
per cui viene prima di quello che li disegna.

- **`amountFor` è il punto in cui si producono numeri plausibili e sbagliati, e per questo è una
  funzione sola.** Senza filtro persona l'importo è pieno; con **«a carico di»** è la quota di quella
  persona; con **«ha pagato»** torna pieno, perché la domanda è quanto ha anticipato. Nessun grafico
  legge `amountCents` per conto suo.
- **La fascia di importo si misura sull'importo proiettato.** Sull'importo pieno, un istogramma
  costruito su `amountFor` mostrerebbe barre fuori dalla fascia scelta.
- **Le tre aggregazioni esistenti hanno preso la query in coda**, con default vuoto: `totalCents`,
  `totalsByCategory`, `totalsByMonth`. Il piano le dava per intoccate, ma dice anche che nessuno
  legge `amountCents` da solo — e le due cose insieme non stanno in piedi. Nessun chiamante toccato.
- **Il test che attraversa i moduli è quello che vale.** Con la stessa query, serie giornaliera,
  barre settimanali, categorie, istogramma e curva cumulata devono dare **lo stesso** totale, e le
  aree del treemap coprire il rettangolo in proporzione. Sei query, filtro persona in entrambe le
  modalità. Nessun test di singolo modulo se ne accorgerebbe: ciascuno sarebbe coerente con sé.
- **`smoothLinePath` è una cubica monotona**, non una spline naturale, che fra due mesi bassi e uno
  alto scenderebbe sotto la linea di base disegnando una spesa negativa. Il test non campiona la
  curva: sfrutta l'inviluppo convesso delle Bézier.
- **La heatmap è per quantili, sui soli giorni con spese.** Con una scala lineare un affitto
  schiaccia tutto il resto al minimo; includendo i giorni vuoti nei quantili, in un mese tranquillo
  il livello 1 coprirebbe quasi tutto.
- **`calendar.ts` lavora in UTC**, non col trucco del mezzogiorno di `grouping.ts`: quello serve
  quando il `Date` è costruito con componenti locali, e qui non se ne costruisce mai uno. UTC l'ora
  legale non ce l'ha. La settimana comincia **di lunedì**.
- **`totalsByStore` somma meno del totale** (le spese senza negozio non compaiono, e non c'è una
  voce «senza negozio» perché dominerebbe ogni grafico); **`totalsByTag` somma di più** (una spesa
  con due tag conta per intero in entrambi). Vanno dette entrambe dove i numeri si mostrano.

## I grafici nuovi, in SVG (Step 26)

Undici componenti in `apps/mobile/src/features/stats/charts/` — `LineChart`, `AreaChart`,
`Sparkline`, `WeekdayBars`, `CalendarHeatmap`, `AmountHistogram`, `CategoryTreemap`, `DonutChart`,
`StatTile`, `TopList`, `MemberComparison` — e un tab Grafici che è ancora **una sequenza fissa**,
solo molto più lunga: i filtri sono lo Step 27, la composizione il 28. `MonthlyBars`,
`CategoryBars` e `BudgetRows` non sono state toccate.

- **I componenti non calcolano niente.** Tutto quello che serviva è stato scritto e provato allo
  Step 25: qui si scelgono le scale, si chiede il tracciato e si disegna.
- **«Nessuna logica pura nuova» era sbagliato, e sono trenta test.** Quattro moduli con i loro
  test: `axis.ts` (quali etichette ci stanno sotto un asse), `heatmap-grid.ts` (i giorni in
  colonne di settimane, e le soglie della legenda ricavate dai livelli), `slices.ts` (la coda
  della ciambella, che non deve perdere centesimi) e `ink.ts`.
- **Metà dei colori di categoria vuole il testo scuro, non il bianco.** `ink.ts` esiste perché il
  treemap è il primo punto dell'app in cui una scritta finisce **dentro** una tinta. Il test è
  nato asserendo il bianco per tutti e otto ed è fallito: arancione, turchese, ocra e grigio col
  bianco stanno sotto 3,7:1. E la soglia WCAG di luminanza non serve, perché vale contro il bianco
  e il nero **puri**: si confrontano i due contrasti veri e vince il maggiore.
- **La heatmap si disegna in SVG e si tocca in React Native**, con `Pressable` trasparenti
  sovrapposti alle celle. Le tre compensazioni chieste dal piano ci sono tutte e tre — etichetta
  per cella, legenda con le soglie **in euro**, tocco che scrive giorno e importo — ed è l'unico
  grafico in cui il colore porterebbe l'informazione da solo.
- **L'istogramma misura il numero di spese, non la somma.** La domanda è «tanti scontrini piccoli o
  pochi grossi?»: su una scala di importi la fascia «200+» vincerebbe sempre con due spese sole.
- **La ciambella solo dove le fette sommano al totale** — chi ha anticipato. Negozi e tag vanno in
  `TopList`, con la nota che dice perché sommano meno (i negozi) o più (i tag) del totale.
- **Sul mese in corso le curve si fermano a oggi**; la heatmap invece copre il mese intero, e i
  giorni spenti in fondo dicono a che punto del mese si è.
- **Ogni grafico si misura da sé** con `onLayout`: `Dimensions.get('window')` darebbe la larghezza
  dello schermo ignorando i padding, e il grafico sborderebbe. Serve anche allo Step 28, dove i
  widget non sanno in che colonna finiranno.
- **`stats.tsx` passa già una `ExpenseQuery` vuota** a ogni aggregazione. Oggi non cambia nulla —
  con la query vuota `amountFor` dà l'importo pieno — e allo Step 27 basterà sostituire un oggetto
  solo invece di rileggere undici componenti.

## I sei filtri (Step 27)

Periodo, persona, categoria, negozio, tag e fascia di importo, in un solo `ExpenseQuery` che
alimenta ogni grafico. Sette file in `apps/mobile/src/features/stats/filters/` — `period.ts`,
`amount.ts` e `facets.ts` con i loro test, più `FilterBar`, `FilterSheet`, `PeriodPicker` e
`DayGridPicker` — e `stats.tsx` ricablato. È lo step che risponde al primo dei tre limiti da cui il
piano nasce: **non si poteva chiedere niente.**

- **Lo stepper del mese non c'è più.** Erano due controlli per la stessa cosa: lo stepper diceva un
  mese per volta, le **barre mensili** ne mostrano sei e ne fanno toccare uno. Ogni tocco riancora
  le sei barre, quindi si va indietro sei mesi alla volta — più lontano di quanto arrivino i
  preset. L'intestazione della schermata è adesso la barra dei filtri.
- **I chip portano il valore, non il nome del filtro**: «Spesa», non «Categoria». Le frasi le
  costruisce `queryParts` di `@jutrack/core`, la stessa di `describeQuery`. E **«Azzera» sta nella
  barra**, non dentro il foglio: è l'uscita di sicurezza da una schermata vuota, e chiedere di
  aprire un foglio per trovarla vorrebbe dire chiederlo proprio a chi non ha capito cosa succede.
- **Niente da mostrare non è tutto a zero.** Con la query senza risposte compare uno stato vuoto —
  che distingue «filtri attivi» da «periodo senza spese» — invece di undici grafici piatti, che si
  leggerebbero come un dato.
- **Tre grafici non rispettano il periodo, e lo dicono nel titolo.** «Dodici mesi», «Giorni della
  settimana» e «Anticipato e a carico» leggono la loro finestra ancorata al mese in cui il periodo
  **finisce**: un grafico intitolato «dodici mesi» che ne mostra sette sarebbe un titolo falso.
  Rispettano gli altri cinque filtri. **Saldo e budget non ne rispettano nessuno**: sono fatti sul
  gruppo, non viste — «speso 40 € di 200» diventerebbe falso filtrando per persona. Ognuna delle
  tre righe è scritta sotto il grafico a cui si riferisce.
- **`QueryFacets` è un tipo a sé** (`Omit<ExpenseQuery, 'from' | 'to'>`) e non una `ExpenseQuery`
  che ci si ricorda di non riempire: `amountFor` legge solo persona e modalità, ma `totalsByDay`
  usa `query.from`/`query.to` come estremi di ripiego, e per i grafici a dodici mesi sarebbero gli
  estremi sbagliati.
- **Le letture dal documento restano due**: una ristretta al periodo — l'unico filtro che conviene
  far fare allo store, perché restringe la scansione — e una completa per saldo e dodici mesi. Il
  resto sono due `applyQuery` in altrettanti `useMemo`.
- **«Rispetto a…» ha tre casi.** Un mese intero si confronta con il mese intero prima; un mese **in
  corso** con lo stesso tratto del mese prima (il 31 marzo diventa il 28 febbraio), o a metà agosto
  qualunque mese finito vincerebbe e la riga direbbe «-60%» ogni giorno; tutto il resto con il
  tratto di pari lunghezza subito precedente, che finisce il giorno prima che il periodo cominci.
- **Il massimo delle fasce è esclusivo in `bins.ts` e inclusivo in `ExpenseQuery`.** Senza togliere
  quel centesimo, una spesa da 20,00 € starebbe in «10–20» **e** in «20–50». Il test lo verifica
  passando dalla stessa `binsFor` che disegna le barre.
- **Un filtro su un negozio si spegne anche scritto con un'altra grafia**: `toggleValue` confronta
  sulla chiave normalizzata. E l'ultima voce spenta lascia la chiave **assente** invece di un
  elenco vuoto, o «Azzera» resterebbe nella barra senza niente da azzerare.
- **`DayGridPicker` non porta moduli nativi**, quindi nessuna build: è una griglia di `Pressable`
  sugli stessi helper di `calendar.ts` che servono alla heatmap. Quarta volta che il progetto
  rifiuta un modulo nativo per un gesto, e resta la base da cui rendere modificabile un giorno la
  data della spesa.
- **La heatmap ha imparato a scorrere.** Con «ultimi 12 mesi» sono cinquantatré colonne: divise per
  la larghezza di un telefono darebbero celle da tre punti, invisibili e **impossibili da toccare**
  — che è una delle tre compensazioni su cui si regge la sua leggibilità. La cella non scende sotto
  i nove punti e la griglia si trascina, con i nomi dei giorni fermi fuori dallo scorrimento.

## La dashboard componibile (Step 28)

Sedici widget in un registro, un layout salvato in `app_meta` e la schermata `/dashboard` per
scegliere quali mostrare e in che ordine. Il tab Grafici non è più una sequenza scritta nel file: è
un elenco di id che qualcuno ha scelto. È lo step che risponde al terzo dei tre limiti da cui il
piano nasce — **la schermata era la stessa per tutti**.

- **L'ordine esce dal JSX e diventa un dato.** `stats.tsx` costruisce una mappa
  `WidgetId → contenuto` e il layout la percorre. I sedici nodi si costruiscono sempre, anche
  quando se ne mostrano tre: creare un elemento React non lo disegna, e i calcoli sono quelli di
  prima. Il guadagno è che l'ordine sta in `layout.ts` e non nella sequenza del file.
- **Il filetto è passato alla cornice.** Con un ordine variabile, un tratto scritto a mano fra due
  blocchi resterebbe appeso in cima appena si toglie il widget sopra: a disegnarlo è
  `DashboardWidget`, che sa qual è il primo.
- **Ogni widget dice il proprio nome**, compresi il totale e i tre riquadri di riepilogo, che allo
  Step 26 non avevano etichetta. Un numero grande in cima si spiega da sé; spostato in fondo, no.
  **È la composizione a rendere obbligatorie le etichette.**
- **Due stati vuoti, non uno.** `unmet` riguarda il **gruppo** («serve almeno un'altra persona»),
  `empty` riguarda il **periodo** («in questo periodo non c'è niente da mostrare»): mandano a fare
  due cose diverse. Un grafico disegnato su zero direbbe invece una terza cosa, falsa.
- **Un widget scelto non svanisce mai.** Prima negozi, tag, ciambella, saldo e confronto erano
  dietro un `&&` che li faceva sparire; adesso restano e dichiarano cosa gli serve, con la
  **stessa frase** che il selettore mostra accanto al nome (`describeNeed`, una funzione sola).
- **Gli id sconosciuti si scartano, i widget nuovi non si aggiungono.** Sembrano regole opposte e
  sono la stessa: il layout salvato è una **scelta**, non una cache. Dal punto di vista del file,
  «widget nuovo» e «widget tolto dall'utente» sono lo stesso caso — un id che non c'è.
- **Una lista sola** (`{ id, visible }[]`): un widget spento conserva il posto che avrà quando
  verrà riacceso, e `moveWidget` scambia sull'elenco **intero** — è quello che si sta guardando
  mentre si riordina, e saltare gli spenti farebbe muovere la riga di due posti invece che di uno.
- **Il default è tutti e sedici.** Il piano diceva «la schermata di oggi, non il catalogo», ma dopo
  lo Step 26 la schermata _è_ il catalogo: un default più corto sarebbe una sottrazione fatta
  d'ufficio a chi aggiorna. Che coincidano è vero oggi e non è una regola.
- **Frecce e non trascinamento**, per la quinta volta nel progetto: il drag & drop vuole due moduli
  nativi, cioè una build EAS nuova per un gesto.
- **«Componi» sta fuori dalla barra dei filtri.** Dentro la riga scorrevole dei chip finirebbe
  fuori schermo appena i filtri attivi sono due — e sarebbe l'unico modo di riaccendere i widget,
  nascosto proprio a chi li ha spenti tutti.
- **Scrittura ottimistica, lettura no.** Un chevron risponde sotto il dito e salva dopo; la
  dashboard invece aspetta la rilettura, o chi ha spento dieci widget vedrebbe un lampo di
  schermata piena a ogni apertura del tab.
- **`/dashboard` sta sulla radice e funziona senza gruppo**, come `azzera.tsx` e `backup.tsx`: il
  layout è del telefono, non del vault. Il componente è diviso in due perché i suggerimenti sulle
  dipendenze leggono il vault, e senza gruppo mancano solo quelli.

## La valuta di default nel profilo (Step 29)

Un campo `currency?: string` sul `Profile`, un `CurrencyPicker` in Tu, e il simbolo che da lì arriva
a ogni importo che l'app scrive. È il primo step del piano v5 e l'unico dei dodici che non chiede né
una build EAS né una libreria nuova.

- **Il piano sottostimava lo step, e la correzione è la parte importante.** Diceva «l'unico
  consumatore nuovo è il default del campo valuta nel form di nuova spesa», ma il simbolo `€` era
  scritto a mano in **48 punti** — quaranta `formatMoney` che si affidavano al parametro di default,
  più otto `€` dentro il JSX. Con il solo default nel form, scegliere il franco avrebbe scritto
  `currency: 'CHF'` nel documento e lasciato a schermo `12,00 €`: un numero giusto con accanto una
  parola falsa, esattamente ciò che il progetto rifiuta da «Metà e metà». Il passaggio del simbolo
  è parte dello step.
- **Seconda correzione: «l'utente può cambiarla spesa per spesa» non era vero.** `Expense.currency`
  esiste nel modello dallo Step 0, ma il form non ha mai avuto un campo valuta e `ExpenseFormValues`
  non la portava: `addExpense` riceveva `undefined` e `store.ts` metteva `'EUR'`. Adesso la porta,
  presa dal profilo.
- **JuTrack non converte, e va detto dove si sceglie.** Il campo resta locale al telefono e non entra
  mai nel documento condiviso — su questo il piano ha ragione, non c'è nulla da fondere fra due
  membri. Ma senza tassi di cambio, due persone dello stesso gruppo con valute diverse registrano
  importi in unità diverse e ogni totale li somma come se fossero la stessa cosa. **Il campo è locale
  nel codice, la scelta è comune di fatto**, e la riga sotto il selettore lo dice invece di lasciarlo
  scoprire a un saldo sbagliato.
- **`ExpenseRow` è l'unica riga che non guarda il profilo**: lì il simbolo viene da
  `expense.currency`, perché mostra un importo preciso scritto un giorno preciso. Dove si somma —
  totali, saldi, grafici, budget — vale quella del profilo, perché una somma non ha una valuta
  propria. Per la stessa ragione **modificare una spesa non riscrive `currency`**.
- **Il simbolo passa dal profilo, non da un contesto nuovo.** `useCurrencySymbol()` sta accanto a
  `useProfile()`, già montato sopra tutta l'app. I moduli puri (`split-text.ts`, `balance-line.ts`,
  `stats/format.ts`, `queryParts` nel core) non possono chiamare un hook e lo ricevono come ultimo
  parametro con default `'€'`: è ciò che ha tenuto verdi i loro test senza riscriverli.
- **Sei valute, e le esclusioni sono le decisioni.** Fuori quelle a zero decimali (JPY): il progetto è
  in centesimi e `formatCents` stampa sempre due cifre. Fuori i simboli ambigui: `kr` vale per tre
  corone, e dove il simbolo non distingue si scrive il codice. Un codice sconosciuto — da una spesa
  vecchia o dall'altro telefono — si scrive **com'è**, senza ripiegare sull'euro.
- **Posizione del simbolo e virgola decimale non cambiano**, di proposito: sono convenzioni della
  **lingua**, non della moneta, e vanno con `Intl.NumberFormat` allo Step 37.
- **Una valuta illeggibile non fa cadere il profilo**, a differenza di un `profileId` vuoto: si torna
  al default e si continua. Non c'è nessun danno che si propaghi all'altro telefono.

## L'infrastruttura nativa (Step 30)

I due config plugin insieme in `app.json`, i moduli caricati pigramente e la diagnostica che passa
da 14 a 16 passaggi. **La build EAS è stata fatta e installata il 12 agosto 2026**, e la
diagnostica risponde 16 su 16: `modulo disponibile, permesso non concesso` e `2 provider rispondono
(0 + 0 sulla home)`. Gli Step 31–35 sono JS sopra questa build e non ne chiedono altre.

- **I due widget vanno dichiarati adesso, non agli Step 34–35 — e il piano non lo diceva.** Il
  plugin di `react-native-android-widget` ha `widgets: Widget[]` **obbligatorio**, e ogni voce
  diventa un `<receiver>` nel manifest: è configurazione nativa, quindi aggiungerne uno dopo
  vorrebbe dire una seconda build EAS, cioè esattamente ciò che questo step esiste per evitare.
  `Balance` e `MonthTotal` sono dichiarati qui; il 34 e il 35 restano JS puro.
- **`POST_NOTIFICATIONS` era già dichiarato dal manifest di `expo-notifications`**, che Android
  fonde da sé: il piano diceva di aggiungerlo, ed è ridondante. Resta in `app.json` accanto a
  `CAMERA` — ridondante per la stessa ragione — perché è il file che una persona legge per sapere
  cosa chiede l'app.
- **`expo config --type introspect` non espande l'AndroidManifest**: dà i permessi e basta. La
  verifica è stata fatta con un `expo prebuild --no-install` in un `android/` cancellato subito
  dopo, che ha mostrato i due receiver, i loro `@xml/widgetprovider_*` e i quattro `meta-data`
  delle notifiche. Quindici minuti di build EAS non si spendono per scoprire un nome sbagliato.
- **`SYSTEM_ALERT_WINDOW` e `VIBRATE` c'erano già.** Rifatto il prebuild con l'`app.json` di prima
  per attribuirli: vengono dal manifest di debug di React Native e dal dev client. Lo step aggiunge
  esattamente un permesso.
- **Il prebuild riscrive `expo start --android` in `expo run:android`**, ed è stato rimesso a posto:
  questo progetto non ha una cartella `android/` e compila su EAS.
- **`WIDGET_NAMES` è la stessa stringa di `app.json`, e la diagnostica la prova.** Il nome in
  `app.json` diventa una classe nativa, quello nel codice è la stringa con cui il JS la chiama: uno
  scarto di una lettera non dà errore di compilazione e allo Step 34 si vedrebbe solo come un widget
  che non si aggiorna mai. `getWidgetInfo` fallisce se il provider non esiste, e il passaggio 16 lo
  riporta.
- **Il passaggio 15 legge il permesso e non lo chiede** (`getPermissionsAsync`): su Android 13 il
  dialogo si rifiuta una volta sola, e una sonda non deve consumarlo.
- **`updatePeriodMillis: 0`**: nessun aggiornamento automatico. Il refresh in background è lo
  Step 36, dichiarato opzionale.
- **`npm audit` 28 → 29, e il +1 non è nuovo**: `react-native-android-widget` è segnalato perché
  dipende da `expo`, che dipende dalla catena metro/`image-size` già segnalata. Le «0 vulnerabilità»
  dello Step 0 sono ferme a quel giorno.

## Il promemoria spese (Step 31)

Un interruttore in Tu e una notifica locale che arriva dopo tre giorni senza registrare nulla.
Primo dei tre contenuti di notifica, tutto JS sopra la build dello Step 30.

- **È una scadenza, non una condizione, e non poteva essere altro.** Una notifica locale si
  programma **prima** e scatta da sola: nessuno la rilegge quando suona, e non c'è un processo in
  background che possa valutare lì per lì se ha ancora senso — quello è lo Step 36, opzionale.
  Quindi la regola si scrive come una data, ricalcolata nelle tre occasioni che l'app vede:
  apertura, spesa registrata, interruttore toccato. Ne segue che **il testo è vero per
  costruzione**: se una spesa fosse arrivata nel frattempo, quella notifica sarebbe stata disdetta.
- **Senza il riarmo all'avvio scatterebbe una volta sola**: una notifica programmata sparisce
  quando suona. `ReminderScheduler` sta sotto `ProfileGate`, non disegna niente, riarma a ogni
  apertura — e **rilegge il timestamp invece di scrivere «adesso»**, perché aprire l'app non è
  registrare una spesa: se lo fosse, il promemoria non arriverebbe mai a chi apre, guarda e non
  annota, cioè esattamente a chi l'ha chiesto.
- **L'ultima spesa sta in `app_meta`, non nel vault.** Di documenti Yjs ne è montato uno per
  volta: cercare la spesa più recente fra tutti i gruppi vorrebbe dire aprire ogni vault, N chiavi
  dal portachiavi e il motore da riassegnare. **Conta chi scrive, non chi riceve**: una spesa che
  arriva dall'altro telefono non sposta la scadenza, perché il promemoria riguarda l'abitudine di
  annotare. Il prezzo: in una coppia dove registra uno solo, l'avviso arriva a entrambi — ma a
  quello che non registra è vero.
- **Si disdice per tipo (`data.kind`), non per identificatore salvato.**
  `cancelAllScheduledNotificationsAsync` sarebbe già sbagliata allo Step 32; un id in `app_meta`
  sarebbe un secondo stato da tenere allineato, e uno rimasto indietro lascerebbe promemoria
  fantasma impossibili da disdire.
- **Il permesso si chiede accendendo l'interruttore, mai all'avvio**: su Android 13 il dialogo si
  rifiuta una volta sola, e spenderlo al boot vuol dire non poterlo più chiedere quando servirà.
- **La scrittura non è ottimistica**, al contrario del riordino della dashboard: prima il
  permesso, poi il salvataggio. Un interruttore acceso che non produce mai una notifica è peggio di
  uno che torna giù, perché non c'è modo di accorgersene se non aspettando invano.
- **Un permesso revocato non spegne l'interruttore di nascosto**: la voce resta accesa e una riga
  dice che è il sistema a bloccarla. Spegnerla d'ufficio farebbe sparire una scelta senza spiegarla.
- **Canale `LOW`**: compare senza suonare. `MIN` resterebbe ripiegato in fondo alla tendina, cioè
  invisibile a chi ha acceso l'interruttore per vederlo. Un canale per motivo, così si può zittire
  il promemoria dalle impostazioni di sistema senza perdere gli altri avvisi.
- **Due testi**: chi non ha mai registrato niente non ha «smesso», e dirgli «da 3 giorni» sarebbe
  falso. Stesso criterio di «Metà e metà».
- **Le venti in ora locale, ed è l'unico posto in cui l'ora locale è giusta**: `calendar.ts` sta in
  UTC perché confronta giorni fra due telefoni, qui «le venti» sono quelle di chi legge.
  L'aritmetica passa dai componenti del `Date`, o l'ultima domenica di ottobre l'avviso arriverebbe
  alle 19 — c'è il test.

## L'avviso di budget (Step 32)

Un secondo interruttore in Tu e una notifica che arriva quando una categoria tocca l'80% del limite
del mese o lo supera. Secondo dei tre contenuti di notifica, tutto JS sopra la build dello Step 30.

- **È l'opposto esatto dello Step 31, e vale la pena dirlo.** Il promemoria non poteva essere una
  condizione ed è diventato una scadenza; qui «hai superato il budget» **è** una condizione, e per di
  più una che cambia solo quando cambia il documento. Non c'è nessuna data da calcolare: si guarda, e
  se è appena successo si avvisa subito con un `ChannelAwareTriggerInput`, che consegna nell'istante
  ma **sul canale scelto** — `trigger: null` consegnerebbe altrettanto subito sul canale di default,
  cioè fuori dall'interruttore di sistema che questo step si è preso la cura di creare.
- **Ne segue il limite onesto, e sta scritto sotto l'interruttore.** L'avviso lo produce l'app
  guardando il documento, quindi **l'app deve essere aperta**: subito per una spesa registrata qui,
  alla prima apertura per una arrivata dall'altro telefono col sync. Un avviso in differita resta
  vero — il limite è superato adesso — e l'alternativa è lo Step 36, opzionale.
- **Il watcher si iscrive al documento, non a un gesto.** `useExpenseRegistered` dello Step 31 va
  chiamata dal form perché il promemoria dipende da un'azione; un budget dipende dal **documento** e
  sfonda anche per una spesa che nessuno ha toccato su questo telefono. `BudgetWatcher` sta accanto
  allo `Stack` e non nei Grafici: lì i budget si controllerebbero solo aprendo la scheda dove sono
  già disegnati.
- **Senza il gestore di primo piano lo step sarebbe invisibile.** `expo-notifications` di default non
  mostra niente mentre l'app è aperta, ed è esattamente lì che questo avviso nasce. `foreground.ts`
  decide **per tipo**: budget sì, promemoria no — quello inviterebbe ad aprire un'app già aperta — e
  ciò che non riconosce non lo mostra. Mai un suono in primo piano: il suono serve a chi non sta
  guardando lo schermo, e in primo piano quel caso non esiste.
- **Tre regole contro tre modi di ripetersi**, e i segni stanno in `app_meta` (`budget_alerts`),
  chiave `vaultId|mese|categoria`. **Il livello sale e non scende**, o un budget che oscilla intorno
  all'80% suonerebbe a ogni scontrino. **La prima volta si guarda e basta** — gruppo appena aperto,
  mese appena cominciato — perché «era già sforato quando ho cominciato a guardare» non è una notizia;
  è la ragione per cui i segni hanno due campi e non uno: senza `watched`, «tutto a posto» e «non ho
  mai guardato» sarebbero entrambi un elenco vuoto. **I segni si aggiornano anche a interruttore
  spento**, o riaccenderlo produrrebbe la raffica degli arretrati.
- **Si scrive prima e si avvisa dopo.** L'ordine inverso rifarebbe lo stesso avviso a ogni giro se la
  scrittura fallisse: un avviso perso si nota una volta, uno ripetuto fa spegnere l'interruttore.
- **I segni si potano al mese in corso**, e si può perché un mese finito non può più essere sforato:
  la spesa porta la data del giorno in cui viene registrata, e il form non ha un selettore di date. Si
  pota per mese e **non** per gruppo — i gruppi aperti sono più d'uno e ciascuno tiene il suo conto.
- **Anche l'80%, non solo il superamento**, benché il piano dicesse «soglia superata»: la soglia
  `near` esiste già nel core e il suo commento dice perché — «avvisare al 95% sarebbe inutile, a quel
  punto il mese è deciso». In Tu la percentuale si legge da `BUDGET_NEAR_THRESHOLD` invece di
  riscriverla a mano.
- **Un avviso solo anche quando i budget sono tre**, perché tre notifiche identiche in fila sono il
  modo in cui si smette di leggerle. Il caso singolo dice i numeri — sapere _quanto_ si è sforato
  distingue un avviso da un rimprovero — e il titolo del caso multiplo dice «superati» solo se lo sono
  tutti: con uno soltanto vicino sarebbe la solita frase falsa accanto a un numero.
- **Canale separato, importanza `DEFAULT`**: separato perché chi zittisce i promemoria dalle
  impostazioni di Android non deve perdere l'avviso di sforamento; `DEFAULT` e non `LOW` perché quello
  è un invito che ci si è chiesti, questo è un numero appena cambiato su cui si può ancora agire.
- **`packages/core` non è stato toccato.** `budgetStatuses` e `stateOf` decidono se un limite è vicino
  o superato; qui si decide solo se quello stato **è nuovo**. E `setReminder` è diventata
  `set(kind, on)`, la firma che lo Step 33 ha poi usato senza modificarla.

## La sincronizzazione ferma (Step 33)

Un terzo interruttore in Tu e una notifica che arriva quando le spese non raggiungono più gli altri
telefoni. Ultimo dei tre contenuti di notifica, tutto JS sopra la build dello Step 30.

- **È una condizione su una scadenza, cioè i due step precedenti insieme** — e il piano lo aveva
  previsto senza deciderlo. Si guarda come il budget (`SyncWatcher` accanto allo `Stack`), ma quello
  che si guarda è **da quanto dura**. Ne segue la scelta che regge tutto: i segni stanno su disco
  (`sync_alerts` in `app_meta`) e non in memoria, perché la durata da misurare è più lunga di una
  sessione dell'app e un contatore che riparte a ogni apertura non arriverebbe mai a
  ventiquattr'ore proprio per chi apre l'app tutti i giorni.
- **Due guai e non tre**, benché le fasi in errore siano tre. `blocked` è **fermo**: il relay
  rifiuta la chiave (401/403), il motore ha smesso di ritentare, e aspettare un giorno per dirlo
  regalerebbe un giorno di divergenza — si avvisa **subito**. `offline` ed `error` sono **in
  ritardo**: il motore riprova da solo e nove volte su dieci passa da sé, quindi si aspettano
  **ventiquattr'ore**.
- **`offline` conta come `error`, ed è la scelta discutibile dello step.** Lo Step 17 aveva stabilito
  che offline non è un errore del relay, e la schermata infatti lo dice senza allarme. Ma quello che
  l'avviso serve a evitare — credere che i due telefoni siano allineati quando non lo sono — succede
  identico nei due casi, e dopo un giorno «sono in aereo» non è più una spiegazione. Cambia il
  rimedio, non il fatto: a cambiare è il testo, non la regola.
- **`idle` e `syncing` non toccano niente**, ed è la riga più facile da sbagliare in silenzio:
  trattarle come «tutto a posto» azzererebbe il conto a ogni avvio, l'avviso non arriverebbe mai e
  non ci sarebbe modo di accorgersene se non aspettando invano.
- **Il watcher si iscrive alla fase, non allo stato intero.** `at` e `retryAt` cambiano a ogni giro
  di poll: dipendere dall'oggetto vorrebbe dire una lettura di `app_meta` ogni due secondi mentre
  tutto funziona. La fase basta perché ogni ciclo passa da `syncing` prima di ricadere in `error` o
  `offline`, quindi la scadenza si ricontrolla a ogni tentativo anche restando fermi su una
  schermata.
- **Le regole contro il ripetersi sono quelle del 32, su un altro asse.** Il livello **sale e non
  scende** (`offline`→`blocked` riavvisa, `blocked`→`error` no); **un avviso per episodio**, e
  l'episodio finisce al primo `synced`; **i segni si aggiornano anche a interruttore spento**, col
  solito prezzo — chi accende mentre il guaio è in corso non riceve niente per quel guaio lì.
  **Si scrive prima e si avvisa dopo.**
- **La potatura è ai gruppi che esistono ancora**, non ai mesi: un gruppo da cui si è usciti non può
  più sincronizzarsi, e senza potatura uscirne mentre il relay era giù lascerebbe una riga per
  sempre.
- **Il nome del gruppo entra nel testo**, a differenza dell'avviso di budget: quello si legge mentre
  lo si è appena provocato, questo si legge ore dopo, e con più gruppi «non si sincronizza» senza
  dire cosa obbliga ad aprire l'app. Il titolo del caso fermo è la stessa frase del pallino in Tu,
  presa da `describe.ts`.
- **Canale `sincronizzazione` separato, importanza `DEFAULT`**, e gestore di primo piano anche per
  questo: lo stato del sync si vede già, ma solo in Tu e in fondo alla lista spese, cioè dove chi ha
  il sync rotto potrebbe non passare per giorni. È la stessa ragione per cui il watcher non vive in
  una schermata.
- **`packages/core` non è stato toccato**, per il terzo step di fila. `SyncState` e `describe.ts`
  dicono **cosa** sta succedendo; qui si decide solo da quanto, e se è già stato detto.

## Il widget del saldo (Step 34)

Il saldo del gruppo aperto sulla schermata home di Android, primo dei due widget dichiarati in
`app.json` allo Step 30. Tutto JS sopra quella build, e senza chiederne un'altra.

- **Il widget non lo disegna l'app, e da qui viene tutto il resto.** Lo disegna il sistema quando
  lo chiede lui — widget appena aggiunto, telefono riacceso, rettangolo ridimensionato — cioè
  quasi sempre ad app chiusa. Risponde un **task headless**: il bundle JS senza provider, senza
  `Y.Doc` montato, senza chiave dal portachiavi. Quindi il disegno **non calcola, legge**: l'app
  calcola quando ha già tutto in mano (`WidgetPublisher` accanto allo `Stack`, dove stanno i due
  watcher) e lascia un foglietto in `app_meta` (`widget_snapshot`); il task lo raccoglie e lo
  disegna. Stessa divisione dei tre step di notifica, fra due lati che non sono nemmeno vivi
  nello stesso momento.
- **Nel foglietto ci sono frasi già fatte, non numeri.** Formattare un importo vuole il simbolo
  della valuta del profilo (Step 29), dire chi deve a chi vuole i nomi dei membri: le due cose
  che il task headless non ha. Salvare `cents` significherebbe rimontare metà app per riscoprire
  ciò che l'app sapeva già un istante prima.
- **`myBalance` è l'unico refactoring, e nasce da una differenza di forma.** La card in cima alle
  spese dice «Juju ti deve 25,00 €» in una riga; il widget ha un numero grande e una didascalia,
  quindi l'importo esce dalla frase. I fatti si decidono una volta sola, le parole due.
- **Da solo in un gruppo non si è «pari» con nessuno.** La card nasconde il saldo con un membro
  solo; il widget non può nascondere niente — è tutta la sua superficie — e dice «Solo tu in
  questo gruppo». Il widget che serve a chi è da solo è quello dello Step 35.
- **Niente data di aggiornamento, ed è una scelta.** Senza refresh in background il widget resta
  fermo finché l'app non si riapre; datarlo sarebbe onesto ma è un campo che nessuno legge, e il
  problema è quello che lo **Step 36** esiste per risolvere. Se dopo l'uso reale risulterà troppo
  vecchio, la risposta è aggiornarlo, non datarlo.
- **`apps/mobile/index.js` esiste per una ragione sola**: il task va registrato **all'ingresso del
  bundle**, perché ad app chiusa React Native cerca un task headless già registrato prima che
  qualunque componente esista. `main` non è più `expo-router/entry`. **Non serve una build EAS
  nuova**: l'app nativa apre l'entry virtuale di Metro, che risolve `main` al momento del bundle.
- **Il task apre il database con una connessione tutta sua** (`isolated`). Può partire mentre
  l'app gira, nello stesso runtime JS, ed expo-sqlite senza `useNewConnection` riusa la
  connessione già aperta: la `close()` del task l'avrebbe chiusa sotto i piedi all'app.
- **«Azzera questo telefono» adesso azzera anche la home.** `wipeDevice` porta via il foglietto
  con il resto di `app_meta`, ma nessuno ridisegnava il widget: il saldo dell'ultimo gruppo
  sarebbe rimasto sullo schermo fino al riavvio. `clearWidgets()` in `useWipeDevice` chiude il
  buco, ed è lo Step 22 applicato a una superficie che allora non c'era.
- **Il freno è nella scrittura, non nel calcolo.** Il saldo si rifà a ogni modifica del documento
  — lo stesso `computeBalances` della home, pagato anche a home chiusa — ma `publishSnapshot`
  confronta con il disco e quasi sempre non scrive: il documento cambia a ogni spesa, il saldo
  mostrato molto più di rado.
- **Due palette e non il tema dell'app**: Android sceglie fra `light` e `dark` **nel momento in
  cui disegna**, e un tema letto dall'app resterebbe chiaro sulla home scura di chi l'ha cambiato
  ad app chiusa. Dei componenti non si riusa niente (`RemoteViews`, non viste), dei token sì — e
  la palette ha ora un test che pretende `#RRGGBB`, perché il cast in `BalanceWidget.tsx` si fida
  di quello.
- **`MonthTotal` rispondeva ma non disegnava** fino allo Step 35, che gli ha dato un contenuto.

## Il totale del mese (Step 35)

Il secondo widget: quanto ha speso il gruppo aperto nel mese in corso. Chiude il filone dei
widget del piano v5.

- **Lo step è piccolo, ed è la notizia.** Le tre scelte dello Step 34 fatte prevedendo questa
  sessione — un campo per widget nel foglietto, la lettura difensiva campo per campo, il
  rettangolo condiviso — hanno retto tutte e tre: `month` è entrato accanto a `balance` **senza
  toccare una riga del saldo**, e c'è il test che dice che un foglietto scritto dal 34 continua a
  disegnare il saldo con il totale assente.
- **La didascalia nomina il mese e non dice «questo mese»**, ed è la decisione dello step. Senza
  refresh in background il numero resta quello dell'ultima apertura, quindi il primo di settembre
  «speso questo mese» sopra il totale di agosto sarebbe una frase falsa scritta da noi. «Speso in
  agosto» resta vero anche vecchio di un giorno. `in` e non `a` regge tutti e dodici i mesi senza
  scegliere fra «a gennaio» e «ad agosto».
- **Il totale è quello del gruppo, non la mia quota**: è lo stesso numero della card in cima alle
  spese, contato sulle stesse spese. La quota personale ha già il suo posto, ed è il saldo.
- **Non è rosso, e non è una dimenticanza.** `colors.expense` è il colore di un'uscita; la somma
  di tutte le spese del mese tinta di rosso diventerebbe un allarme. A dire se si sta spendendo
  troppo c'è il budget, che ha una soglia e una notifica sua.
- **`changedWidgets` ha sostituito `sameSnapshot`.** Con un widget bastava sapere **se** qualcosa
  era cambiato, con due serve sapere **quali**: una spesa tutta mia sposta il totale e non il
  saldo, un pareggio il saldo e non il totale. Senza la distinzione ogni spesa manderebbe due
  giri di `RemoteViews` al launcher invece di uno.
- **Un `WidgetPublisher` solo**, perché i due numeri dipendono dallo stesso documento e cambiano
  nello stesso istante: due componenti avrebbero riscritto lo stesso `app_meta` a turno, con le
  letture accavallate che `chain` esiste per evitare.
- **Un rettangolo solo per due widget** (`WidgetCard.tsx`): la sola differenza è il colore della
  cifra, passato come funzione del tema. `BalanceWidget.tsx` è diventato `views.tsx`.

## Il refresh in background (Step 36)

I widget si aggiornano da soli ogni mezz'ora, ad app chiusa. Era l'unico step del piano v5 marcato
opzionale, ed è l'unico che ha **chiesto una build EAS nuova** dopo quella dello Step 30: quella
build c'è dal 15 agosto e la porta anche quella installata oggi, del 5 settembre.

- **Ricalcolare non sarebbe servito a niente, e questa è la scoperta dello step.** Il documento
  locale non si muove da solo: il motore di sync gira solo dentro l'app. Un ricalcolo periodico
  darebbe gli stessi numeri di prima, tranne il primo del mese. Quindi il task headless **fa un
  giro di sync** — monta il vault, parla col relay, applica quello che arriva e riscrive il
  foglietto: fuori dall'albero React, quello che `VaultProvider` fa dentro.
- **Nessuna libreria nuova.** `expo-background-task` e `expo-task-manager` sarebbero stati due
  moduli nativi in più; il provider dei widget ha già la sua sveglia (`updatePeriodMillis`, minimo
  30 minuti), e quella sveglia entra dal `WIDGET_UPDATE` del task headless dello Step 34. Lo step è
  una riga di configurazione e un file di logica. **Ma quella riga finisce nell'XML del provider**,
  quindi serve una build.
- **La sveglia esiste solo se un widget è davvero sulla home**, che una libreria di background
  generica non avrebbe garantito: chi i widget non li usa non paga né batteria né rete.
- **Solo `WIDGET_UPDATE`.** `WIDGET_ADDED` e `WIDGET_RESIZED` arrivano mentre qualcuno **guarda** il
  rettangolo, e un giro di rete da qualche secondo davanti lo lascerebbe vuoto proprio allora.
- **Tre guardie.** Se l'app è in primo piano non si fa niente — due `SyncEngine` sullo stesso vault
  significano due scritture concorrenti, e la compattazione della persistenza non le regge.
  Venticinque minuti fra un giro e l'altro, perché **due widget sulla home sono due risvegli** e
  senza soglia sarebbero due giri identici. E il task **non semina**: seminare le categorie è una
  scrittura nel documento condiviso, e un telefono che scrive nel vault mentre nessuno lo usa è
  ciò che un refresh non deve fare.
- **Metà del valore è nell'altra direzione**, e il nome dello step non lo dice: `engine.start()`
  mette in coda il delta non ancora pubblicato, quindi le spese registrate mentre non c'era rete
  **partono da qui**, senza aspettare che qualcuno riapra l'app.
- **`composeSnapshot` e `CURRENT_GROUP_KEY` sono usciti allo scoperto** perché adesso hanno due
  chiamanti lontanissimi fra loro: l'albero React e un task headless. Due copie che devono dare lo
  stesso numero, di cui una impossibile da guardare mentre gira.
- **Il threat model ha tre voci nuove**, e la più importante è una conseguenza da non scoprire
  tardi: **un lock con biometria e il refresh in background si escludono a vicenda**, perché in
  background non c'è nessuno che possa autenticarsi.
- **`packages/core` non è stato toccato**, per il sesto step di fila — e stavolta è il fatto più
  significativo: il task headless usa `SyncEngine`, `VaultStore` e `SqliteYPersistence` come li usa
  l'app, senza una riga di adattamento. È la ricompensa della regola dello Step 0.

## L'infrastruttura i18n (Step 37)

Le frasi dell'app escono dai componenti ed entrano in due dizionari. `i18next` +
`react-i18next`, campo `language` sul profilo, selettore in Tu, e **una schermata tradotta per
intero** — `tu.tsx`, più le tre etichette dei tab.

- **`expo-localization` non è entrato, ed è la decisione dello step.** Il piano lo nominava, ma
  serviva a una cosa sola — sapere in che lingua è il telefono al primo avvio — ed è un modulo
  nativo: avrebbe reso questo il terzo step a chiedere una build EAS, e avrebbe **rotto l'app
  sulla build oggi installata**. Quella lettura la fa
  `Intl.DateTimeFormat().resolvedOptions().locale`, che su Hermes c'è già, dentro un `try` che può
  rispondere `null`. Stessa conclusione dello Step 36: la cosa che serviva c'era già.
- **L'ordine delle sorgenti è tutto lo step: scelta, poi telefono, poi italiano.** La scelta
  esplicita viene prima perché è l'unica fatta da una persona. `resolveLanguage` riceve la lingua
  di sistema come parametro invece di andarsela a prendere, ed è ciò che rende verificabile senza
  telefono la parte dove sta la decisione.
- **La regione si butta via**: le impostazioni danno `en-GB`, non `en`, e non esiste un dizionario
  `en-GB` distinto da `en-US`. Trattarli come lingue diverse vorrebbe dire non riconoscerne
  nessuna delle due.
- **L'italiano è la fonte, l'inglese la copia, e `fallbackLng` punta alla fonte.** `en.ts` si
  dichiara della forma di `it.ts`, quindi una chiave dimenticata è un errore di `tsc`; e quando la
  traduzione resterà indietro si leggerà la frase italiana, non la chiave grezza.
- **Tre test guardano quello che il tipo non vede**: la frase vuota, che a schermo sembra un
  problema di layout; il `{{segnaposto}}` perso in traduzione, che si legge come una frase senza
  il numero e senza errori; e l'italiano ricopiato di sotto per fretta. Oggi sorvegliano una
  cinquantina di stringhe, ma gli Step 38–39 ne porteranno qualche centinaio.
- **Due cose non passano da `t`**, e sono la stessa regola: i nomi delle lingue nel selettore
  («Italiano», «English») restano tali in ogni lingua, o chi apre quel selettore proprio perché
  non capisce non riconoscerebbe la propria; e i nomi di gruppi, categorie e persone non si
  traducono mai, perché stanno nel documento condiviso.
- **Lingua e valuta qui si separano.** Sono due campi gemelli nel profilo, ma la valuta è una
  scelta comune di fatto — valute diverse sommano unità diverse — mentre la lingua traduce l'app e
  nient'altro: due persone possono leggere lo stesso gruppo in due lingue senza che un numero
  cambi.
- **Il confine di ciò che è tradotto è netto**, e serve a non scambiarlo per un guasto: `tu.tsx`
  tutta, tab compresi; **non** la riga di stato del sync, che la scrive `describe.ts` e che
  compare identica anche in fondo alla lista spese. Tradurre un modulo condiviso vuol dire
  tradurre le schermate che lo usano, ed è lo Step 38.
- **Il threat model non cambia**: la lingua è una preferenza locale in `app_meta`, non esce dal
  telefono e non produce traffico. Le due librerie sono JS puro senza rete — nessun dizionario
  scaricato, nessun permesso nuovo — e `npm audit` non è cambiato.
- **`packages/core` non è stato toccato, per il settimo step di fila**: il core non ha stringhe da
  tradurre perché non ne ha mai scritte. Se un giorno servissero la posizione del simbolo di
  valuta o il separatore decimale per lingua — la nota in `currency.ts` lo prevede — quello sì
  entrerebbe lì.

## La traduzione delle tre schermate (Step 38)

Le tre che si aprono più spesso — spese del gruppo, nuova spesa, elenco dei gruppi — e i sei
moduli condivisi che ci scrivono dentro. Da una cinquantina di stringhe tradotte a duecento.

- **Il problema erano i moduli sotto, non le schermate.** `describe.ts`, `grouping.ts`,
  `balance-line.ts`, `split-text.ts`, `extra-fields.ts` e `list.ts` sono puri di proposito, ed è
  lì che arrivano i test: un hook non ce lo si può mettere. Fanno `import i18n from '@/i18n'` —
  il modulo che **inizializza** l'istanza, non il pacchetto `i18next` — così l'ordine è una
  proprietà del grafo degli import e non una cosa da ricordare.
- **La regola che ne segue, per tutto il resto della traduzione:** quelle funzioni leggono la
  lingua quando girano e non avvisano nessuno quando cambia. A far ridisegnare è
  `useTranslation()` nel componente, che quindi va chiamato **anche senza stringhe proprie**
  (`SyncBadge`, `GroupRow`), e un `useMemo` attorno a quelle chiamate vuole `t` fra le
  dipendenze.
- **Le date sono modelli, non elenchi di parole.** Tradurre i soli nomi dei mesi avrebbe dato
  «Monday 1 August»: in inglese il mese viene prima del giorno. Nel dizionario ci sono cinque
  modelli, e quattro cambiano forma fra le due lingue.
- **I plurali si contano a mano.** `PluralResolver.getRule` di i18next, letto nel sorgente,
  ripiega su una **regola finta** quando `Intl` manca: sceglierebbe sempre la stessa forma e
  scriverebbe «1 spese» senza dirlo. Lo stesso sorgente conferma però che `init` non può fallire
  per assenza di `Intl` — è dentro un `try` — il che ridimensiona un rischio dello Step 37.
- **I test erano diventati dipendenti dalla lingua della macchina**, ed è il guasto che lo step
  ha scoperto in sé stesso: forzando l'inglese ne falliscono **66**, tutti scritti negli step
  precedenti. Un `setupFiles` fissa adesso l'italiano prima di ogni test.
- **I widget sono entrati per forza**, pur essendo dello Step 39: la loro didascalia contiene il
  nome del mese, e sarebbe uscito «Speso in August». `UNKNOWN_BALANCE`/`UNKNOWN_MONTH` sono
  diventate funzioni — una costante di modulo congelerebbe la lingua all'import — e il task
  headless dello Step 36 applica la lingua del profilo.
- **Due cose non passano mai da `t`:** i nomi scritti nel documento condiviso (gruppi, categorie,
  persone, negozi, tag) e `state.message` del sync, che viene dal motore o dal relay — tradurlo
  vorrebbe dire avere l'elenco dei guasti previsti.
- **Resta italiano il formato dei numeri**, ed è il debito aperto dello step: vedi l'avviso in
  cima a questo documento.

## Il formato dei numeri per lingua (Step 39)

Non era nel piano dell'11 agosto: lo ha reso necessario lo Step 38, che ha tradotto tre
schermate lasciandole a scrivere «1.234,56» anche in inglese. **La numerazione da qui in poi è
scalata di uno**: la traduzione del resto è il 40, la verifica su telefono il 41.

- **Era l'unica cosa che la traduzione diceva ancora di falso.** «1.234,56» per un lettore
  inglese non è lo stesso numero scritto in un altro modo: è un numero diverso, perché per lui
  il punto è il decimale. Il resto dello Step 38 diceva qualcosa di _meno_ — la riga del sync
  in italiano, i nomi dei gruppi non tradotti — non qualcosa di sbagliato.
- **Il core riceve il formato, non se lo va a prendere.** `NumberFormat` (i due separatori, il
  lato del simbolo, cosa ci sta in mezzo) è un parametro di `formatCents`/`formatMoney` col
  default italiano, come dallo Step 29 il simbolo è un parametro. `packages/core` non può
  dipendere da `i18next` — regola dello Step 0, verificata da ESLint.
- **Simbolo e formato restano due scelte separate**, e non è pedanteria: si legge in inglese una
  spesa in euro, ed è il caso normale per chi vive qui e non parla italiano.
- **Un modulo, non un argomento in più.** `@/i18n/money` espone le due funzioni con la stessa
  firma di prima e la lingua dentro: il cambiamento su ognuno dei venticinque file che
  formattano denaro è stato **l'import**. Una regola ESLint vieta di importarle dal core, perché
  la prossima chiamata scritta per abitudine tornerebbe all'italiano fisso senza segnali — stesso
  meccanismo di `utf8ToBytes` allo Step 3.
- **Quattro punti componevano importo e simbolo a mano**, e sembravano formattazione: erano la
  decisione «il simbolo va dopo», vera in italiano e falsa in inglese. Tre sono diventati
  `formatMoney`; il quarto, la cifra grande dove il simbolo ha un colore suo, è diventato
  `HeroAmount` — che chiude anche una duplicazione che c'era già.
- **Un bug evitato**: `ExpenseForm` toglieva il raggruppamento con `replace(/\./g, '')`, e in
  inglese quel punto **è il decimale**. Aprire una spesa da 12,30 avrebbe mostrato `1230`, e chi
  avesse salvato senza guardare avrebbe moltiplicato per cento.
- **«CHF5.00» prende uno spazio**, deciso guardando il carattere di confine e non un elenco di
  valute: `CHF 5.00` e `CA$5.00` escono giusti tutti e due.
- **L'export CSV non è cambiato**, ed era già stato deciso bene: `csv.ts` ha una
  `centsToDecimal` sua, con un commento che dice di essere diversa da `formatCents` perché
  quella è «la forma italiana leggibile». Il file esportato è identico nelle due lingue, che è
  l'unica cosa sensata per un file che un foglio di calcolo deve rileggere.

## Il resto della traduzione (Step 40)

Grafici, dashboard, onboarding, pairing, backup, export, import, azzeramento, più budget,
categorie e pareggi del gruppo, e la sonda diagnostica — che il piano non nominava, ma restava
l'ultima schermata in italiano fisso. Da un centinaio di stringhe a circa settecento.

- **Il core torna a farsi toccare, per la seconda volta in due step.** `insights/query.ts`
  scriveva a mano «categorie», «Pagate da», «Tutte le spese»: adesso `queryParts`/
  `describeQuery` ricevono un `QueryStrings` da fuori, con un default italiano che tiene validi
  i test del core, esattamente come il `NumberFormat` dello Step 39. `@/i18n/query.ts` è il
  modulo che lo popola dal dizionario, e una regola ESLint in più vieta di importare
  `queryParts`/`describeQuery` dal core dentro `apps/mobile`.
- **Due costanti di modulo erano congelate nella lingua di sistema**, lo stesso guasto dei
  widget Android allo Step 38: `WIDGETS` (`dashboard/widgets.ts`) e `PERIOD_PRESETS`
  (`filters/period.ts`) sono diventate funzioni, chiamate a ogni render.
- **`charts/axis.ts` teneva un secondo elenco dei giorni della settimana**, in un ordine
  diverso da `date.weekdays` del dizionario: adesso legge quello, con l'indice spostato di uno.
- **Fatto in tre pezzi paralleli** invece che in un passo solo, a differenza del resto del
  piano — grafici/dashboard, onboarding/pairing, backup/export/import/azzera — verificati uno
  alla volta e uniti alla fine; un pezzo ha lavorato in un git worktree isolato per non
  scrivere sugli stessi due dizionari mentre un altro li stava ancora modificando.
- **Una frase con una parola in grassetto in mezzo non ha un modo pulito di tradursi** senza
  `Trans` di react-i18next, che il progetto non usa da nessuna parte: nei tre casi che contano
  di più visivamente — il pareggio in `settle.tsx`, l'avviso «gruppo nuovo» in `importa.tsx`,
  il nome dello switch in `azzera.tsx` — la frase è spezzata in due chiavi `before`/`after` che
  sandwichano lo `<Text>` in grassetto, invece di riscriverla come aveva fatto lo Step 38: qui
  l'ordine delle parti è lo stesso in italiano e in inglese, e riscrivere avrebbe voluto dire
  perdere l'enfasi su un numero che conta. Un quarto caso nel widget «Fra di voi» dei grafici
  era stato tradotto con la via dello Step 38 invece che con questa: incoerenza vera, trovata
  rileggendo e corretta riusando le due chiavi di `settle.tsx`.
- **Due commenti d'intestazione erano falsi** e non da oggi: `it.ts` diceva ancora «restano allo
  Step 39 i grafici…», `en.ts` diceva che i numeri restavano italiani, cosa smentita dallo
  Step 39 stesso senza che il commento fosse mai stato aggiornato. Corretti entrambi.

## Il reimport dell'export JSON (Step 42)

`parseVaultExport` in `packages/core/src/export/import.ts`, `VaultStore.importSnapshot`,
`GroupRegistry.createFromState` e la schermata `/importa`. Nasce da un'incoerenza: `/export` diceva
«per conservarli» e produceva un file che **nessuno sapeva rileggere**.

- **Non è il gemello di `/backup`, e la schermata lo dice in cima.** Ripristinare una chiave riapre
  _quel_ vault, sincronizzazione compresa. Importare un JSON ricostruisce i **dati** in un gruppo
  **nuovo**, con una chiave nuova: il file è in chiaro e non contiene alcuna chiave — non potrebbe,
  o chiunque lo riceva entrerebbe nel gruppo. Il gruppo importato non riceve gli aggiornamenti degli
  altri telefoni, e per tornare a condividerlo serve un invito.
- **Il file si rifiuta intero, il record si scarta da solo.** Il primo quando non si sa cosa sia
  (JSON illeggibile, `format` sbagliato, versione futura), il secondo quando il file è giusto ma la
  riga non sta in piedi — e **ogni scarto porta il motivo** fino a schermo, raggruppato per motivo e
  non per record. Un import che perde righe in silenzio farebbe credere di aver riavuto tutto.
- **Le invarianti si difendono alla porta.** È l'unico punto in cui dei record entrano già formati
  senza passare da `addExpense`: quote che sommano al totale, importi interi, `paidBy` e quote
  intestate a membri che esistono davvero. Una spesa pagata da un id assente comparirebbe nei totali
  e sparirebbe dai saldi — la stessa famiglia del bug dei membri duplicati dello Step 11.
- **Categoria e budget hanno criteri diversi**: una spesa con categoria assente entra **senza**
  categoria (`categoryId` è già nullabile), un budget senza categoria si scarta perché non
  comparirebbe da nessuna parte.
- **I file v1 si leggono, quelli di versione futura no.** Gli stessi fallback (`''` e `[]`) di
  `readExpense` per `store` e `tags`; il rifiuto in avanti è la regola dei formati binari di
  [architecture.md](architecture.md) applicata qui.
- **`importSnapshot` conserva gli id ed è tutto il punto**: `newId` spezzerebbe `paidBy`, le chiavi
  di `split.shares` e i due membri di ogni pareggio. Non valida — quella è del parser, e due regole
  divergono — e scrive in **una sola transazione**, quindi un solo update Yjs. `assertEmpty` rifiuta
  un documento che ha già dei record: la fusione cambierebbe dei saldi.
- **Il gruppo nasce già pieno.** `createFromState` scrive lo stato nel log prima che qualcuno possa
  aprirlo, con lo stesso `seedDocument` che usa `regenerate` — passare dal runtime avrebbe lasciato
  una finestra con un gruppo vuoto visibile.
- **L'export non porta il nome del gruppo** (sta in `meta`, che `VaultSnapshot` non attraversa): si
  propone la data del file e si lascia cambiare, invece di alzare la versione del formato.
- **Si incolla, non si sceglie un file**: `expo-document-picker` è un modulo nativo. Sesta volta.

## L'avviso «chiave non salvata» (Step 43)

Il quarto interruttore in Tu, `features/notifications/backup.ts`, `BackupWatcher` accanto agli altri
due watcher, e `recordBackup` chiamata da `/backup` quando la cifratura riesce.

- **È il rischio peggiore dell'app, e finora stava scritto dove lo legge solo chi non ne ha
  bisogno**: la frase «persa la chiave, i dati non tornano» è in cima a `/backup`, cioè la legge chi
  il backup lo sta già facendo.
- **La `vaultKey` non cambia mai, quindi l'avviso è più semplice degli altri tre.** Niente scadenza
  da riarmare, nessun livello che sale: o la chiave è al sicuro o non lo è, e salvata una volta il
  gruppo esce dal giro per sempre.
- **Soglia in spese, non in giorni** (cinque): quello che si rischia si misura in quanto c'è dentro,
  e avvisare un gruppo vuoto insegnerebbe a ignorare l'avviso prima che diventi vero.
- **Un avviso per gruppo, mai ripetuto**, come «un avviso per episodio» dello Step 33 — applicato a
  un episodio che non finisce.
- **«Non risulta» e non «non hai salvato».** L'app conosce i backup che ha visto fare, e prima di
  oggi quel segno non lo scriveva nessuno: un gruppo salvato l'anno scorso risulterà «mai salvato».
  La prima frase è vera in entrambi i casi, la seconda sarebbe falsa in uno — stessa disciplina che
  ha bocciato «Metà e metà» al passo 7 del redesign.
- **`parseBackupMarks` sbaglia dalla parte opposta a `parseSyncMarks`**, di proposito: là un segno
  illeggibile vale «mai visto» per non avvisare su un guasto finito, qui vale «mai salvato» perché
  sbagliare di là produrrebbe silenzio su una chiave a rischio.
- **Marcare il backup è il massimo osservabile**: né il foglio di condivisione né gli appunti dicono
  se il file è stato conservato. «Salvato» qui significa «la chiave cifrata ha lasciato l'app».

## I due bug che rendevano sbagliati i numeri sono corretti

Entrambi nel codice e coperti dai test. **Nessuno dei due è ancora stato visto risolto su due
telefoni veri** — è la verifica che manca, e va fatta in entrambe le direzioni.

- ~~**La sincronizzazione è unilaterale.**~~ **Corretto allo Step 10.** `SyncEngine.start()` ora
  pubblica il delta fra il documento e lo state vector dell'ultima pubblicazione riuscita, che il
  `SyncCursorStore` ricorda. Copre lo storico precedente al vault, il seed, la chiave adottata su un
  documento già pieno e gli update prodotti a motore spento. Insieme è stato corretto un secondo
  difetto trovato leggendo: su una pagina interamente indecifrabile il cursore saltava a `head`, cioè
  alla fine dell'**intero** log, perdendo in silenzio tutti gli update validi che seguivano.
- ~~**I membri si duplicano e il saldo è sbagliato.**~~ **Corretto allo Step 11.** Il membro non
  nasce più da un id casuale generato su ogni dispositivo, ma dal **profilo**: `profileId` è lo
  stesso su tutti i gruppi e non cambia mai. Le categorie di default non vengono più seminate da chi
  **entra** in un vault esistente — era la ragione delle sedici invece di otto.

> **Non serve più cancellare i dati a mano.** Lo faceva prescrivere l'assenza di migrazione; dallo
> Step 12 la **ripartenza pulita è automatica**: al primo avvio l'app trova lo schema a vault unico,
> elimina quelle tabelle e la vecchia chiave, e riparte. Il profilo sopravvive. Il pairing va rifatto,
> perché la vecchia chiave è stata eliminata insieme ai dati che il vecchio membro «Io» rendeva
> sbagliati.

## Riferimenti operativi

- Repo: https://github.com/FRFAL99/JuTrack (privato)
- Relay in produzione: **https://jutrack-relay.jutrack-relayfrfal.workers.dev**
- Account Cloudflare: `francesco.fallavena@gmail.com`, già autenticato in `wrangler`

```bash
npm run format:check && npm run lint && npm run typecheck && npm test   # verifica completa
cd services/relay && npm run e2e                       # prova cifrata contro il relay
cd apps/mobile && npx expo export --platform android   # il bundle regge?
npm run prova                                          # la checklist end-to-end, senza telefono
npm run peer -- crea "Prova"                           # un secondo dispositivo, interattivo
npm run icone                                          # rigenera i sette PNG dal vettoriale
npm run icone -- --verifica                            # …o controlla soltanto che combacino
```

Sono esattamente i passaggi della CI, nello stesso ordine: `.github/workflows/ci.yml` gira a ogni
push, su qualunque ramo.

`expo export` va eseguito a ogni step: ha già intercettato una trappola che né typecheck né test
vedevano.

## L'app gira sul telefono ✅

**Bloccante risolto il 2026-08-01.** La causa non era nel codice: **Metro era in esecuzione dalla
root del monorepo** invece che da `apps/mobile`, e da lì non esiste alcun progetto Expo — l'entry
point non si risolveva e il server rispondeva 404 a ogni richiesta di bundle. Storia completa e
lezione di metodo in [troubleshooting-avvio-app.md](troubleshooting-avvio-app.md).

```bash
cd apps/mobile && npx expo start --dev-client    # MAI dalla root del monorepo
```

Development build EAS installata su Android — **dal 5 settembre 2026 quella del commit `9606e0f`**,
vedi qui sotto. **Diagnostica: 16 passaggi su 16, «TUTTO OK»** — Yjs,
`Y.Doc` con lo shim lib0/webcrypto, crypto su Hermes vero, XChaCha20-Poly1305, SQLite, SecureStore,
relay in produzione, invito di pairing, QR, fotocamera, **notifiche locali e widget Android**.

- Progetto EAS: `@frfal/jutrack`, build con `npx eas-cli build -p android --profile development`
- Il keystore Android è custodito da EAS: serve per ogni aggiornamento futuro dell'app installata

> **Le build fatte finora sono quattro, e quella installata oggi è l'ultima.** Vanno scritte tutte,
> perché per un mese questo documento ne ha annotata una sola e ha mandato a rifare lavoro già
> fatto:
>
> | Data       | Commit    | Cosa ha portato di nativo                                                                                                          |
> | ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
> | 2026-08-01 | `5c5db2e` | Il collegamento a EAS e `expo-camera`. La prima, diagnostica 14/14                                                                 |
> | 2026-08-12 | `aff8aa2` | Step 30: `expo-notifications`, `react-native-android-widget`, e finalmente `expo-file-system` ed `expo-sharing`. Diagnostica 16/16 |
> | 2026-08-15 | _(ramo)_  | Step 40. Porta con sé l'`updatePeriodMillis` dello Step 36, **e nessuno l'ha annotato**                                            |
> | 2026-09-05 | `9606e0f` | **Installata.** L'icona del passo 45, e ancora l'`updatePeriodMillis`                                                              |
>
> La build del 12 agosto è quella dello Step 30: la diagnostica rispondeva
> `15. notifiche locali: modulo disponibile, permesso non concesso` e
> `16. widget Android: 2 provider rispondono (0 + 0 sulla home)`. «Permesso non concesso» e gli zeri
> erano **l'esito atteso** di allora: il permesso l'ha poi chiesto lo Step 31, il saldo ha ricevuto
> un contenuto con lo Step 34, e «speso questo mese» lo riceve col 35. Da rifare sulla build attuale,
> dove **gli zeri sono un difetto e non un'attesa**.
>
> **Sulla build del 5 settembre non c'è più nulla che il telefono non possa eseguire**: è la punta di
> `main`, quindi Metro serve esattamente il JS che sta nel binario, e sia lo Step 36 sia l'icona sono
> dentro. Il `git log` non si è mosso da lì, quindi non serve un'altra build finché `app.json` non
> cambia.
>
> **Dal 12 agosto ci sono anche `expo-file-system` ed `expo-sharing`**, aggiunti allo Step 9 e per
> quattro mesi mai finiti in una build: il foglio di condivisione dell'export dovrebbe funzionare,
> invece di ripiegare sugli appunti. **Non è stato ancora guardato** — vedi la lista qui sotto.

## Lo splash e la pipeline degli asset (Step 46)

Due cose che il negozio avrebbe reso visibili, e una terza che era un'affermazione senza codice
sotto.

**All'avvio c'era un lampo bianco.** `expo-splash-screen` non era fra le dipendenze e `app.json` non
nominava nessuno splash: dopo l'icona, è la seconda cosa che un utente vede. E
`assets/splash-icon.png` era del 1° agosto, **non referenziato da nessuna parte** — avanzo dello
scaffold Expo esattamente come lo era l'icona prima del passo 45.

**Lo script che rigenera le icone non esisteva.** `STATO.md` e il devlog lo descrivevano nel
dettaglio — la scala 1.18, i colori letti dal sorgente, la J come tracciato — ma il commit `9606e0f`
aveva aggiunto il vettoriale e i PNG **senza il programma che li produce**, e in tutto il repo
`icon-source` compariva solo dentro i due documenti che ne parlavano. Era un file usa e getta. È lo
stesso difetto della build annotata male: **un documento che afferma una proprietà del repo che il
repo non ha**, e si è pagato subito, perché lo splash è un settimo PNG da tirare fuori da quello
stesso SVG.

### `npm run icone`

Lo script sta in [`apps/mobile/scripts/icone.mts`](../apps/mobile/scripts/icone.mts) e produce
**tutti e sette** i PNG dal solo `icon-source.svg`:

| File                          | Lato       | Contenuto                                   |
| ----------------------------- | ---------- | ------------------------------------------- |
| `icon.png`                    | 1024       | completo, opaco                             |
| `playstore-512.png`           | 512        | completo, opaco — per la scheda del negozio |
| `favicon.png`                 | 48         | completo                                    |
| `android-icon-background.png` | 512        | solo fondo                                  |
| `android-icon-foreground.png` | 512        | solo segno                                  |
| `android-icon-monochrome.png` | 432        | solo segno, bianco, la J resta un buco      |
| `splash-icon.png`             | 1024       | solo segno — **nuovo**                      |
| `store/feature-graphic…`      | 1024 × 500 | l'insegna della scheda del negozio          |

Due regole scritte nel sorgente perché vengono da altrettanti difetti già pagati: **i colori si
leggono dal file** e non si scrivono nello script (la prima versione li aveva dentro, e ne uscì un
sorgente che diceva indaco e dei PNG che restavano viola), e **ogni estrazione asserisce** — se un
id sparisce dall'SVG lo script muore con un messaggio invece di produrre un'icona muta, perché un
fondo trasparente o un segno mancante si notano solo guardando l'immagine, cioè mai.

**L'insegna del negozio esce dallo stesso sorgente**, e non sta in `assets/` ma in `store/`: non è
un asset dell'app, non deve entrare nel bundle, e si carica a mano nel Play Console. Riusa la
geometria del vettoriale invece di ridisegnarla — `<defs>` porta la maschera con la J e il gruppo
`mark` viene riscalato — così **insegna e icona non possono divergere**. È l'unico file che dipende
da un **font installato sulla macchina** (`Noto Sans`), cioè proprio la dipendenza invisibile che il
commento dell'icona dice di evitare: si accetta perché non entra nell'app e si carica una volta
sola, ma non in silenzio — `fontDisponibile()` ferma lo script prima di disegnare, invece di
lasciare che librsvg sostituisca un carattere senza dirlo.

**La prova che lo script ricostruisce davvero la pipeline persa, e non una simile:**
`npm run icone -- --verifica` confronta quello che produce con quello che sta su disco **decodificato
in pixel**, non byte per byte, e sui sei PNG già spediti lo scarto massimo per canale è **0**. Il
solo divergente era `splash-icon.png`, cioè lo scaffold. Dalla rigenerazione i file sono anche più
piccoli — `icon.png` -47%, il fondo adattivo -70% — perché l'encoder è configurato, ma **i pixel
sono gli stessi**: nessuna icona è cambiata.

### Lo splash

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-icon.png",
    "imageWidth": 300,
    "resizeMode": "contain",
    "backgroundColor": "#F7F7F9",
    "dark": { "backgroundColor": "#0B0B10" }
  }
]
```

- **Il fondo è `background` di `theme/tokens.ts`, non quello dell'icona.** Sono due bianchi diversi
  — `#F7F7F9` contro `#F3F2F2` — e la scelta è deliberata: il compito dello splash è **sparire senza
  farsi notare** quando l'app prende il suo posto, quindi deve combaciare con la schermata che
  arriva, non con l'icona da cui viene il disegno.
- **Un solo PNG per i due temi.** Il segno è indaco su trasparente e si legge su entrambi i fondi:
  cambia solo `backgroundColor`. Senza il ramo `dark`, un telefono in tema scuro lampeggerebbe di
  bianco a ogni avvio.

### `sharp` era una dipendenza invisibile

Rasterizza lui l'SVG, ed era nell'albero **solo di rimbalzo**: arrivava da `miniflare`, che è
tooling di test del relay. Un aggiornamento di quel pacchetto avrebbe fatto sparire la pipeline
delle icone senza che nulla lo segnalasse — lo stesso genere di dipendenza invisibile che era già
costato giorni con Metro e che il commento dell'SVG cita a proposito del font. Adesso è dichiarata
in `devDependencies` della root, alla **0.35.4**: sotto quella versione ha un avviso `high` su
libheif.

> Resta una copia di `sharp@0.35.2` annidata sotto `miniflare`, che l'avviso ce l'ha ancora.
> Ripulirla vuol dire un salto di major di `@cloudflare/vitest-pool-workers`: è tooling di test, non
> tocca né l'app né il relay in produzione, e non decodifica HEIF di nessuno. Annotato, non fatto.

**La build c'è**: profilo `preview`, commit `b2425b7`, 12 settembre 2026, 23 minuti. È la prima
build autonoma della storia del progetto, e lo splash è stato visto funzionare su telefono.

## Le correzioni senza passare dal negozio (Step 47)

Una volta pubblicata, il primo difetto vero lo scopri da utente. Senza questo, il giro per
correggerlo è build EAS → revisione del Play Store → attesa, e nel frattempo chi ha installato
l'app ha quel difetto. Con `expo-updates` il JavaScript si spedisce da qui in qualche minuto.

`expo-updates@~57.0.22`, più due righe in `app.json` e un canale per profilo in `eas.json`. Nessun
codice: col comportamento di default l'app controlla all'avvio e applica al lancio successivo.

### `runtimeVersion` a impronta, e la ragione è la storia di questo progetto

```json
"runtimeVersion": { "policy": "fingerprint" },
"updates": { "url": "https://u.expo.dev/<projectId>" }
```

La policy decide **a quali build può arrivare un aggiornamento**, ed è la scelta che conta. Con
`appVersion` basta che coincida il numero di versione: un aggiornamento JS che si aspetta un modulo
nativo assente **arriverebbe lo stesso**, e l'app si chiuderebbe all'avvio sul telefono di chi l'ha
installata — senza nessun modo di rimediare se non un'altra release.

Con `fingerprint` l'aggiornamento raggiunge **solo** le build il cui lato nativo combacia davvero:
l'impronta è l'hash di 118 sorgenti — i moduli autolinkati, i config plugin, `app.json`. Oggi vale
`da213b95…`, e si ricalcola con:

```bash
cd apps/mobile && npx expo-updates fingerprint:generate --platform android
```

È la policy giusta **proprio per questo progetto**, che ha già pagato due volte lo scarto fra ciò
che il JS si aspetta e ciò che il binario contiene: la development build senza `expo-file-system`,
e l'`updatePeriodMillis` che stava in una build che nessuno sapeva di avere.

> ⚠️ **Fra le 118 sorgenti c'è `packageJson:scripts`.** Aggiungere un comando `npm` — come il
> `npm run icone` dello Step 46 — **cambia l'impronta**, e da quel momento le build installate prima
> non ricevono più aggiornamenti: non si rompe niente, ma smettono in silenzio di aggiornarsi.
> È il prezzo di una policy severa, e va saputo prima di toccare `package.json` con leggerezza.

### I canali

Ogni profilo di `eas.json` ha adesso il suo (`development`, `preview`, `production`): un
`eas update --channel preview` raggiunge le build di prova senza sfiorare quelle del negozio. La
build del 12 settembre ha **creato da sé** il canale e il ramo `preview` su EAS, che è la conferma
che il collegamento è vivo.

**Cosa `expo-updates` non può fare:** tutto ciò che è nativo. Un modulo nuovo, un permesso, una riga
di `app.json` — quelli restano build EAS più release. Serve a correggere il JavaScript, che in
JuTrack è quasi tutto, non a evitare il negozio.

## Il crash reporting, scritto e poi ritirato (Step 48)

**Sentry è stato installato, configurato e tolto lo stesso giorno.** Vale la pena scrivere perché,
perché la decisione va rispettata anche fra sei mesi e le ragioni di allora non saranno più in vista.

Il problema che risolveva è reale: **JuTrack è cieca dopo la pubblicazione.** Il Play Console mostra
i crash **nativi** attraverso gli Android Vitals, ma non quello che succede nel JavaScript — che in
questo progetto è quasi tutto. Un difetto sul telefono di qualcun altro non lascerà traccia, e
l'unico segnale sarà una recensione o un messaggio all'indirizzo dell'informativa.

Il costo era la catena: account su un servizio terzo, scelta irreversibile della regione dei dati,
un DSN, **un secondo credenziale** per caricare le source map — senza le quali le tracce sono
bytecode Hermes minificato e non si leggono — e la riscrittura dell'informativa privacy, che va poi
ridistribuita. Quattro passaggi manuali prima che la prima riga serva a qualcosa.

**Francesco ha deciso che non vale il prezzo adesso**, e per una versione iniziale è difendibile: gli
Android Vitals arrivano gratis con la pubblicazione, non chiedono nessuna integrazione e **non
costano una riga di informativa**, perché è il negozio a raccoglierli e non l'app a mandarli.

Quello che si perde, detto chiaramente: **gli errori JavaScript non li vedrà nessuno.** Un guasto in
un `useEffect`, un campo letto da un record che non ce l'ha, una `Promise` rifiutata — cioè le cose
che questo progetto ha effettivamente incontrato — non appariranno in nessun cruscotto.

### Cosa resta nel repo

Niente di Sentry: pacchetto, config plugin, `extra.sentryDsn`, la cartella
`features/diagnostica/` coi suoi 16 test e l'aggancio in `index.js` sono stati rimossi tutti.

**L'informativa privacy invece non è tornata identica a prima**, ed è la cosa da non perdere: la
sezione **«Aggiornamenti dell'app»** resta, perché lo [Step 47](#le-correzioni-senza-passare-dal-negozio-step-47)
resta, e chiedere a Expo se esiste un aggiornamento è comunque un terzo contattato. «Condivisione con
terzi» elenca quindi **due** fornitori — Cloudflare ed Expo — e un capoverso nuovo spiega che i dati
sui blocchi raccolti da Google appartengono al negozio e non all'app.

I test dell'informativa sono diventati simmetrici, e vale come regola generale: uno controlla che i
fornitori contattati **siano nominati**, l'altro che Sentry **non** compaia. Dichiarare un
trattamento che non avviene è inesatto quanto tacerne uno che avviene.

### Se un giorno si cambia idea

Il lavoro fatto non era sbagliato, era prematuro. La parte che varrà la pena rileggere nel devlog è
**cosa non si può lasciare uscire**: Sentry coi valori di default allega a ogni evento le richieste
di rete — e gli URL del relay contengono il `vaultId` — e la console, che può contenere importi.
Un'app che promette «il nostro server non può leggere le tue spese» e poi carica briciole con dentro
le spese si smentisce da sola, e non se ne accorgerebbe nessuno, perché quel materiale si vede solo
aprendo i rapporti sul servizio.

## La verifica su telefono del 12 settembre (Step 41)

**È la mattina in cui il criterio di «fatto» end-to-end è stato soddisfatto.** Mancava al piano
originale, al v2, al v3, e il v4 lo aspettava per poter dire qualcosa dei suoi due campi nuovi. Dal
1° agosto era la riga più vecchia di tutta la lista qui sotto.

Il secondo dispositivo era `npm run peer` (vedi
[prova-con-un-telefono-solo.md](prova-con-un-telefono-solo.md)), tenuto vivo per tutta la sessione
contro il relay in produzione, sul gruppo di prova «Prova sync».

### Visto dai log del peer e da uno screenshot, non solo riferito

Queste hanno una prova che non passa dalla memoria di nessuno:

- **Il deep link col fragment, per il giro intero.** Invito mandato **su WhatsApp**, toccato dalla
  chat, pagina `/j` aperta nel browser, bottone toccato, app aperta sul gruppo giusto. Era il punto
  rimandato quattro volte. La prova che il `k=` è arrivato non è un messaggio a schermo: senza la
  chiave il vault non si decifra e l'ingresso non sarebbe avvenuto affatto.
- **Due membri, non quattro, e col nome giusto.** Il peer ha visto
  `👤 nuovo membro: Fra (a5ec0cb2…)`: il membro è nato dal **profilo**, non da un id casuale. È la
  metà «app» del bug dei saldi dello Step 11, quella che un peer scritto a mano non avrebbe colto.
- **La domanda «chi sei in questo gruppo?»**, senza la quale il membro non esisterebbe.
- **Il sync nei due versi, senza toccare niente.** Una spesa dal peer è comparsa sul telefono
  **istantaneamente e da sola**, senza tirare giù per aggiornare; una dal telefono è arrivata
  decifrata al peer. Le quattro spese del telefono sono arrivate al peer **via GET**, con il
  contatore dei POST del peer fermo alle sue: nessuna scorciatoia locale, il giro è quello vero.
- **I saldi coincidono col calcolo a mano.** Dopo le prime due spese: `Fra: 3,85 € /
Peer-default: -3,85 €`, contro 32,30 in cassa e 16,15 di quota a testa.
- **La coda offline dello Step 17.** Telefono in aereo, due spese — **visibili in coda
  nell'interfaccia**, che è la metà di prodotto della stessa cosa — rete riaccesa, e sono partite da
  sole in **~5 s**, arrivate al peer **nello stesso secondo**: la coda si svuota in blocco, serializzata.
  Cinque secondi non contraddicono i 15 s di `offlineRetryMs`: è un **riprova ogni** 15 s, quindi
  riaccendendo la rete si cade in un punto a caso della finestra, e il numero da confrontare è il
  massimo.
- **I due widget, verificati contro un calcolo indipendente.** Sulla home: saldo **33,60 €**
  («Peer-default ti deve») e mese **105,80 €** («Spese in settembre»). Il peer, che fa i conti per
  conto suo, diceva nello stesso momento `Fra: 33,60 €` e otto spese che sommano **105,80 €**.
  Identici al centesimo.
- **La prova che distingue i due widget**, quella che con un widget solo non si poteva fare: una
  spesa da **5,00 € tutta sua** ha portato il totale del mese da 100,80 a 105,80 e ha lasciato il
  saldo **fermo a 33,60**. È lo Step 35 nel suo punto esatto, dimostrato dall'aritmetica.
- **Il selettore di widget di Android**, che la diagnostica non può guardare: entrambe le voci
  compaiono cercando «ju», con i nomi giusti, la dimensione **3 × 2** e le descrizioni scritte in
  `app.json` («Quanto ti devono e quanto devi nel gruppo aperto», «Il totale del mese in corso, nel
  gruppo aperto»).
- **La didascalia nomina il mese** — «Spese in settembre», non «questo mese». È la ragione per cui
  lo Step 35 non usa la parola «questo», e si vede solo a widget popolato.

### Riferito da Francesco, che aveva il telefono in mano

Stessa sessione, senza una traccia che io possa rileggere. Vale come verifica — è lui che guarda —
ma è bene che si sappia di che tipo di prova si tratta:

- **Tutto il Blocco 1**: apertura con dati preesistenti, navigazione della nuova radice del tab
  Gruppi, il form della spesa e la sua tastiera, le cinque `NavCard`, grafici e filtri, la dashboard
  che sopravvive a chiusura e riapertura, valuta e lingua in Tu, e il `12.30` invece di `1230` in
  inglese. Riferito come «mi tornano, su questo non ho problemi», **senza un resoconto voce per
  voce**: le tre che chiedono di chiudere e riaprire l'app (dashboard, valuta, e il campo importo in
  inglese) sono quelle che meriterebbero una seconda passata prima di considerarle chiuse.
- **Il Blocco 3 tranne i widget**: diagnostica, permesso delle notifiche concesso dallo Step 31,
  avviso di budget dello Step 32 con la sua notifica in primo piano e il canale separato. Riferito
  come «ho testato tutto e mi sembra ok».

### Il difetto trovato

- **Le anteprime nel selettore di widget sono due riquadri vuoti** con la sola icona dell'app al
  centro, invece di mostrare come sarà il widget. Etichette, dimensioni e descrizioni sono giuste —
  quelle vengono da `app.json` — ma manca l'anteprima vera, e Android ripiega sull'icona. È
  cosmetico e non tocca il funzionamento: **i widget, una volta messi sulla home, si popolano
  correttamente**. Francesco l'ha visto e ha deciso di rimandarlo. Sta nella lista qui sotto.

### Cosa resta, dopo questa mattina

Quello che chiede **tempo** più che attenzione: la mezz'ora ad app chiusa dello Step 36, i tre
giorni del promemoria dello Step 31, le ventiquattr'ore del caso _in ritardo_ dello Step 33, e il
primo del mese dello Step 35. Più lo Step 33 nel suo caso _fermo_ e lo Step 14, che si provano
insieme rigenerando un gruppo. E le voci della lista qui sotto che questa sessione non ha toccato.

## Se un giorno si vuole pubblicare

Non è stato fatto, per scelta: si sta ancora provando la development build — quella del 5 settembre,
che è la punta di `main`.

```bash
cd apps/mobile && npx eas-cli build -p android --profile preview      # APK autonomo, senza Metro
cd apps/mobile && npx eas-cli build -p android --profile production   # app bundle per il Play Store
```

- Piano EAS Free: **15 build Android al mese**, concorrenza 1, timeout 45 minuti. Ne sono state
  consumate **tre in agosto** (1, 12 e 15) e **una a settembre** (il 5), tutte col profilo
  `development` e tutte riuscite, fra i 13 e i 19 minuti l'una.
- Il keystore è custodito da EAS ed è quello che lega gli aggiornamenti all'app già installata:
  perderlo significa non poter più aggiornare quell'installazione.
- Il profilo `preview` è quello che serve per far provare l'app a qualcun altro: gira senza Metro,
  quindi senza il computer acceso.
