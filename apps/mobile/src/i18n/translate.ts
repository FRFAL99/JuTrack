import i18n from './index';

/**
 * Come un modulo **senza React** scrive una frase tradotta.
 *
 * Lo Step 38 ha portato l'i18n dove i componenti non arrivano: `describe.ts` dice da quanto
 * non si sincronizza, `grouping.ts` scrive «lunedì 1 agosto», `balance-line.ts` decide se
 * «ti deve» o «devi». Sono moduli puri di proposito — è lì che stanno i casi limite, ed è lì
 * che i test dell'app possono arrivare, perché non importano `react-native`. Un hook non ce
 * lo si può mettere.
 *
 * **`import i18n from './index'` e non `from 'i18next'`**, che pure sarebbe la stessa
 * istanza. Importare il modulo che la **inizializza** rende l'ordine una proprietà del grafo
 * degli import invece che una cosa da ricordare: un test che monta solo `grouping.ts` trova
 * i dizionari caricati senza doverlo dichiarare, e non c'è modo di ottenere una `t` che
 * restituisce le chiavi.
 *
 * **La regola che ne segue, e che va tenuta a mente disegnando:** queste funzioni leggono la
 * lingua **nel momento in cui girano**, e non avvisano nessuno quando cambia. A far
 * ridisegnare è `useTranslation()` nel componente. Quindi un componente che mostra una data
 * o un saldo deve chiamarlo **anche se non ha stringhe proprie**, o al cambio di lingua
 * resterebbe scritto nella lingua di prima fino al primo ridisegno per altri motivi.
 */

/** La traduzione di una chiave, con i suoi segnaposto. */
export function t(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params ?? {});
}

/**
 * Quale delle due forme di un plurale, scelta **contando a mano**.
 *
 * i18next saprebbe farlo da sé, con i suffissi `_one`/`_other` e `Intl.PluralRules`. Non lo
 * si usa perché quel `Intl` su Hermes non è verificato, e il modo in cui i18next reagisce
 * alla sua assenza è il peggiore possibile per noi: `getRule` intercetta l'errore e
 * restituisce una regola finta, che sceglie **sempre la stessa forma**. Non fallirebbe:
 * scriverebbe «1 spese» senza dirlo a nessuno.
 *
 * Contare a mano è corretto per italiano e inglese, che dividono uno da molti allo stesso
 * modo. È il limite dichiarato di questa funzione: una lingua con più forme — il polacco ne
 * ha tre, l'arabo sei — chiederebbe di rimettere in mezzo `Intl.PluralRules`, e a quel punto
 * conviene usare quello di i18next invece di riscriverlo.
 */
export function plural(key: string, count: number, params?: Record<string, unknown>): string {
  return t(pluralKey(key, count), { count, ...params });
}

/** La chiave che `plural` andrà a cercare. Separata perché è l'unica parte da provare. */
export function pluralKey(key: string, count: number): string {
  // `Math.abs`: «−1 spesa» resta singolare. Non capita oggi — i conteggi qui sono tutti
  // positivi — ma un giorno un saldo negativo passerà di qui, e «-1 spese» sarebbe il
  // genere di sbaglio che non si nota rileggendo.
  return `${key}.${Math.abs(count) === 1 ? 'one' : 'other'}`;
}
