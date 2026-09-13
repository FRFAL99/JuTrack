import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import type { NotificationSettings } from '@/features/notifications/settings';
import { alertsSummary, alertsTone, alertsTotal, currencyLabel, languageName } from './summary';

const ALL_OFF: NotificationSettings = {
  reminder: false,
  budget: false,
  sync: false,
  backup: false,
};
const on = (...kinds: (keyof NotificationSettings)[]): NotificationSettings => ({
  ...ALL_OFF,
  ...Object.fromEntries(kinds.map((kind) => [kind, true])),
});

describe('languageName', () => {
  it('scrive la lingua nella lingua stessa', () => {
    expect(languageName('it')).toBe('Italiano');
    expect(languageName('en')).toBe('English');
  });

  it('non traduce col cambio di lingua dell app', async () => {
    // È l'unica etichetta dell'app che deve restare uguale in tutte le lingue: chi apre il
    // foglio perché non capisce la lingua corrente deve riconoscere la propria.
    await i18n.changeLanguage('en');
    expect(languageName('it')).toBe('Italiano');
    await i18n.changeLanguage('it');
  });

  it('una lingua che non conosciamo resta il suo codice', () => {
    // `i18n.language` è quella **in uso**, che prima di una scelta è quella del telefono:
    // può essere il tedesco. Meglio un codice grezzo che un nome inventato.
    expect(languageName('de')).toBe('de');
  });
});

describe('currencyLabel', () => {
  it('dice codice e simbolo, come la pillola dentro il foglio', () => {
    expect(currencyLabel('EUR')).toBe('EUR €');
  });

  it('distingue i due dollari, che il solo simbolo non distinguerebbe', () => {
    expect(currencyLabel('USD')).not.toBe(currencyLabel('CAD'));
    expect(currencyLabel('USD')).toContain('USD');
  });

  it('un codice sconosciuto resta sé stesso invece di sparire', () => {
    expect(currencyLabel('XYZ')).toBe('XYZ');
  });
});

describe('alertsSummary', () => {
  it('conta i quattro dal tipo, non da un numero scritto a mano', () => {
    expect(alertsTotal(ALL_OFF)).toBe(4);
  });

  it('tutti accesi', () => {
    expect(alertsSummary(on('reminder', 'budget', 'sync', 'backup'), false)).toBe(
      'Tutti e 4 attivi',
    );
  });

  it('nessuno acceso lo dice, invece di lasciare la riga muta', () => {
    expect(alertsSummary(ALL_OFF, false)).toBe('Nessuno');
  });

  it('qualcuno acceso dice quanti su quanti', () => {
    expect(alertsSummary(on('reminder'), false)).toBe('1 di 4 attivo');
    expect(alertsSummary(on('reminder', 'sync'), false)).toBe('2 di 4 attivi');
  });

  it('bloccati vince su tutto', () => {
    // Prima stava scritto sotto i quattro interruttori, dove lo si leggeva scorrendo.
    // Chiusa la sezione, senza questa riga l'unico modo di scoprire che gli avvisi non
    // arrivano sarebbe non riceverne nessuno.
    expect(alertsSummary(on('reminder', 'budget', 'sync', 'backup'), true)).toBe(
      'Bloccati da Android',
    );
    expect(alertsSummary(on('reminder'), true)).toBe('Bloccati da Android');
  });

  it('solo bloccati è un avviso; nessuno acceso no', () => {
    // Nessun avviso acceso è una scelta legittima, ed è anche il default: colorarla
    // d'arancione la farebbe sembrare un guasto da riparare.
    expect(alertsTone(true)).toBe('warning');
    expect(alertsTone(false)).toBe('default');
  });
});

describe('in inglese', () => {
  afterEach(async () => {
    await i18n.changeLanguage('it');
  });

  it('traduce i riassunti degli avvisi', async () => {
    await i18n.changeLanguage('en');
    expect(alertsSummary(on('reminder', 'budget', 'sync', 'backup'), false)).toBe('All 4 on');
    expect(alertsSummary(ALL_OFF, false)).toBe('None');
    expect(alertsSummary(on('reminder'), false)).toBe('1 of 4 on');
    expect(alertsSummary(ALL_OFF, true)).toBe('Blocked by Android');
  });
});
