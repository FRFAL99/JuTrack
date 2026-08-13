import { Fragment } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import type { Cents } from '@jutrack/core';
import { formatCents, numberFormat } from '@/i18n/money';

/**
 * La cifra grande, con il simbolo di valuta **in un colore più tenue**.
 *
 * È il numero in cima alle spese e quello in cima ai Grafici: due punti che mostravano la
 * stessa cosa con lo stesso JSX scritto due volte. Diventano un componente allo Step 39
 * perché quel JSX conteneva una decisione che fino a ieri non sembrava tale — **da che parte
 * sta il simbolo** — e adesso dipende dalla lingua: «1.234,56 €» leggendo in italiano,
 * «€1,234.56» leggendo in inglese. Due copie di una regola che cambia sono due copie che
 * divergono.
 *
 * `formatMoney` non basta qui, e questo è il motivo per cui il componente esiste invece di
 * una chiamata: quella restituisce una stringa sola, mentre qui il simbolo deve avere un
 * colore suo. La composizione va fatta in JSX, e la regola su dove metterlo viene dallo
 * stesso `numberFormat()` che usa `formatMoney` — non da una seconda decisione presa qui.
 */
export function HeroAmount({
  cents,
  symbol,
  symbolColor,
  style,
}: {
  cents: Cents;
  symbol: string;
  symbolColor: string;
  style?: StyleProp<TextStyle>;
}) {
  const { symbolFirst, symbolSpace } = numberFormat();
  const currency = <Text style={{ color: symbolColor }}>{symbol}</Text>;

  return (
    <Text style={style}>
      {symbolFirst && (
        <Fragment>
          {currency}
          {symbolSpace}
        </Fragment>
      )}
      {formatCents(cents)}
      {!symbolFirst && (
        <Fragment>
          {symbolSpace}
          {currency}
        </Fragment>
      )}
    </Text>
  );
}
