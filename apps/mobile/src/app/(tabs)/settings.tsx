import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CORE_VERSION } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { expoKeyStore } from '@/platform';
import { createVault, useCategories, useMembers, useSyncState, useVaultRuntime } from '@/state';
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
  const { store, keys, engine } = useVaultRuntime();
  const syncState = useSyncState();
  const categories = useCategories();
  const members = useMembers();
  const [newMember, setNewMember] = useState('');
  const [creating, setCreating] = useState(false);

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
            void createVault(expoKeyStore)
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

  const handleAddMember = (): void => {
    const trimmed = newMember.trim();
    if (trimmed === '') return;
    store.addMember({ name: trimmed, color: '#C2255C' });
    setNewMember('');
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
              Persone
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Con almeno due persone le spese possono essere divise e l&apos;app calcola chi deve
              quanto all&apos;altro.
            </Text>
          </View>

          {members.map((member) => (
            <View key={member.id} style={[styles.rowBetween, { paddingVertical: spacing.xs }]}>
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>{member.name}</Text>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={newMember}
              onChangeText={setNewMember}
              onSubmitEditing={handleAddMember}
              placeholder="Aggiungi una persona"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              accessibilityLabel="Nome della persona da aggiungere"
              style={{
                flex: 1,
                color: colors.text,
                fontSize: fontSize.md,
                backgroundColor: colors.background,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                padding: spacing.md,
              }}
            />
            <Pressable
              onPress={handleAddMember}
              disabled={newMember.trim() === ''}
              accessibilityRole="button"
              style={{
                paddingHorizontal: spacing.lg,
                justifyContent: 'center',
                borderRadius: radius.md,
                backgroundColor: colors.accent,
                opacity: newMember.trim() === '' ? 0.4 : 1,
              }}
            >
              <Text style={{ color: colors.textOnAccent, fontWeight: fontWeight.semibold }}>+</Text>
            </Pressable>
          </View>
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
