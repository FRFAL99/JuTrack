import { describe, expect, it } from 'vitest';
import { CATEGORY_ICONS } from '@/state/seed';
import { categoryIconName } from './icon';

const known = new Set(['shopping-cart', 'home', 'package', 'coffee', 'tag']);

describe('categoryIconName', () => {
  it('traduce le emoji delle categorie di default', () => {
    // È il caso di ogni vault esistente: i dati restano com'erano e la sostituzione
    // avviene solo a schermo.
    expect(categoryIconName('🛒', known)).toBe('shopping-cart');
    expect(categoryIconName('📦', known)).toBe('package');
  });

  it('lascia passare un nome Feather già scritto', () => {
    expect(categoryIconName('tag', known)).toBe('tag');
  });

  it('ripiega sul pallino per ciò che non sa disegnare', () => {
    // Un'emoji scelta a mano dalla vecchia schermata, e un nome che Feather non ha:
    // in nessuno dei due casi esiste una traduzione, e inventarne una sarebbe peggio.
    expect(categoryIconName('🐾', known)).toBeNull();
    expect(categoryIconName('shopping-basket', known)).toBeNull();
    expect(categoryIconName('', known)).toBeNull();
    expect(categoryIconName(undefined, known)).toBeNull();
  });

  it('copre tutte e otto le categorie seminate', () => {
    // Il ripiego esiste per le categorie fatte a mano, non per quelle di default: se una
    // di queste cadesse sul pallino, ogni telefono nuovo aprirebbe l'app con dei puntini.
    expect(Object.keys(CATEGORY_ICONS)).toHaveLength(8);
    for (const [emoji, feather] of Object.entries(CATEGORY_ICONS)) {
      expect(categoryIconName(emoji, new Set([feather]))).toBe(feather);
    }
  });
});
