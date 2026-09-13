---
description: Apre un nuovo piano di lavoro, allocando gli step nel registro
---

Apri un piano nuovo per JuTrack. L'argomento, se c'è, è il tema: $ARGUMENTS

Segui quest'ordine, senza saltare passaggi.

## 1. Leggi prima di proporre

- `docs/registro.md` — il prossimo numero libero e l'ultimo piano chiuso
- `docs/STATO.md` — dove siamo, e soprattutto **cosa manca**
- `CLAUDE.md` — la regola di numerazione

Se l'utente non ha detto di cosa tratta il piano, proponi due o tre candidati presi da «cosa manca»
di `STATO.md`, e chiedi. Non inventare un tema.

## 2. Compila la decisione 0 leggendo il codice

**Questo è il passaggio che non si salta, ed è il motivo per cui questo comando esiste.** Prima di
scrivere una sola decisione, leggi il codice che il piano toccherebbe e scrivi:

- cosa **esiste già** e non va riscritto, con file e righe;
- quale **commento nel codice dice il falso** e va corretto dal piano;
- se serve una **build EAS**, e quale step la consumerebbe.

Il piano v6 ha sbagliato il perché e il quanto su tre decisioni su quindici per non aver fatto
questo. Il v7 ha aggiunto la sezione apposta. Se non hai letto il codice, non scrivere il piano.

## 3. Scrivi il piano

```bash
cp docs/piano-TEMPLATE.md docs/piano-v<N>-<slug>.md
```

Il titolo dice **cosa cambia per chi usa l'app**, non quale parte del codice si tocca. Da uno a tre
problemi nel contesto: se sono più di tre, sono due piani. Ogni criterio di «fatto» è un **gesto sul
telefono**, mai «i test passano».

## 4. Alloca i numeri nel registro, adesso

Aggiungi le righe in `docs/registro.md` con stato ⬜, la colonna `Piano` compilata, e **aggiorna il
«prossimo numero libero»**. Si fa ora, non a piano finito: è l'atto che assegna i numeri.

## 5. Chiudi

`npm run format`, poi mostra all'utente il piano e la riga del registro. Commit
`Scrive il Piano v<N>: <frase italiana in minuscolo>` — ma **chiedi prima di committare**.
