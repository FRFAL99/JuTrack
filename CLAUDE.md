# JuTrack — come si lavora in questo repo

Monorepo npm workspaces: `apps/mobile` (Expo/React Native), `packages/core` (modello, cifratura,
sync), `services/relay` (Cloudflare Worker). Sviluppo di una persona sola: **codice, commenti,
documenti e messaggi di commit sono in italiano**.

## Prima di tutto, leggi questi

| Vuoi sapere…                                          | Leggi                           |
| ----------------------------------------------------- | ------------------------------- |
| dove siamo **oggi**                                   | `docs/STATO.md`                 |
| che numero ha uno step, e se è chiuso                 | `docs/registro.md`              |
| **come funziona** una cosa, adesso                    | `docs/conoscenza/`              |
| cosa si è **deciso** e perché, per il lavoro in corso | il piano `docs/piano-vN-*.md`   |
| cosa provare **col telefono in mano**                 | `docs/verifica-sul-telefono.md` |
| una scelta architetturale irreversibile               | `docs/adr/`                     |

**Non leggere `docs/devlog.md` per intero**: è 355 KB. Si greppa —
`grep -n '^## ' docs/devlog.md` ne dà l'indice completo in una riga di comando.

## Verifica

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

## Tre cose che fanno perdere tempo, in ordine di frequenza

1. **Metro si avvia da `apps/mobile`, mai dalla root.** Dalla root del monorepo non esiste alcun
   progetto Expo: l'entry point non si risolve e il server risponde 404 a ogni richiesta di bundle,
   con l'app che resta muta. È costato giorni — la storia è in `docs/troubleshooting-avvio-app.md`.
2. **Prettier formatta anche i `.md`, e `format:check` è in CI.** Un documento nuovo o modificato
   passa da `npm run format` prima del commit. Corsivo con `_`, non `*`; tabelle allineate al
   carattere. La CI si è già rotta così: commit `430aef0`.
3. **Un `eas update` si pubblica con `version` INVARIATA** in `app.json`. `version` entra
   nell'impronta della `runtimeVersion`: alzarla impedisce all'aggiornamento di arrivare, in
   silenzio. Vedi `docs/versioni-e-aggiornamenti.md`.

## Numerazione degli step

Globale e continua, dallo 0 in su.

1. **Non si rinumera mai.** Successe il 13 agosto 2026 — gli step ≥39 scalati di uno — e le entry
   del devlog precedenti a quella data portano ancora i numeri vecchi. Un numero ritirato resta
   bruciato: il 48 non si riusa.
2. **Un numero si assegna scrivendo un piano**, che lo dichiara in testa: «occupa gli Step 61–63».
3. **Il lavoro fuori piano non prende un numero**: è una voce di devlog con la sola data. Quando
   ruba un numero — com'è successo agli Step 42–48 e 53–57 — la mappa piano↔step si sfasa.
4. **«Che numero è il prossimo» ha una sola fonte**: l'ultima riga di `docs/registro.md`.

I sette «passi» di `docs/visualdesign.md` hanno numerazione propria e non entrano nel registro.

## Rituale di fine step

1. `npm run format:check && npm run lint && npm run typecheck && npm test`
2. `cd apps/mobile && npx expo export --platform android`
3. `docs/registro.md`: la riga dello step passa a ✅
4. `docs/devlog.md`: voce nuova **in testa**, `## AAAA-MM-GG — Step N: <titolo>`, chiusa da
   `### Verifica` con il conteggio dei test
5. `docs/STATO.md`: **solo se cambia dove siamo**. Ciò che è diventato fatto **si cancella** da
   «cosa manca» — la cronaca è già nel devlog. STATO resta sotto le 200 righe.
6. Una trappola nuova → `docs/conoscenza/trappole.md`, non nel devlog soltanto
7. Commit `Step N: <frase italiana in minuscolo>`, e push

## Dove si scrive cosa

| Cambia…                                 | Scrivi in                                             |
| --------------------------------------- | ----------------------------------------------------- |
| dove siamo oggi                         | `docs/STATO.md` — e cancella ciò che non è più aperto |
| lo stato di uno step                    | `docs/registro.md`                                    |
| com'è andata oggi                       | `docs/devlog.md`, in testa                            |
| come funziona una cosa, adesso          | `docs/conoscenza/`                                    |
| una decisione del lavoro in corso       | il piano `docs/piano-vN-*.md`                         |
| una scelta architetturale irreversibile | `docs/adr/`                                           |

Un piano nuovo parte da `docs/piano-TEMPLATE.md`.

## Riferimenti operativi

- Repo: https://github.com/FRFAL99/JuTrack (privato)
- Relay in produzione: **https://jutrack-relay.jutrack-relayfrfal.workers.dev**
- Account Cloudflare: `francesco.fallavena@gmail.com`, già autenticato in `wrangler`

C'è un vault Obsidian in `/home/frfal/vault/projects/jutrack/` con un devlog parallelo. È
**disaccoppiato di proposito**: se le due copie divergono, **la fonte di verità è `docs/devlog.md`**.
