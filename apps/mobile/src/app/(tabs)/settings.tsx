import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CORE_VERSION } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ColorChoice } from '@/features/profile/ColorChoice';
import { SyncBadge } from '@/features/sync/SyncBadge';
import {
  MAX_PROFILE_NAME,
  normalizeProfileName,
  useAppData,
  useCategories,
  useGroups,
  useProfile,
  useSyncState,
  useVaultRuntime,
} from '@/state';
import { useTheme } from '@/theme';

/**
 * Riga che porta a un'altra schermata.
 *
 * Le impostazioni ne contengono quattro identiche: tenerle allineate a mano significava
 * che una finiva col chevron disallineato o senza stato di pressione.
 */
function NavCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors, fontSize, fontWeight, spacing } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <Card style={{ backgroundColor: pressed ? colors.surfacePressed : colors.surface }}>
          <View style={styles.rowBetween}>
            <View style={{ gap: 2, flex: 1, paddingRight: spacing.sm }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                {subtitle}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>›</Text>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { engine } = useVaultRuntime();
  const { update } = useAppData();
  const { groups, current } = useGroups();
  const profile = useProfile();
  const syncState = useSyncState();
  const categories = useCategories();
  const [draftName, setDraftName] = useState(profile.name);

  // Il nome si salva quando il campo perde il fuoco, non a ogni tasto: scrivendo, ogni
  // lettera produrrebbe un update Yjs, e quindi una riga nel log del relay.
  const commitName = (): void => {
    const normalized = normalizeProfileName(draftName);
    if (normalized === null) {
      setDraftName(profile.name);
      return;
    }
    if (normalized === profile.name) return;
    void update({ name: normalized });
  };

  return (
    <Screen title="Impostazioni">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <NavCard
          title="Categorie"
          subtitle={`${categories.length} attive`}
          onPress={() => router.push('/categories')}
        />

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Il tuo profilo
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              È così che ti vede chi divide le spese con te. Cambiarlo aggiorna anche il suo
              telefono, non crea una persona nuova.
            </Text>
          </View>

          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onBlur={commitName}
            onSubmitEditing={commitName}
            placeholder="Il tuo nome"
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_PROFILE_NAME}
            returnKeyType="done"
            accessibilityLabel="Il tuo nome"
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          />

          <ColorChoice value={profile.color} onChange={(color) => void update({ color })} />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Gruppi
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              {groups.length === 1
                ? `Aperto: ${current.name}. Ogni gruppo è un insieme di spese a sé, con le sue persone.`
                : `Aperto: ${current.name}, su ${groups.length} gruppi. Le spese non si mescolano fra l’uno e l’altro.`}
            </Text>
            <View style={{ paddingTop: spacing.xs }}>
              <SyncBadge state={syncState} />
            </View>
          </View>

          <Button
            label="I tuoi gruppi"
            variant="secondary"
            onPress={() => router.push('/groups')}
          />
          <Button
            label={`Apri «${current.name}»`}
            variant="secondary"
            onPress={() => router.push(`/groups/${current.vaultId}`)}
          />
          <Button
            label="Sincronizza adesso"
            variant="secondary"
            onPress={() => void engine.syncOnce()}
          />
        </Card>

        <NavCard
          title="Backup della chiave"
          subtitle="I dati sono cifrati end-to-end: senza la chiave nessuno può leggerli, nemmeno noi. Se la perdi non esiste un reset lato server — il backup è l'unica rete di sicurezza."
          onPress={() => router.push('/backup')}
        />

        <NavCard
          title="Esporta i dati"
          subtitle="Spese e pareggi in CSV, oppure il vault intero in JSON. Nessun lock-in: i tuoi dati escono quando vuoi."
          onPress={() => router.push('/export')}
        />

        <NavCard
          title="Diagnostica"
          subtitle="Verifica un sottosistema alla volta — crypto, database, portachiavi, relay — e mostra dove si interrompe."
          onPress={() => router.push('/probe')}
        />

        <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            JuTrack 0.1.0 · core {CORE_VERSION}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
