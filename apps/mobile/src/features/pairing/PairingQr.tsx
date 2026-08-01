import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { buildQrPath } from './qr-path';

interface PairingQrProps {
  /** Testo da codificare. Per il pairing è l'URI prodotto da `createPairingInvite`. */
  value: string;
  /** Lato del quadrato in punti. */
  size: number;
}

/**
 * Disegna il QR di pairing.
 *
 * Sfondo bianco e moduli scuri anche in tema scuro: i lettori si aspettano il contrasto
 * canonico, e un codice invertito viene spesso ignorato in silenzio.
 */
export function PairingQr({ value, size }: PairingQrProps) {
  const { path, extent } = useMemo(() => buildQrPath(value), [value]);

  return (
    <View accessible accessibilityLabel="Codice QR di collegamento">
      <Svg width={size} height={size} viewBox={`0 0 ${extent} ${extent}`}>
        <Rect x={0} y={0} width={extent} height={extent} fill="#FFFFFF" />
        <Path d={path} fill="#101014" />
      </Svg>
    </View>
  );
}
