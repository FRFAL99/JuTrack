import { Text, View } from 'react-native';
import type { SyncState } from '@jutrack/core';
import { useTheme } from '@/theme';
import { describeSync } from './describe';

export { describeSync };

/** Stato della sincronizzazione, in forma leggibile. */
export function SyncBadge({ state }: { state: SyncState }) {
  const { colors, spacing, fontSize } = useTheme();
  const { icon, text } = describeSync(state);

  const color =
    state.phase === 'error' || state.phase === 'offline' || state.phase === 'blocked'
      ? colors.warning
      : state.phase === 'synced'
        ? colors.income
        : colors.textMuted;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Text style={{ color, fontSize: fontSize.xs }}>{icon}</Text>
      <Text style={{ color, fontSize: fontSize.xs, flex: 1 }} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}
