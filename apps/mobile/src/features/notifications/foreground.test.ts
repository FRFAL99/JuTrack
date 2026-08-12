import { describe, expect, it } from 'vitest';
import { shouldShowInForeground } from './foreground';

describe('shouldShowInForeground', () => {
  it('mostra l’avviso di budget, che nasce mentre l’app è aperta', () => {
    // Senza questa riga lo Step 32 sarebbe invisibile: l'avviso lo produce l'app che sta
    // guardando il documento, quindi in primo piano, e in primo piano
    // `expo-notifications` di default non mostra niente.
    expect(shouldShowInForeground('budget')).toBe(true);
  });

  it('mostra l’avviso di sincronizzazione ferma, per la stessa ragione', () => {
    // Anche questo lo produce l'app mentre è aperta, e dice una cosa che dalla schermata
    // aperta non si vede: da quanto dura.
    expect(shouldShowInForeground('sync')).toBe(true);
  });

  it('non mostra il promemoria: inviterebbe ad aprire un’app già aperta', () => {
    expect(shouldShowInForeground('reminder')).toBe(false);
  });

  it.each([
    ['un tipo mai visto', 'qualcosaltro'],
    ['nessun tipo', undefined],
    ['un valore che non è una stringa', 7],
  ])('tace davanti a %s', (_caso, kind) => {
    expect(shouldShowInForeground(kind)).toBe(false);
  });
});
