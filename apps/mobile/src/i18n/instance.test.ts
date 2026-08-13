import { beforeAll, describe, expect, it } from 'vitest';
import i18next from './index';

/**
 * L'istanza vera, non una ricostruita per il test.
 *
 * `index.ts` si inizializza all'import, quindi importarlo qui è già metà della verifica: se
 * `init` sollevasse — per una risorsa malformata, o per un'opzione che questa versione di
 * `i18next` non accetta più — questo file non arriverebbe alla prima `it`.
 *
 * Non tocca `react-i18next` se non attraverso `.use(initReactI18next)`, che è quello che fa
 * l'app: qui non si disegna niente, si guarda solo cosa restituisce `t`. I componenti restano
 * verificabili solo sul telefono, come vale per il resto di `apps/mobile`.
 */

describe('istanza i18next', () => {
  beforeAll(async () => {
    // Le risorse sono già in memoria, quindi `init` è di fatto sincrona — ma restituisce una
    // promise, e attenderla qui evita che il test dipenda da quel «di fatto».
    await i18next.changeLanguage('it');
  });

  it('risolve una chiave vera invece di restituirla com è', () => {
    // È il guasto che si vede a schermo: `useTranslation` chiamato prima di `init` non
    // aspetta, restituisce la chiave, e la tab bar mostra «tabs.groups».
    expect(i18next.t('tabs.groups')).toBe('Gruppi');
  });

  it('cambia lingua senza ricaricare niente', async () => {
    await i18next.changeLanguage('en');
    expect(i18next.t('tabs.groups')).toBe('Groups');
    await i18next.changeLanguage('it');
    expect(i18next.t('tabs.groups')).toBe('Gruppi');
  });

  it('sostituisce i segnaposto in tutte e due le lingue', async () => {
    // I numeri arrivano dalle costanti del codice, non dal dizionario: se l'interpolazione
    // non funzionasse, la frase comparirebbe con `{{days}}` dentro.
    expect(i18next.t('you.alerts.reminderHint', { days: 3 })).toContain('3 giorni');
    await i18next.changeLanguage('en');
    expect(i18next.t('you.alerts.reminderHint', { days: 3 })).toContain('3 days');
    await i18next.changeLanguage('it');
  });

  it('non trasforma gli apostrofi tipografici in entità HTML', () => {
    // Senza `escapeValue: false` l'apostrofo di «dell'app» diventerebbe `&#39;` — l'escape
    // di default serve a non iniettare HTML in una pagina, e qui pagina non ce n'è.
    expect(i18next.t('you.alerts.scope')).toContain('l’app');
    expect(i18next.t('you.alerts.scope')).not.toContain('&#');
  });

  it('ripiega sull italiano per una lingua che non ha dizionario', async () => {
    // `fallbackLng` punta alla lingua **fonte**: una traduzione rimasta indietro mostra la
    // frase originale, non la chiave grezza.
    await i18next.changeLanguage('de');
    expect(i18next.t('tabs.groups')).toBe('Gruppi');
    await i18next.changeLanguage('it');
  });
});
