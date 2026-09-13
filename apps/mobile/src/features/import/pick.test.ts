import { describe, expect, it } from 'vitest';
import { outcomeOf } from './pick';

/**
 * **Qui si prova la decisione, non l'impianto.**
 *
 * Il resto di `pick.ts` carica un modulo nativo e chiama una sua funzione: su questo
 * ambiente — Node, senza React Native, come dichiara `vitest.config.mts` — non c'è niente
 * da provare che non sia un finto. È la stessa scelta di `features/export/share.ts`, che
 * per la stessa ragione non ha test.
 *
 * Quello che invece si può sbagliare senza accorgersene è **come si legge il risultato**,
 * ed è tutto qui dentro.
 */
describe('outcomeOf', () => {
  const file = { name: 'jutrack-vault-2026-09-13.json', textSync: () => '{"format":"x"}' };

  it('restituisce nome e contenuto del file scelto', () => {
    expect(outcomeOf({ canceled: false, result: file })).toEqual({
      status: 'read',
      name: 'jutrack-vault-2026-09-13.json',
      content: '{"format":"x"}',
    });
  });

  it('**annullare non è un guasto**', () => {
    // Chi apre il selettore e lo richiude ha deciso di non scegliere niente. Trattarlo come
    // un errore vorrebbe dire rimproverare qualcuno per aver cambiato idea — e la schermata
    // mostrerebbe un avviso rosso dopo un gesto perfettamente normale.
    expect(outcomeOf({ canceled: true, result: null })).toEqual({ status: 'cancelled' });
  });

  it('vale come annullato anche se arriva solo `result: null`', () => {
    // Le due forme non sono equivalenti nel tipo, ma lo sono per noi: `canceled` è il
    // segnale dichiarato, `result: null` è quello che resta se il segnale mancasse.
    expect(outcomeOf({ canceled: false, result: null })).toEqual({ status: 'cancelled' });
  });

  it('non tocca il contenuto: lo passa a `parseVaultExport` così com’è', () => {
    // Niente `trim`, niente controlli sul tipo dichiarato dal file. A dire se è un export
    // di JuTrack è il parser, che è nato per questo e che sa dire **perché** no.
    const sporco = { name: 'x.json', textSync: () => '  non è json  ' };
    expect(outcomeOf({ canceled: false, result: sporco })).toMatchObject({
      content: '  non è json  ',
    });
  });
});
