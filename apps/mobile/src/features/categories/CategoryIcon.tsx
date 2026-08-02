import type { ComponentProps } from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { categoryIconName } from './icon';

type FeatherName = ComponentProps<typeof Feather>['name'];

/**
 * I nomi che questo set conosce davvero, letti dalla libreria e non riscritti a mano:
 * una lista nostra andrebbe fuori sincrono al primo aggiornamento del pacchetto.
 */
const KNOWN: ReadonlySet<string> = new Set(Object.keys(Feather.glyphMap));

interface CategoryIconProps {
  /** Il campo `icon` della categoria: nome Feather, emoji di default, o altro. */
  icon: string | undefined;
  /** Colore della categoria. Vale sia per l'icona sia per il pallino di ripiego. */
  color: string;
  size?: number;
}

/**
 * L'icona di una categoria, o un pallino del suo colore quando non c'è da disegnare.
 *
 * Il ripiego non è un caso d'errore: è la forma che prendono le categorie create a mano
 * prima di questo passo, e permette di lasciare intatto il campo `icon` nel documento
 * condiviso invece di migrarlo su ogni telefono. Vedi `icon.ts`.
 */
export function CategoryIcon({ icon, color, size = 18 }: CategoryIconProps) {
  const name = categoryIconName(icon, KNOWN);

  if (name === null) {
    const dot = Math.round(size / 2);
    return (
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
    );
  }

  // `name` è appena stato confrontato con `Feather.glyphMap`, che è la stessa fonte da cui
  // il tipo è generato: il cast riafferma un controllo già fatto a runtime.
  return <Feather name={name as FeatherName} size={size} color={color} />;
}
