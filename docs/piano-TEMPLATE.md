# JuTrack — Piano vN: «il cambiamento, non l'area»

> Copia questo file in `docs/piano-vN-<slug>.md` e cancella le righe in corsivo, che sono
> istruzioni. Il titolo dice **cosa cambia** per chi usa l'app, non quale parte del codice si tocca:
> _«la data si sceglie, tag e negozi diventano un elenco»_, non _«refactor del form»_.

> Punto d'ingresso del progetto: [STATO.md](STATO.md). **Da dove viene questo piano:** un mockup /
> l'app in mano / un check del codice a freddo. Scritto il <data>.
>
> **Occupa gli Step \<A\>–\<B\>**, uno per sessione. I numeri si prendono da `docs/registro.md` e
> si scrivono lì **adesso**, non a piano finito.
>
> **Ogni misura e ogni riferimento qui sotto è stato letto nel codice**, non dedotto. È la regola
> operativa nata dagli errori del piano v6, che aveva sbagliato il perché e il quanto su tre
> decisioni su quindici.

## Contesto

_Da uno a tre problemi, numerati, ciascuno in due righe. Se sono più di tre, sono due piani._

1. **Il problema in grassetto.** Cosa succede oggi a chi usa l'app, e perché è un problema.
2. …

_Se due dei problemi sono lo stesso problema, dirlo qui: cambia il numero di step._

## La cosa che il codice sapeva già (decisione 0)

_Sezione obbligatoria, e si scrive per prima — leggendo il codice, prima di decidere qualunque
altra cosa. Il piano v6 ha sbagliato tre decisioni su quindici per non averla avuta._

**Decisione.** _Cosa il codice offre già e che quindi non si riscrive._

**Perché.** _Con file e righe. Se un commento nel codice dice il falso — «servirebbe un modulo
nativo» quando non è più vero — citarlo per esteso e dichiarare che questo piano lo corregge._

**Serve una build EAS?** _Se sì, dire quale step la consuma delle quindici del mese. Se no, dirlo
esplicitamente: vale la regola di [versioni-e-aggiornamenti.md](versioni-e-aggiornamenti.md) —
**`version` in `app.json` resta invariata**, perché entra nell'impronta della `runtimeVersion` e
alzarla impedirebbe all'aggiornamento di arrivare, in silenzio._

---

## Le decisioni

### 1 · Una frase affermativa, non un titolo di argomento

_«La chiave del catalogo è derivata dal nome, non casuale», non «Gestione del catalogo»._

**Decisione.** Cosa si fa, in una frase.

**Perché.** La ragione, con un riferimento al codice vero — file e righe.

**Vincolo.** Cosa deve restare vero dopo. _Es.: «i test di `DayGridPicker` devono restare verdi
senza essere toccati: se ne modifichi uno, l'estrazione è andata storta.»_

### 2 · …

---

## Step \<A\> — «il titolo»

| File                    | Cosa                                   |
| ----------------------- | -------------------------------------- |
| `percorso/del/file.tsx` | **nuovo** — a cosa serve (decisione N) |
| `percorso/esistente.ts` | cosa cambia, e cosa resta              |

**Esiste già e non si riscrive:** _le funzioni riusate, con il modulo da cui vengono._

### Il punto che non va dimenticato

_Il difetto che a schermo sembrerebbe funzionare. Se non ce n'è uno, la sezione si cancella — non
si riempie di generalità._

### Criterio di «fatto»

_Un gesto sul telefono, nell'ordine, con l'esito atteso: «nuova spesa → Dettagli → «Ieri» → salva →
la spesa compare sotto «Ieri»». **Mai «i test passano».** Se un criterio non si può eseguire con un
dito, non è un criterio._

---

## Step \<B\> — …

---

## Cosa questo piano ha deciso di NON fare

_Sezione obbligatoria. Scritta qui perché non sparisca, com'è successo a «Tu» nel piano v6. Ogni
voce con la sua ragione, e distinguendo i due casi:_

- **Rimandato:** _cosa, e la condizione che lo farebbe riaprire._
- **Non si tocca:** _cosa, e dove la decisione è già stata presa (un ADR, un piano precedente)._

## Riepilogo

| Step  | Cosa | Rischio | Build EAS |
| ----- | ---- | ------- | --------- |
| \<A\> |      |         | No        |

Baseline di partenza: **N test verdi** (core + app + relay), `typecheck`, `lint` e `format:check`
puliti.
