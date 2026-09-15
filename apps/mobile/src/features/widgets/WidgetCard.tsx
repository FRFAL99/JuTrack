import {
  FlexWidget,
  SvgWidget,
  TextWidget,
  type HexColor,
  type WidgetRepresentation,
} from 'react-native-android-widget';
import { darkPalette, fontSize, lightPalette, radius, spacing, type Palette } from '@/theme/tokens';
import { SPARK_HEIGHT, SPARK_WIDTH, type WidgetLines } from './snapshot';
import type { WidgetSize } from './size';

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

/**
 * Cosa mettere nel rettangolo oltre alle tre righe, se c'è posto.
 *
 * `| undefined` esplicito perché il progetto ha `exactOptionalPropertyTypes`: chi chiama legge
 * due campi facoltativi da un foglietto e li passa così com'è, e senza questo dovrebbe
 * ricostruire l'oggetto campo per campo per dire la stessa cosa.
 */
export interface CardExtras {
  /** La spezzata degli ultimi giorni, nelle coordinate di `SPARK_WIDTH`×`SPARK_HEIGHT`. */
  sparkPath?: string | undefined;
  /** Una riga in più sotto la didascalia. */
  note?: string | undefined;
}

/** Quanto è alta la striscia disegnata, in dp. */
const SPARK_DP = 30;

/**
 * Dalla spezzata al documento SVG, **col colore deciso adesso**.
 *
 * Due tracciati e non uno: la linea marcata, e sotto la stessa linea chiusa sul fondo e
 * riempita in trasparenza. La chiusura usa `SPARK_WIDTH`/`SPARK_HEIGHT`, cioè gli stessi due
 * numeri con cui `compose.ts` ha prodotto i punti — è la ragione per cui quelle costanti
 * stanno in `snapshot.ts` e non in uno dei due file che le usano.
 *
 * `preserveAspectRatio="none"`: la striscia si stira fino a riempire il rettangolo, che è
 * ciò che si vuole da uno sfondo di andamento. Mantenere le proporzioni lascerebbe due bande
 * vuote ai lati, larghe quanto il launcher decide.
 *
 * `fill-opacity` e non un colore già smorzato: il colore arriva dalla palette, e schiarirlo
 * qui vorrebbe dire rifare la palette a mano per il tema scuro.
 */
function sparkSvg(path: string, color: HexColor): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}" preserveAspectRatio="none">` +
    `<path d="${path} L${SPARK_WIDTH},${SPARK_HEIGHT} L0,${SPARK_HEIGHT} Z" fill="${color}" fill-opacity="0.16"/>` +
    `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `</svg>`
  );
}

function Card({
  lines,
  ink,
  palette,
  size,
  extras,
}: {
  lines: WidgetLines;
  ink: InkOf;
  palette: Palette;
  size: WidgetSize;
  extras: CardExtras;
}) {
  // **Il taglio si legge una volta e decide tutto insieme.** Sparso su tre `&&` diventerebbe
  // tre condizioni che si possono scordare separatamente, ed è così che un rettangolo stretto
  // finisce per mostrare due righe su tre.
  const roomy = size === 'full';
  const spark = roomy ? extras.sparkPath : undefined;
  const note = roomy ? extras.note : undefined;
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
        // Una riga sola quando sotto c'è dell'altro: la didascalia che va a capo spingerebbe
        // fuori dal rettangolo proprio ciò che si è appena fatto spazio per mostrare.
        maxLines={note === undefined ? 2 : 1}
        truncate="END"
        style={{ fontSize: fontSize.xs, color: hex(palette.textMuted) }}
      />

      {note !== undefined && (
        <TextWidget
          text={note}
          maxLines={1}
          truncate="END"
          style={{ fontSize: fontSize.xxs, color: hex(palette.textFaint) }}
        />
      )}

      {spark !== undefined && (
        <SvgWidget
          svg={sparkSvg(spark, ink(palette))}
          style={{ width: 'match_parent', height: SPARK_DP, marginTop: spacing.sm }}
        />
      )}
    </FlexWidget>
  );
}

/**
 * Il rettangolo pronto da consegnare al sistema, nei due temi.
 *
 * Il taglio arriva da fuori e non si indovina qui: chi disegna lo ha appena letto da
 * `WidgetInfo`, e i due percorsi — l'app e il task headless — passano per la **stessa**
 * `widgetSize`.
 */
export function widgetCard(
  lines: WidgetLines,
  ink: InkOf,
  size: WidgetSize,
  extras: CardExtras = {},
): WidgetRepresentation {
  return {
    light: <Card lines={lines} ink={ink} palette={lightPalette} size={size} extras={extras} />,
    dark: <Card lines={lines} ink={ink} palette={darkPalette} size={size} extras={extras} />,
  };
}
