import {
  ENGLISH_NUMBERS,
  ITALIAN_NUMBERS,
  formatCents as formatCentsWith,
  formatMoney as formatMoneyWith,
  type Cents,
  type NumberFormat,
} from '@jutrack/core';
import i18n from './index';

/**
 * Il denaro scritto **nella lingua di chi legge**.
 *
 * Da qui l'app importa `formatCents` e `formatMoney`, e **non** da `@jutrack/core`: le due
 * funzioni hanno la stessa firma di prima, e in più sanno da sole in che lingua siamo. Una
 * regola ESLint impedisce di importarle dal core dentro `apps/mobile/src`, perché una
 * chiamata scritta per abitudine tornerebbe all'italiano fisso senza che nessuno se ne
 * accorga — è lo stesso meccanismo già usato per `utf8ToBytes` di noble, e per la stessa
 * ragione: il guasto sarebbe silenzioso.
 *
 * **Perché un modulo e non un parametro in più a ogni chiamata.** I punti che formattano
 * denaro sono venticinque file, e in alcuni la chiamata è dentro un `map` dentro un grafico:
 * infilarci un terzo argomento avrebbe voluto dire venticinque file da modificare **e** un
 * argomento da ricordare per sempre. Così il cambiamento è stato una riga di import per file,
 * e da domani non c'è niente da ricordare.
 *
 * **Vale la stessa regola dello Step 38**: qui la lingua si legge quando la funzione gira, e
 * il ridisegno lo fa `useTranslation()` nel componente. Un componente che mostra importi e
 * nient'altro deve chiamarlo lo stesso.
 *
 * Il simbolo continua ad arrivare come **secondo parametro**, dal profilo (Step 29), e i due
 * non si deducono l'uno dall'altro: si può leggere in inglese una spesa in euro, ed è anzi il
 * caso normale per chi vive qui e non parla italiano.
 */

/** Il formato dei numeri della lingua corrente. Italiano per tutto ciò che non è inglese. */
export function numberFormat(): NumberFormat {
  return i18n.language === 'en' ? ENGLISH_NUMBERS : ITALIAN_NUMBERS;
}

/** Come `formatCents` del core, ma nella lingua corrente. */
export function formatCents(cents: Cents): string {
  return formatCentsWith(cents, numberFormat());
}

/** Come `formatMoney` del core, ma nella lingua corrente. */
export function formatMoney(cents: Cents, currency = '€'): string {
  return formatMoneyWith(cents, currency, numberFormat());
}
