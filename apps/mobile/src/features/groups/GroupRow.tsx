import { Pressable, Text, View } from 'react-native';
import { groupSubtitle } from '@/features/groups/list';
import type { GroupRecord } from '@/state';
import { useTheme } from '@/theme';

interface GroupRowProps {
  group: GroupRecord;
  /** Nullable perché dallo Step 21 può non esserci alcun gruppo aperto. */
  currentVaultId: string | null;
  onPress: () => void;
}

/**
 * Una riga dell'elenco dei gruppi.
 *
 * Vive qui e non dentro l'elenco perché lo stesso elenco compare in due posti: la radice
 * del tab Gruppi, e il tab Profilo — «i gruppi di cui fai parte» è una cosa che si dice
 * del profilo tanto quanto del telefono. Due copie divergerebbero, e la prima a divergere
 * sarebbe proprio l'evidenziazione del gruppo aperto, che è l'unico segnale che distingue
 * a colpo d'occhio quello giusto da quello sbagliato.
 */
export function GroupRow({ group, currentVaultId, onPress }: GroupRowProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const isCurrent = group.vaultId === currentVaultId;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isCurrent }}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: pressed
              ? colors.surfacePressed
              : isCurrent
                ? colors.background
                : 'transparent',
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.md,
                fontWeight: isCurrent ? fontWeight.semibold : fontWeight.medium,
              }}
            >
              {group.name}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
              {groupSubtitle(group.vaultId, currentVaultId)}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>›</Text>
        </View>
      )}
    </Pressable>
  );
}
