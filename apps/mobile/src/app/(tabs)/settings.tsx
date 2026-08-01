import { ScrollView, Text, View } from 'react-native';
import { CORE_VERSION } from '@jutrack/core';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  return (
    <Screen title="Impostazioni">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.xs }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Vault condiviso
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Non ancora configurato. Da qui potrai creare un vault o collegarti a quello del tuo
            partner scansionando un QR.
          </Text>
        </Card>

        <Card style={{ gap: spacing.xs }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Backup della chiave
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            I dati sono cifrati end-to-end: senza la chiave nessuno può leggerli, nemmeno noi. Il
            rovescio della medaglia è che se perdi la chiave i dati non sono recuperabili — non
            esiste un reset lato server. Il backup sarà disponibile qui.
          </Text>
        </Card>

        <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            JuTrack 0.1.0 · core {CORE_VERSION}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
