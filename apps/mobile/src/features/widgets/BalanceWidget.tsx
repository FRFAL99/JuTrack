import {
  FlexWidget,
  TextWidget,
  type HexColor,
  type WidgetRepresentation,
} from 'react-native-android-widget';
import { darkPalette, fontSize, lightPalette, radius, spacing, type Palette } from '@/theme/tokens';
import { UNKNOWN_BALANCE, type BalanceSnapshot } from './snapshot';

/**
 * Il widget «Saldo del gruppo aperto», disegnato sulla home di Android.
 *
 * **Non è React Native**, benché sia JSX: `FlexWidget` e `TextWidget` non producono viste ma
 * un albero che il modulo nativo traduce in `RemoteViews`, cioè nell'unico linguaggio che il
 * processo del launcher sa disegnare. Da lì vengono i limiti che si vedono qui e che non
 * vanno scambiati per pigrizia: niente `StyleSheet`, niente componenti condivisi con l'app,
 * un sottoinsieme di stili, e i colori come stringhe esadecimali letterali.
 *
 * Perciò dell'app si riusa la sola cosa che si può riusare davvero: i **token**. Se domani
 * la palette cambia, cambia anche il widget — mentre i tre `<Text>` della card in cima alle
 * spese non sono riusabili qui nemmeno volendo.
 *
 * **Due palette e non una.** `WidgetRepresentation` accetta `{ light, dark }` e Android
 * sceglie in base al tema di sistema **nel momento in cui disegna**: un widget che seguisse
 * il tema letto dall'app resterebbe chiaro sulla home scura di chi ha cambiato tema a app
 * chiusa. Non è un caso di margine: il tema si cambia molto più spesso di quanto si riapra
 * un'app.
 *
 * Tutto il rettangolo apre l'app (`OPEN_APP`): un widget di saldo che non si può toccare
 * costringe a cercare l'icona altrove, e non c'è nessun'altra azione da offrire qui.
 */

/**
 * I colori della palette come li vuole questa libreria.
 *
 * `Palette` li dichiara `string` perché a React Native basta; qui il tipo è
 * `` `#${string}` ``, e un cast è l'unico modo per farli incontrare. È sicuro per costruzione
 * — in `theme/tokens.ts` ogni valore è un esadecimale e c'è il test che lo verifica — e
 * l'alternativa, riscrivere la palette a mano in questo file, sarebbe la duplicazione che
 * l'intero passo 1 del redesign esiste per evitare.
 */
const hex = (color: string): HexColor => color as HexColor;

/** Il colore del numero grande: il segno del saldo, con i colori di entrate e uscite. */
function amountColor(palette: Palette, tone: BalanceSnapshot['tone']): HexColor {
  if (tone === 'credit') return hex(palette.income);
  if (tone === 'debt') return hex(palette.expense);
  return hex(palette.text);
}

function BalanceCard({ balance, palette }: { balance: BalanceSnapshot; palette: Palette }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${balance.group}: ${balance.caption} ${balance.amount}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: hex(palette.surface),
      }}
    >
      <TextWidget
        text={balance.group}
        maxLines={1}
        truncate="END"
        style={{ fontSize: fontSize.xs, color: hex(palette.textMuted) }}
      />
      {/* `adjustsFontSizeToFit` e non una dimensione fissa: il widget è ridimensionabile,
          e «1.234,56 €» in una cella stretta verrebbe troncato proprio sulle cifre che
          sono la ragione per cui il widget è lì. */}
      <TextWidget
        text={balance.amount}
        maxLines={1}
        style={{
          fontSize: fontSize.xl,
          fontWeight: 'bold',
          adjustsFontSizeToFit: true,
          color: amountColor(palette, balance.tone),
        }}
      />
      <TextWidget
        text={balance.caption}
        maxLines={2}
        truncate="END"
        style={{ fontSize: fontSize.xs, color: hex(palette.textMuted) }}
      />
    </FlexWidget>
  );
}

/**
 * Il widget pronto da consegnare al sistema, in tema chiaro e scuro.
 *
 * `null` non è un errore: è il primo avvio e il telefono appena azzerato, e in entrambi i
 * casi c'è una frase giusta da mostrare invece di un rettangolo vuoto.
 */
export function balanceView(balance: BalanceSnapshot | null): WidgetRepresentation {
  const shown = balance ?? UNKNOWN_BALANCE;
  return {
    light: <BalanceCard balance={shown} palette={lightPalette} />,
    dark: <BalanceCard balance={shown} palette={darkPalette} />,
  };
}
