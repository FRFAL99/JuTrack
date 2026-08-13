import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { groupSubtitle, type GroupStats } from '@/features/groups/list';
import type { GroupRecord } from '@/state';
import { useTheme } from '@/theme';

interface GroupRowProps {
  group: GroupRecord;
  /** Nullable perché dallo Step 21 può non esserci alcun gruppo aperto. */
  currentVaultId: string | null;
  /** Spese e totale del mese. Solo per il gruppo aperto: vedi `groupSubtitle`. */
  stats?: GroupStats;
  onPress: () => void;
}

/**
 * Una riga dell'elenco dei gruppi.
 *
 * Vive qui e non dentro l'elenco perché lo stesso elenco compare in due posti: il selettore
 * di gruppo (il foglio che si apre dalla pill nell'header delle spese) e lo stato vuoto
 * «nessun gruppo», che è lo stesso contenuto montato a piena pagina. Due copie
 * divergerebbero, e la prima a divergere sarebbe proprio l'evidenziazione del gruppo aperto,
 * che è l'unico segnale che distingue a colpo d'occhio quello giusto da quello sbagliato.
 */
export function GroupRow({ group, currentVaultId, stats, onPress }: GroupRowProps) {
  // Il sottotitolo lo scrive `groupSubtitle`, che legge la lingua quando gira: senza questo
  // hook la riga non si ridisegnerebbe al cambio, e resterebbe scritta in quella di prima.
  useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const isCurrent = group.vaultId === currentVaultId;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isCurrent }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.lg,
        backgroundColor: pressed
          ? colors.surfacePressed
          : isCurrent
            ? colors.surfacePressed
            : 'transparent',
      })}
    >
      {/* Il pallino non porta informazione da solo: dice la stessa cosa che dice
          «Aperto adesso» nel sottotitolo, ed è lì per farla vedere senza leggere. */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isCurrent ? colors.income : colors.border,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.text,
            fontSize: fontSize.md,
            fontWeight: isCurrent ? fontWeight.semibold : fontWeight.medium,
          }}
        >
          {group.name}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSize.xxs }}>
          {groupSubtitle(group.vaultId, currentVaultId, stats)}
        </Text>
      </View>
    </Pressable>
  );
}
