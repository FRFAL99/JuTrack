# Stato del progetto — punto di partenza

> Aggiornato: **2026-09-13**

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

**Sessantaquattro step, dallo 0 al 63**, elencati uno per riga in [registro.md](registro.md). Sei piani
chiusi su sette — l'originale, il [v2](piano-v2-profili-gruppi-sync.md),
[v3](piano-v3-tab-gruppi-azzeramento-sync.md), [v4](piano-v4-grafici-e-dashboard.md),
[v6](piano-v6-spesa-rapida-e-grafici-componibili.md) e
[v7](piano-v7-data-e-vocabolario-del-gruppo.md) — più i sette passi del redesign
([visualdesign.md](visualdesign.md)). Il [v5](piano-v5-notifiche-widget-profilo.md) è a dodici step
su tredici: manca solo la coda dello Step 41.

**1422 test verdi** (723 core + 645 app + 54 relay), con `typecheck`, `lint` e `format:check`
puliti.

**Gli aggiornamenti via etere funzionano, e ne sono già partiti due** il 13 settembre: gli Step
49–57 e poi il Piano v7 intero, entrambi sul canale `production` con impronta `d862b56d…`, la stessa
del binario in test. Il registro è in [versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md),
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
- **La guardia su `paidBy` è stata tentata e ritirata** nello Step 60 — è l'ottava voce di otto del
  check a freddo, l'unica non chiusa. La ragione per cui non si poteva mettere è nel devlog del 13
  settembre, e va riletta prima di ritentarla.

## Cosa è bloccato, e da cosa

**Niente.** Non c'è un solo pezzo di codice che il telefono non possa eseguire: la development build
del 5 settembre (commit `9606e0f`) combacia con `main`, e tutto ciò che è entrato dopo — gli Step
49–60 — è JavaScript, quindi viaggia via etere senza consumare una build.

## Il piano in corso

Il **[v8](piano-v8-dati-che-escono-e-backup-che-si-fa-da-solo.md) — i dati escono in un foglio di
calcolo, e il backup si fa da solo**, scritto il 13 settembre. Occupa gli **Step 61–66**, e i primi **tre
sono chiusi**: il `.xlsx` ha preso il posto dei due CSV, che sono usciti dal repo — con
l'[ADR 0004](adr/0004-l-xlsx-al-posto-del-csv.md) che supera la
[0003](adr/0003-formati-di-export.md) nella parte tabellare — il file contiene **sette fogli**,
riepilogo compreso, e il **formato JSON è salito alla v4**, che porta dentro il nome del gruppo e la
versione dell'app.

Restano i **64–66**: l'import che impara a scegliere un file invece di farsi incollare, il backup di
tutti i gruppi che si scrive da sé in una cartella scelta una volta, e l'avviso quando quel backup
invecchia. **Nessuno dei sei step chiede una build EAS**, quindi
`version` in `app.json` resta invariata.

Del `.xlsx` **manca una prova**, ed è nella lista di
[verifica-sul-telefono.md](verifica-sul-telefono.md): il file è stato aperto con LibreOffice e
validato come pacchetto OPC, ma non ancora con **Excel** né con **Fogli Google**. Si fa una volta
sola, a piano finito.

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
