import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CORE_VERSION } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ColorChoice } from '@/features/profile/ColorChoice';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { expoKeyStore } from '@/platform';
import {
  createVault,
  MAX_PROFILE_NAME,
  normalizeProfileName,
  useAppData,
  useCategories,
  useMembers,
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
  const { keys, engine, myMemberId } = useVaultRuntime();
  const { meta, update } = useAppData();
  const profile = useProfile();
  const syncState = useSyncState();
  const categories = useCategories();
  const members = useMembers();
  const [draftName, setDraftName] = useState(profile.name);
  const [creating, setCreating] = useState(false);

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

  const handleCreateVault = (): void => {
    Alert.alert(
      'Creare un vault?',
      "Le spese verranno sincronizzate cifrate con l'altro dispositivo. " +
        'Se perdi la chiave i dati non sono recuperabili: non esiste un reset lato server.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea',
          onPress: () => {
            setCreating(true);
            void createVault(expoKeyStore, meta)
              .then(() => {
                // Il motore di sync viene avviato all'apertura dell'app: il riavvio
                // è il modo più semplice e prevedibile per attivarlo.
                Alert.alert('Vault creato', "Riavvia l'app per attivare la sincronizzazione.");
              })
              .catch((error: unknown) => {
                Alert.alert(
                  'Creazione fallita',
                  error instanceof Error ? error.message : String(error),
                );
              })
              .finally(() => setCreating(false));
          },
        },
      ],
    );
  };

  const others = members.filter((member) => member.id !== myMemberId);

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

        <Card style={{ gap: spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Chi divide le spese
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              {others.length === 0
                ? 'Per ora solo tu. Chi collega il proprio telefono a questo vault compare qui da solo, con il nome del suo profilo.'
                : 'Ognuno si aggiunge da sé collegando il proprio telefono: qui non si aggiungono persone a mano.'}
            </Text>
          </View>

          {/* Sola lettura, di proposito: una persona aggiunta a mano non ha un telefono
              dietro, quindi non potrebbe mai registrare una spesa né vedere il saldo. */}
          {members.map((member) => (
            <View
              key={member.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: member.color,
                }}
              />
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>{member.name}</Text>
              {member.id === myMemberId && (
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>· tu</Text>
              )}
            </View>
          ))}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Vault condiviso
            </Text>
            {keys === null ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                Non configurato. Le spese restano solo su questo telefono. Creando un vault verranno
                sincronizzate, cifrate end-to-end, con l&apos;altro dispositivo.
              </Text>
            ) : (
              <>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                  Attivo · vault {keys.vaultId.slice(0, 8)}…
                </Text>
                <View style={{ paddingTop: spacing.xs }}>
                  <SyncBadge state={syncState} />
                </View>
              </>
            )}
          </View>

          {keys === null ? (
            <>
              <Button
                label={creating ? 'Creazione…' : 'Crea vault'}
                onPress={handleCreateVault}
                loading={creating}
              />
              {/* Il secondo telefono non deve creare un vault proprio: due vault separati
                  non si sincronizzano mai, pur sembrando entrambi funzionanti. */}
              <Button
                label="Ho già un vault sull'altro telefono"
                variant="secondary"
                onPress={() => router.push('/pair/scan')}
              />
            </>
          ) : (
            <>
              <Button
                label="Sincronizza adesso"
                variant="secondary"
                onPress={() => void engine?.syncOnce()}
                disabled={engine === null}
              />
              <Button
                label="Collega un dispositivo"
                variant="secondary"
                onPress={() => router.push('/pair/invite')}
              />
            </>
          )}
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
