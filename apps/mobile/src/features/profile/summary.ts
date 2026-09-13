import { CURRENCIES } from '@jutrack/core';
import { LANGUAGES } from '@/i18n/language';
import { plural, t } from '@/i18n/translate';
import type { NotificationSettings } from '@/features/notifications/settings';

/**
 * Cosa dicono, da chiuse, le quattro righe di «Tu».
 *
 * Fuori dalla schermata per la stessa ragione di `group-summary.ts`: sono le uniche parti
 * che potevano essere sbagliate, e i test dell'app non caricano `react-native`.
 *
 * **Vale la regola della decisione 8 del Piano v6**, applicata qui a una schermata che quel
 * piano non toccava: la riga chiusa porta il **valore**, non un segnaposto. Nascondere
 * dietro una riga muta delle impostazioni che qualcuno ha scelto è il modo in cui si perde
 * di vista com'è configurata l'app — e su «Avvisi» c'è di peggio, perché uno degli stati
 * possibili è «accesi ma il sistema non ci lascia notificare».
 */

/**
 * Il nome della lingua, **scritto in quella lingua**.
 *
 * Non passa da `t` — è l'unica etichetta dell'app a non passarci, e `language.ts` dice
 * perché: chi apre il selettore proprio perché non capisce la lingua corrente deve
 * riconoscere la propria.
 *
 * Il codice arriva da `i18n.language`, cioè quella **in uso**, che può essere una che
 * l'elenco non conosce (il telefono in tedesco, prima che qualcuno scelga). In quel caso
 * torna il codice grezzo invece di inventare un nome: è brutto ma è vero, e succede solo
 * finché non si sceglie.
 */
export function languageName(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

/**
 * La valuta come «EUR €».
 *
 * Codice **e** simbolo, la stessa etichetta delle pillole dentro il foglio: il solo simbolo
 * non distingue i due dollari, il solo codice non fa vedere cosa comparirà accanto agli
 * importi. Che la riga chiusa e la pillola scelta dicano la stessa cosa è ciò che rende
 * riconoscibile, aprendo il foglio, quale delle pillole è quella di adesso.
 */
export function currencyLabel(code: string): string {
  const currency = CURRENCIES.find((one) => one.code === code);
  return currency === undefined ? code : `${currency.code} ${currency.symbol}`;
}

/** Quanti avvisi esistono. Dalle chiavi del tipo, non da un numero scritto a mano. */
export function alertsTotal(settings: NotificationSettings): number {
  return Object.keys(settings).length;
}

/**
 * Quanti avvisi sono accesi, detto in parole.
 *
 * **`blocked` vince su tutto.** È lo stato in cui gli interruttori sono accesi ma il
 * sistema non ci lascia notificare — chi ha revocato il permesso ad Android dopo averlo
 * dato — e prima stava scritto sotto i quattro interruttori, dove lo si leggeva
 * scorrendo. Chiusa la sezione, quella riga sparirebbe: allora è la riga chiusa a doverlo
 * dire, altrimenti l'unico modo di scoprire che gli avvisi non arrivano è non riceverne
 * nessuno.
 */
export function alertsSummary(settings: NotificationSettings, blocked: boolean): string {
  const total = alertsTotal(settings);
  const on = Object.values(settings).filter(Boolean).length;

  if (blocked) return t('you.alerts.summary.blocked');
  if (on === 0) return t('you.alerts.summary.none');
  if (on === total) return t('you.alerts.summary.all', { count: total });
  return plural('you.alerts.summary.some', on, { total });
}

/**
 * Il tono della riga «Avvisi»: `warning` solo quando c'è qualcosa che non va.
 *
 * «Nessuno acceso» **non** è un allarme — è una scelta legittima, ed è anche il default
 * (`settings.ts`: accendere d'ufficio significherebbe chiedere il permesso a chi non ha
 * chiesto niente). Colorare di arancione una configurazione voluta la farebbe sembrare un
 * guasto da riparare.
 */
export function alertsTone(blocked: boolean): 'default' | 'warning' {
  return blocked ? 'warning' : 'default';
}
