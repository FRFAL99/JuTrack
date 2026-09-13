# Registro degli step

Una riga per step, dallo 0 in avanti. È l'unico posto in cui guardare per sapere **che numero ha
uno step, a che piano appartiene e se è chiuso**; com'è andata sta in [devlog.md](devlog.md), dove
siamo adesso sta in [STATO.md](STATO.md).

## Prossimo numero libero: **67**

## Le regole

1. **Un numero non si rinumera mai.** Successe il 13 agosto 2026 — gli step ≥39 scalati di uno — e
   le entry del devlog precedenti a quella data portano ancora i numeri vecchi quando nominano il
   futuro. Un numero ritirato resta bruciato: il 48 non si riusa.
2. **Un numero si assegna scrivendo un piano**, che lo dichiara in testa: «occupa gli Step 61–63».
   Si scrive qui in quel momento, non a piano finito.
3. **Il lavoro fuori piano non prende un numero.** È una voce di devlog con la sola data, come già
   fanno dieci entry su settantuno. Quando invece ruba un numero — com'è successo agli Step 42–48 e
   53–57 — la mappa piano↔step si sfasa, ed è il motivo per cui questa tabella è nata.
4. I sette «passi» del redesign ([visualdesign.md](visualdesign.md)) hanno numerazione propria e
   **non entrano** in questo registro.

Stato: ✅ chiuso · 🟡 in parte · ⬜ non fatto.

## La tabella

| N   | Titolo                                  | Piano     | Stato | Devlog     |
| --- | --------------------------------------- | --------- | ----- | ---------- |
| 0   | Repo e documentazione                   | originale | ✅    | 2026-08-01 |
| 1   | Scheletro Expo                          | originale | ✅    | 2026-08-01 |
| 2   | Crypto                                  | originale | ✅    | 2026-08-01 |
| 3   | Modello Yjs e persistenza               | originale | ✅    | 2026-08-01 |
| 4   | UI spese e categorie                    | originale | ✅    | 2026-08-01 |
| 5   | Relay Cloudflare                        | originale | ✅    | 2026-08-01 |
| 6   | Motore di sincronizzazione              | originale | ✅    | 2026-08-01 |
| 7   | Pairing via QR                          | originale | ✅    | 2026-08-01 |
| 8   | Split, saldo, budget, grafici           | originale | ✅    | 2026-08-01 |
| 9   | CI, export, backup della chiave         | originale | ✅    | 2026-08-01 |
| 10  | Sync: correttezza e velocità            | v2        | ✅    | 2026-08-01 |
| 11  | Profili                                 | v2        | ✅    | 2026-08-01 |
| 12  | Più gruppi per telefono                 | v2        | ✅    | 2026-08-02 |
| 13  | Inviti via link                         | v2        | ✅    | 2026-08-02 |
| 14  | Uscire da un gruppo                     | v2        | ✅    | 2026-08-02 |
| 15  | Piano v3 scritto                        | v3        | ✅    | 2026-08-02 |
| 16  | Poll a scala, `markActive`              | v3        | ✅    | 2026-08-02 |
| 17  | Offline ≠ errore del relay              | v3        | ✅    | 2026-08-02 |
| 18  | Tab Gruppi: elenco → gruppo             | v3        | ✅    | 2026-08-02 |
| 19  | Tutto il gruppo nel gruppo              | v3        | ✅    | 2026-08-02 |
| 20  | Quattro tab                             | v3        | ✅    | 2026-08-02 |
| 21  | Nessun gruppo al primo avvio            | v3        | ✅    | 2026-08-02 |
| 22  | Azzera questo telefono                  | v3        | ✅    | 2026-08-02 |
| 23  | Negozio e tag nel modello               | v4        | ✅    | 2026-08-11 |
| 24  | «Informazioni aggiuntive»               | v4        | ✅    | 2026-08-11 |
| 25  | La geometria dei grafici                | v4        | ✅    | 2026-08-11 |
| 26  | I grafici nuovi, in SVG                 | v4        | ✅    | 2026-08-11 |
| 27  | I sei filtri                            | v4        | ✅    | 2026-08-11 |
| 28  | La dashboard componibile                | v4        | ✅    | 2026-08-11 |
| 29  | Valuta di default nel profilo           | v5        | ✅    | 2026-08-12 |
| 30  | Infrastruttura nativa                   | v5        | ✅    | 2026-08-12 |
| 31  | Promemoria spesa                        | v5        | ✅    | 2026-08-12 |
| 32  | Avviso di budget                        | v5        | ✅    | 2026-08-12 |
| 33  | Sincronizzazione ferma                  | v5        | ✅    | 2026-08-12 |
| 34  | Widget «Saldo»                          | v5        | ✅    | 2026-08-12 |
| 35  | Widget «Speso questo mese»              | v5        | ✅    | 2026-08-12 |
| 36  | Refresh in background                   | v5        | ✅    | 2026-08-12 |
| 37  | Infrastruttura i18n                     | v5        | ✅    | 2026-08-13 |
| 38  | Traduzione EN, tre schermate            | v5        | ✅    | 2026-08-13 |
| 39  | Formato dei numeri per lingua           | v5        | ✅    | 2026-08-13 |
| 40  | Traduzione EN, il resto                 | v5        | ✅    | 2026-08-19 |
| 41  | Verifica end-to-end                     | v5        | 🟡    | 2026-09-12 |
| 42  | Reimport dell'export JSON               | fuori     | ✅    | 2026-08-17 |
| 43  | Avviso «chiave non salvata»             | fuori     | ✅    | 2026-08-17 |
| 44  | Informativa privacy                     | fuori     | ✅    | 2026-09-05 |
| 45  | Icona definitiva                        | fuori     | ✅    | 2026-09-05 |
| 46  | Splash e pipeline degli asset           | fuori     | ✅    | 2026-09-12 |
| 47  | `expo-updates`                          | fuori     | ✅    | 2026-09-12 |
| 48  | Crash reporting                         | fuori     | ⬜    | 2026-09-12 |
| 49  | Il tastierino in-app per l'importo      | v6        | ✅    | 2026-09-13 |
| 50  | I tre gruppi apribili della nuova spesa | v6        | ✅    | 2026-09-13 |
| 51  | I capitoli dei grafici                  | v6        | ✅    | 2026-09-13 |
| 52  | La composizione in loco                 | v6        | ✅    | 2026-09-13 |
| 53  | Le quattro scelte di «Tu»               | fuori     | ✅    | 2026-09-13 |
| 54  | Le tre cose che ha detto il telefono    | fuori     | ✅    | 2026-09-13 |
| 55  | Le impostazioni non sono muri di testo  | fuori     | ✅    | 2026-09-13 |
| 56  | La schermata del gruppo                 | fuori     | ✅    | 2026-09-13 |
| 57  | Il pairing                              | fuori     | ✅    | 2026-09-13 |
| 58  | La data della spesa si sceglie          | v7        | ✅    | —          |
| 59  | Il vocabolario del gruppo               | v7        | ✅    | —          |
| 60  | Le correzioni dal check del codice      | v7        | ✅    | 2026-09-13 |
| 61  | Il foglio di calcolo al posto dei CSV   | v8        | ✅    | 2026-09-13 |
| 62  | Il file Excel contiene tutto il gruppo  | v8        | ✅    | 2026-09-13 |
| 63  | Il backup dice di che gruppo è          | v8        | ✅    | 2026-09-13 |
| 64  | L'import sceglie un file                | v8        | ✅    | 2026-09-13 |
| 65  | La cartella, e il backup che si fa solo | v8        | ✅    | 2026-09-13 |
| 66  | L'avviso «il backup invecchia»          | v8        | ⬜    | —          |

## Le note che la tabella non può contenere

- **Step 41 — perché è 🟡.** Il grosso è stato fatto il 12 settembre; resta ciò che chiede giorni
  di calendario, elencato in [STATO.md](STATO.md). La sua entry di devlog non porta un numero:
  è `## 2026-09-12 — Il criterio di «fatto» end-to-end, dopo sei settimane`.
- **Step 44 e 45** condividono una sola entry, `## 2026-09-05 — Le due cose che mancavano al
negozio`. Lo Step 45 ha prodotto `icon-source.svg`; lo script che lo consuma è arrivato col 46.
- **Step 48 — ritirato, non fallito.** Ha due entry nel devlog, l'introduzione e il ritiro: per ora
  bastano gli Android Vitals del Play Console. Il numero resta bruciato.
- **Step 58 e 59 non hanno una entry di devlog.** Buco dichiarato in testa a [devlog.md](devlog.md)
  e non ricostruito a posteriori di proposito. Quello che si sa è nel
  [piano v7](piano-v7-data-e-vocabolario-del-gruppo.md).
- **I piani chiusi sono sei:** l'originale (0–9), [v2](piano-v2-profili-gruppi-sync.md),
  [v3](piano-v3-tab-gruppi-azzeramento-sync.md), [v4](piano-v4-grafici-e-dashboard.md),
  [v6](piano-v6-spesa-rapida-e-grafici-componibili.md) e
  [v7](piano-v7-data-e-vocabolario-del-gruppo.md). Il [v5](piano-v5-notifiche-widget-profilo.md) è
  a dodici step su tredici: manca solo la coda dello Step 41.
- **Il [v8](piano-v8-dati-che-escono-e-backup-che-si-fa-da-solo.md) è aperto**, scritto il 13
  settembre 2026 e non ancora cominciato: occupa gli Step 61–66, tutti ⬜.
