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
> [La verifica su telefono](archivio/stato-step-0-60.md#la-verifica-su-telefono-del-12-settembre-step-41)**, divisa fra ciò che
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
> l'`updatePeriodMillis: 1800000` dello [Step 36](archivio/stato-step-0-60.md#il-refresh-in-background-step-36), che finisce
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
> **Notifiche e widget sono tutti nel codice**: lo [Step 31](archivio/stato-step-0-60.md#il-promemoria-spese-step-31), lo
> [Step 32](archivio/stato-step-0-60.md#lavviso-di-budget-step-32) e lo [Step 33](archivio/stato-step-0-60.md#la-sincronizzazione-ferma-step-33) per le
> tre notifiche, il [34](archivio/stato-step-0-60.md#il-widget-del-saldo-step-34), il [35](archivio/stato-step-0-60.md#il-totale-del-mese-step-35) e il
> [36](archivio/stato-step-0-60.md#il-refresh-in-background-step-36) per i widget. **Anche la traduzione è tutta nel codice**,
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
