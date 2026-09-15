import { describe, expect, it } from 'vitest';
import {
  APP_SCHEME,
  cameFromWidget,
  newExpenseRoute,
  newExpenseUri,
  readGroupParam,
} from './deeplink';

describe('newExpenseUri', () => {
  it('usa lo schema dichiarato in app.json', () => {
    // Se questo test diventa rosso, `expo.scheme` è cambiato e il «+» sui widget già posati
    // sulla home ha smesso di aprire qualcosa — senza che nulla lo dica.
    expect(APP_SCHEME).toBe('jutrack');
    expect(newExpenseUri('vault-1')).toMatch(/^jutrack:\/\//);
  });

  it('porta il gruppo dentro il link', () => {
    // È il punto dello step: il widget dice di che gruppo parla, e il link lo porta con sé.
    expect(newExpenseUri('vault-1')).toBe('jutrack://spesa?gruppo=vault-1');
  });

  it('protegge un identificativo che contenesse caratteri da URL', () => {
    // Un id è opaco: oggi è esadecimale, e il giorno in cui non lo fosse più questo non
    // sarebbe il posto in cui accorgersene.
    expect(newExpenseUri('a b&c=d')).toBe('jutrack://spesa?gruppo=a%20b%26c%3Dd');
  });
});

describe('readGroupParam', () => {
  it('legge il gruppo quando c’è', () => {
    expect(readGroupParam('vault-1')).toBe('vault-1');
  });

  it('non c’è quando il parametro manca', () => {
    expect(readGroupParam(undefined)).toBeNull();
    expect(readGroupParam('')).toBeNull();
    expect(readGroupParam('   ')).toBeNull();
  });

  it('rifiuta un parametro ripetuto invece di concatenarlo', () => {
    // Concatenarlo produrrebbe un identificativo che nessuno ha scritto, e da lì in poi il
    // guasto si travestirebbe da «quel gruppo non c'è più».
    expect(readGroupParam(['vault-1', 'vault-2'])).toBeNull();
  });
});

describe('l’arrivo dal widget', () => {
  it('la rotta interna dice da dove si viene', () => {
    expect(newExpenseRoute()).toBe('/expense/new?da=widget');
  });

  it('riconosce l’arrivo dal «+»', () => {
    expect(cameFromWidget('widget')).toBe(true);
  });

  it('non lo riconosce da nient’altro', () => {
    // Un parametro ripetuto arriva come array: vale «non dal widget», cioè il form normale,
    // che è il ripiego innocuo.
    expect(cameFromWidget(undefined)).toBe(false);
    expect(cameFromWidget('')).toBe(false);
    expect(cameFromWidget('home')).toBe(false);
    expect(cameFromWidget(['widget', 'widget'])).toBe(false);
  });
});
