---
description: Esegue il rituale di fine step, fermandosi al primo rosso
---

Chiudi lo step in corso su JuTrack seguendo il rituale di `CLAUDE.md`. Note dell'utente, se ce ne
sono: $ARGUMENTS

**Fermati al primo rosso e dillo.** Non proseguire "tanto poi si sistema", e non riportare come
fatto ciò che non è passato.

## 1. La verifica, nell'ordine della CI

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
```

## 2. Il bundle

```bash
cd apps/mobile && npx expo export --platform android
```

Va eseguito a ogni step: ha già intercettato una trappola che né typecheck né test vedevano.

## 3. `docs/registro.md`

La riga dello step passa a ✅. Se lo step non era in tabella, è un errore a monte: il numero doveva
essere allocato scrivendo il piano. Aggiungila e dillo all'utente.

## 4. `docs/devlog.md`

Voce nuova **in testa** (il file è in ordine cronologico inverso), titolo
`## AAAA-MM-GG — Step N: <titolo in minuscolo, con la tesi di cosa si è scoperto>`, separata dalla
successiva da `---` e chiusa da `### Verifica` con il conteggio dei test appena visto — quello vero,
non quello copiato dall'entry precedente.

Racconta anche **cosa si è scostato dal piano**, che è la parte che serve rileggere.

## 5. `docs/STATO.md`, solo se serve

Si tocca **solo se cambia dove siamo**. E quando una riga di «cosa manca» è diventata fatta, **si
cancella** — non si sposta fra le cose fatte, non si annota come risolta: la cronaca è già nel
devlog. STATO resta sotto le 200 righe; se le supera, qualcosa andava cancellato.

## 6. Una trappola nuova

Se lo step ha fatto perdere tempo per una ragione che si può riscoprire, la riga va in
`docs/conoscenza/trappole.md`, non solo nel devlog.

## 7. Formattazione e commit

```bash
npm run format && npm run format:check
```

Prettier formatta anche i `.md` e `format:check` è in CI: un documento non formattato rompe la build.

Poi commit `Step N: <frase italiana in minuscolo>` e push — **chiedendo prima all'utente**.
