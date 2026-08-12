import {
  FlexWidget,
  TextWidget,
  type HexColor,
  type WidgetRepresentation,
} from 'react-native-android-widget';
import { darkPalette, fontSize, lightPalette, radius, spacing, type Palette } from '@/theme/tokens';
import type { WidgetLines } from './snapshot';

/**
 * Il rettangolo che entrambi i widget disegnano sulla home di Android.
 *
 * **Non è React Native**, benché sia JSX: `FlexWidget` e `TextWidget` non producono viste ma
 * un albero che il modulo nativo traduce in `RemoteViews`, cioè nell'unico linguaggio che il
 * processo del launcher sa disegnare. Da lì vengono i limiti che si vedono qui e che non
 * vanno scambiati per pigrizia: niente `StyleSheet`, niente componenti condivisi con l'app,
 * un sottoinsieme di stili, e i colori come stringhe esadecimali letterali.
 *
 * Perciò dell'app si riusa la sola cosa che si può riusare davvero: i **token**. Se domani
 * la palette cambia, cambiano anche i widget — mentre i tre `<Text>` della card in cima alle
 * spese non sono riusabili qui nemmeno volendo.
 *
 * **Due palette e non una.** `WidgetRepresentation` accetta `{ light, dark }` e Android
 * sceglie in base al tema di sistema **nel momento in cui disegna**: un widget che seguisse
 * il tema letto dall'app resterebbe chiaro sulla home scura di chi ha cambiato tema a app
 * chiusa. Non è un caso di margine: il tema si cambia molto più spesso di quanto si riapra
 * un'app.
 *
 * Tutto il rettangolo apre l'app (`OPEN_APP`): un widget di soldi che non si può toccare
 * costringe a cercare l'icona altrove, e non c'è nessun'altra azione da offrire qui.
 *
 * **Un solo rettangolo per due widget**, e non è una scorciatoia: il saldo e il totale del
 * mese sono due numeri diversi nello stesso posto — gruppo sopra, cifra in mezzo, spiegazione
 * sotto — e due copie del file avrebbero fatto divergere il secondo dal primo alla prima
 * ritoccata. La sola differenza è il **colore della cifra**, che chi chiama passa: il saldo ha
 * un verso, una somma di spese no.
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
export const hex = (color: string): HexColor => color as HexColor;

/** Da che colore si scrive la cifra grande, dato il tema. */
export type InkOf = (palette: Palette) => HexColor;

function Card({ lines, ink, palette }: { lines: WidgetLines; ink: InkOf; palette: Palette }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${lines.group}: ${lines.caption} ${lines.amount}`}
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
        text={lines.group}
        maxLines={1}
        truncate="END"
        style={{ fontSize: fontSize.xs, color: hex(palette.textMuted) }}
      />
      {/* `adjustsFontSizeToFit` e non una dimensione fissa: il widget è ridimensionabile,
          e «1.234,56 €» in una cella stretta verrebbe troncato proprio sulle cifre che
          sono la ragione per cui il widget è lì. */}
      <TextWidget
        text={lines.amount}
        maxLines={1}
        style={{
          fontSize: fontSize.xl,
          fontWeight: 'bold',
          adjustsFontSizeToFit: true,
          color: ink(palette),
        }}
      />
      <TextWidget
        text={lines.caption}
        maxLines={2}
        truncate="END"
        style={{ fontSize: fontSize.xs, color: hex(palette.textMuted) }}
      />
    </FlexWidget>
  );
}

/** Il rettangolo pronto da consegnare al sistema, nei due temi. */
export function widgetCard(lines: WidgetLines, ink: InkOf): WidgetRepresentation {
  return {
    light: <Card lines={lines} ink={ink} palette={lightPalette} />,
    dark: <Card lines={lines} ink={ink} palette={darkPalette} />,
  };
}
