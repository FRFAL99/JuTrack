# Stato del progetto — punto di partenza

> Aggiornato: **2026-09-15**

Dove siamo oggi, cosa manca e cosa è bloccato. Niente cronaca: quella sta in
[devlog.md](devlog.md), e il racconto degli Step 0–60 che questo file ha accumulato fino al 13
settembre è in [archivio/stato-step-0-60.md](archivio/stato-step-0-60.md).

**La regola che tiene corto questo documento: quando una riga di «cosa manca» diventa fatta, si
cancella.** Non si sposta in un elenco di cose fatte, non si annota «✅ risolto il…»: si cancella,
perché la cronaca è già nel devlog e il registro degli step la tiene comunque. È ciò che non è mai
stato fatto fino al 13 settembre 2026, ed è il motivo per cui questo file era arrivato a 2524 righe
dicendo tre cose false su sé stesso.

## Dove siamo

**L'app è nel Play Store dal 12 settembre 2026**, versione **1.0.0** (build `807161bd`, commit
`777b958`, versionCode 2), in **test chiuso**. Il criterio di «fatto» end-to-end è stato soddisfatto
la mattina dello stesso giorno: il sync visto funzionare nei due versi fra due telefoni veri, coi
membri e i saldi giusti, e i due widget popolati con numeri identici a un calcolo indipendente.

**Settantuno step, dallo 0 al 70**, elencati uno per riga in [registro.md](registro.md). Otto piani
chiusi su dieci — l'originale, il [v2](piano-v2-profili-gruppi-sync.md),
[v3](piano-v3-tab-gruppi-azzeramento-sync.md), [v4](piano-v4-grafici-e-dashboard.md),
[v6](piano-v6-spesa-rapida-e-grafici-componibili.md),
[v7](piano-v7-data-e-vocabolario-del-gruppo.md),
[v8](piano-v8-dati-che-escono-e-backup-che-si-fa-da-solo.md) e
[v9](piano-v9-la-frase-che-diventa-una-spesa.md) — più i sette passi del redesign
([visualdesign.md](visualdesign.md)). Il [v5](piano-v5-notifiche-widget-profilo.md) è a dodici step
su tredici: manca solo la coda dello Step 41.

**1704 test verdi** (901 core + 749 app + 54 relay), con `typecheck`, `lint` e `format:check`
puliti.

**Gli aggiornamenti via etere funzionano, e ne sono già partiti quattro**: tre il 13 settembre — gli
Step 49–57, il Piano v7 intero e il Piano v8 intero — e il **Piano v9 intero** (gruppo `8d2d8fc3…`,
dal commit `98f44d4`) il 15 settembre, tutti sul canale `production` con impronta `d862b56d…`, la
stessa del binario in test. Il registro è in [versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md),
insieme alla regola controintuitiva che li governa: **un `eas update` si pubblica con `version`
invariata**, perché `version` entra nell'impronta della `runtimeVersion` e alzarla impedisce
all'aggiornamento di arrivare, in silenzio.

## Cosa manca

- **La coda dello Step 41**, l'unico 🟡 del registro. Il grosso della verifica è stato fatto il 12
  settembre; resta ciò che chiede giorni di calendario e non una sessione — le notifiche che devono
  scattare al momento giusto, il refresh in background su più giorni, la convivenza di due gruppi
  attivi nel tempo. La procedura da eseguire col telefono in mano è in
  [verifica-sul-telefono.md](verifica-sul-telefono.md).
- **Gli screenshot della scheda Play Store.** L'insegna 1024×500 è in `store/`, gli screenshot no.
- **Dodici tester per quattordici giorni**, che Google chiede a un account personale prima della
  produzione. Oggi i tester sono **due**.
- **Le anteprime dei widget nel selettore di Android sono riquadri vuoti.** È l'unico difetto emerso
  dalla verifica del 12 settembre, ed è cosmetico: i widget, una volta posati, funzionano.
- **`app/dashboard.tsx` è un redirect da cancellare.** Lo Step 52 l'ha ridotto a un rimando verso i
  Grafici, tenendolo in vita per non rompere i link esistenti; va tolto a un ciclo di distanza.
- **Il piano v8 va provato col telefono in mano**, ed è la sola cosa che i test non possono dire:
  aprire il `.xlsx` in **Excel** e in **Fogli Google**, e fare il giro completo del backup automatico
  — in particolare **chiudere l'app dai recenti e riaprirla**, che è l'unico modo di sapere se il
  permesso sulla cartella è davvero persistente. I passaggi sono in
  [verifica-sul-telefono.md](verifica-sul-telefono.md).
- **La tastiera che copriva il campo della frase è corretta, e va riguardata col telefono.** Il
  foglio adesso si alza di quanto la tastiera misura davvero, e l'aritmetica sta in
  `sheet-metrics.ts` con i suoi test — ma è proprio la classe di difetto che **solo il dispositivo
  conferma**, perché dipende da come Android tratta la finestra di una `Modal`. Da guardare: il
  campo deve restare visibile mentre si scrive, e il foglio non deve staccarsi dalla tastiera
  lasciando una striscia vuota in mezzo (sarebbe il caso opposto, cioè la finestra che si
  ridimensiona già da sé).
- **Il campo della domanda nei Grafici non si è fatto notare.** C'è, ed è dove il piano voleva —
  in cima al tab, sopra la barra dei chip, prima riga della schermata. Ma alla prima apertura è stato
  scambiato per una casella di ricerca qualunque: quello che manca non è il funzionamento, è la
  scoperta. Il segnaposto _«spesa da esselunga questo mese»_ dice cosa si può scrivere solo a chi si
  ferma a leggerlo.
- **La guardia su `paidBy` è stata tentata e ritirata** nello Step 60 — è l'ottava voce di otto del
  check a freddo, l'unica non chiusa. La ragione per cui non si poteva mettere è nel devlog del 13
  settembre, e va riletta prima di ritentarla.

## Cosa è bloccato, e da cosa

**Niente.** Non c'è un solo pezzo di codice che il telefono non possa eseguire: la development build
del 5 settembre (commit `9606e0f`) combacia con `main`, e tutto ciò che è entrato dopo — gli Step
49–60 — è JavaScript, quindi viaggia via etere senza consumare una build.

## Il piano in corso

Il **[Piano v10](piano-v10-i-widget-che-dicono-qualcosa.md)**, aperto il 15 settembre e **a uno step
su due**: lo **71** è fatto — i due widget si adattano alla propria dimensione, e «Speso questo
mese» mostra la striscia degli ultimi quattordici giorni e il ritmo del mese — e resta il **72**, il
«+» sulla home da cui comincia una spesa intera.

**Il calcolo sta nell'app, il disegno legge e basta.** È il vincolo dello Step 34 e regge anche qui:
il task headless che disegna i widget non ha il documento, quindi la striscia si calcola dove le
spese ci sono e finisce nel foglietto come tracciato — senza colore, perché Android sceglie il tema
**nel momento in cui disegna**, che può essere ore dopo.

Il Piano v9 è chiuso il 15 settembre con lo Step 70, tre step su tre, e **in produzione via etere**
dallo stesso giorno. Lo Step 69 resta bruciato. **Nessuno degli step del v9 e del v10 ha richiesto
una build EAS**: l'impronta non si è mossa da `d862b56d…`.

## Dove sta cosa

| Vuoi sapere…                                          | Leggi                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| dove siamo **oggi**                                   | questo file                                                |
| che numero ha uno step, e se è chiuso                 | [registro.md](registro.md)                                 |
| **com'è andata** una giornata                         | [devlog.md](devlog.md) — si greppa, non si legge           |
| **come funziona** una cosa, adesso                    | [conoscenza/](conoscenza/)                                 |
| cosa si è **deciso** e perché, per il lavoro in corso | il piano `piano-vN-*.md`                                   |
| cosa provare **col telefono in mano**                 | [verifica-sul-telefono.md](verifica-sul-telefono.md)       |
| com'era raccontato uno step fra agosto e settembre    | [archivio/](archivio/)                                     |
| come si lavora in questo repo                         | [CLAUDE.md](../CLAUDE.md)                                  |
| una scelta architetturale irreversibile               | [adr/](adr/)                                               |
| come si aggiorna l'app già installata                 | [versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md) |

Le trappole già risolte — quelle che costa giorni riscoprire — stanno in
[conoscenza/trappole.md](conoscenza/trappole.md), e le tre più frequenti sono ripetute in
[CLAUDE.md](../CLAUDE.md) perché è il primo file che si legge.
