import { Text, View } from 'react-native';
import type { SyncState } from '@jutrack/core';
import { useTheme } from '@/theme';
import { describeSync, syncTone } from './describe';

export { describeSync };

/** Stato della sincronizzazione, in forma leggibile. */
export function SyncBadge({ state }: { state: SyncState }) {
  const { colors, spacing, fontSize } = useTheme();
  const { icon, text } = describeSync(state);

  const tone = syncTone(state.phase);
  const color = tone === 'warn' ? colors.warning : tone === 'ok' ? colors.income : colors.textMuted;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Text style={{ color, fontSize: fontSize.xs }}>{icon}</Text>
      <Text style={{ color, fontSize: fontSize.xs, flex: 1 }} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}
