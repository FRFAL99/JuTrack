import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Quanto è largo lo spazio in cui disegnare.
 *
 * Un SVG vuole misure in numeri, e la larghezza di una schermata non si sa prima di averla
 * impaginata: si misura il contenitore con `onLayout` e si disegna al secondo passaggio.
 * Alternativa scartata: `Dimensions.get('window')`, che dà la larghezza dello **schermo** e
 * ignora padding, margini e la colonna in cui il grafico sta davvero — il grafico
 * sborderebbe di quanto vale il padding della schermata.
 *
 * Ogni grafico si misura da sé invece di ricevere la larghezza come prop: così resta
 * autonomo, che è ciò che servirà alla dashboard componibile dello Step 28, dove i widget
 * non sanno in quale colonna finiranno.
 */
export function useChartWidth(): { width: number; onLayout: (event: LayoutChangeEvent) => void } {
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    // Solo se cambia davvero: `onLayout` scatta anche quando la misura è la stessa, e uno
    // `setState` con lo stesso numero comunque riprogramma un render.
    setWidth((current) => (current === measured ? current : measured));
  }, []);

  return { width, onLayout };
}
