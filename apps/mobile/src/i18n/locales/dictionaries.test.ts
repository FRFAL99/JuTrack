import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../language';
import { en } from './en';
import { it as italian } from './it';

/**
 * Quello che il tipo `Dictionary` non riesce a vedere.
 *
 * La parità delle **chiavi** è già un errore di compilazione: `en.ts` si dichiara della forma
 * di `it.ts`, quindi una chiave mancante o di troppo non compila. Qui si verifica il resto —
 * i valori — che per TypeScript sono tutti `string` e quindi tutti uguali.
 *
 * Servirà molto più dello Step 37, che di stringhe ne ha una cinquantina: gli Step 38 e 39 ne
 * porteranno qualche centinaio, tradotte a mano, e i modi di sbagliare qui sotto sono
 * esattamente quelli che si scoprirebbero altrimenti a schermo.
 */

type Nested = { [key: string]: string | Nested };

/** Da `{ you: { sync: { title: 'x' } } }` a `{ 'you.sync.title': 'x' }`. */
function flatten(node: Nested, prefix = ''): Map<string, string> {
  const flat = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      flat.set(path, value);
    } else {
      for (const [nestedPath, nestedValue] of flatten(value, path)) {
        flat.set(nestedPath, nestedValue);
      }
    }
  }
  return flat;
}

/** I `{{segnaposto}}` che una frase si aspetta, in ordine, senza duplicati. */
function placeholders(text: string): string[] {
  return [...new Set(text.match(/{{\s*[\w.]+\s*}}/g) ?? [])].sort();
}

const dictionaries: Record<string, Map<string, string>> = {
  it: flatten(italian),
  en: flatten(en),
};

describe('dizionari', () => {
  it('ce n è uno per ogni lingua che il selettore propone', () => {
    // Una voce nel selettore senza dizionario dietro mostrerebbe l'italiano sotto
    // un'etichetta straniera, che è peggio di non offrire quella lingua.
    for (const { code } of LANGUAGES) {
      expect(Object.keys(dictionaries)).toContain(code);
    }
  });

  it('hanno le stesse chiavi', () => {
    // Il tipo lo garantisce già, ma solo finché `en` resta dichiarato `: Dictionary`. Questo
    // regge anche se qualcuno lo toglie per far compilare in fretta.
    expect([...dictionaries.en!.keys()].sort()).toEqual([...dictionaries.it!.keys()].sort());
  });

  it.each(Object.keys(dictionaries))('in %s non c è nessuna frase vuota', (code) => {
    // Una stringa vuota non è una traduzione mancante che si nota: è un'etichetta che
    // sparisce, e a schermo sembra un problema di layout.
    for (const [key, value] of dictionaries[code]!) {
      expect(value.trim(), `${code}: ${key}`).not.toBe('');
    }
  });

  it('usano gli stessi segnaposto nelle stesse frasi', () => {
    // È il modo di sbagliare tipico di una traduzione fatta a mano: `{{days}}` che diventa
    // `{{day}}`, o che sparisce del tutto. Il tipo non lo vede — sono due `string` — e a
    // schermo si legge «If days go by», con il numero mancante e nessun errore da nessuna
    // parte. Vale a maggior ragione per gli Step 38 e 39.
    for (const [key, italianText] of dictionaries.it!) {
      expect(placeholders(dictionaries.en!.get(key)!), key).toEqual(placeholders(italianText));
    }
  });

  it('traducono davvero, invece di ricopiare l italiano', () => {
    // Una frase inglese identica all'italiana è quasi sempre un copia-incolla dimenticato.
    // Le eccezioni vere esistono e sono elencate a una a una: se l'elenco cresce senza
    // motivo, è il segno che qualcuno lo sta usando per zittire il test.
    const identicalOnPurpose = new Set([
      // Nomi e segnaposto soltanto: non c'è niente da tradurre.
      'you.device.version',
      // «vault» è il nome della cosa, non una parola italiana: si chiama così anche nel
      // codice, nel threat model e nel nome delle tabelle.
      'groups.vaultShort',
      // Mese e anno stanno nello stesso ordine in tutte e due le lingue. È l'unico dei
      // cinque modelli di data a non cambiare: gli altri quattro sì, ed è il motivo per cui
      // stanno nel dizionario.
      'date.monthYear',
      // «1 tag» al singolare si scrive uguale: in italiano «tag» è invariabile, in inglese
      // la s arriva solo dal secondo in poi. La forma `.other` infatti differisce.
      'expense.extra.tagCount.one',
      // «Tag» come intestazione di sezione è un singolare, e la parola è la stessa nelle
      // due lingue: come «vault», non un copia-incolla dimenticato.
      'stats.filters.sections.tag',
      // Etichetta e importo separati da due punti: la struttura non cambia con la lingua,
      // e non c'è una parola da tradurre. Vale per entrambi i grafici che la usano.
      'stats.pointA11y',
      'stats.heatmap.dayA11y',
      // Stesso caso, con un terzo segnaposto: il conteggio arriva già tradotto da
      // `plural('stats.expenseCount', …)`, quindi qui non resta una parola da cambiare.
      'stats.topListA11y',
      // «Budget» è un prestito che l'inglese ha dato all'italiano: si scrive uguale in
      // entrambe le lingue, come «vault».
      'dashboard.widgets.budget.title',
      'budget.title',
      // Il prefisso del formato di backup, non una frase: si legge uguale in ogni lingua.
      'backup.blobPlaceholder',
      // «Passphrase» è già un prestito inglese nell'italiano di questa schermata: non
      // esiste un termine italiano separato da tradurre.
      'backup.passphrasePlaceholder',
      // Sintassi JSON d'esempio, non una frase: si legge uguale in ogni lingua.
      'importScreen.filePlaceholder',
      // «Budget» al singolare è invariato in italiano, come «tag» in
      // expense.extra.tagCount.one: solo il plurale inglese cambia forma.
      'importScreen.summary.budgets.one',
      // «OK» è la stessa sigla in entrambe le lingue.
      'probe.ok',
      // «SecureStore» è il nome del modulo, non una parola italiana: etichetta e risultato
      // separati da due punti, come stats.pointA11y — non c'è una parola da tradurre.
      'probe.steps.secureStore',
    ]);

    for (const [key, italianText] of dictionaries.it!) {
      if (identicalOnPurpose.has(key)) continue;
      expect(dictionaries.en!.get(key), key).not.toBe(italianText);
    }
  });
});
