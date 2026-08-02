import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { MAX_GROUP_NAME, normalizeGroupName, useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * I gruppi di questo telefono.
 *
 * Un gruppo è un vault a sé: chiave propria, spese proprie, persone proprie. «Casa» e
 * «Viaggio in Grecia» non si mescolano, e non serve più un telefono per ciascuno.
 *
 * Aprire un gruppo lo rende quello corrente: il motore di sync si sposta lì, perché
 * tenerne due accesi raddoppierebbe le richieste al relay per un gruppo che nessuno sta
 * guardando. Gli altri si riallineano appena li si apre.
 */
export default function GroupsScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { groups, current, create } = useGroups();

  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);

  const normalized = normalizeGroupName(draft);

  const handleCreate = (): void => {
    if (normalized === null || creating) return;
    setCreating(true);
    void create(normalized)
      .then((group) => {
        setDraft('');
        router.replace(`/groups/${group.vaultId}`);
      })
      .catch((cause: unknown) => {
        Alert.alert('Creazione fallita', cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setCreating(false));
  };

  return (
    <ModalScreen title="I tuoi gruppi">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <Card style={{ gap: spacing.xs }}>
          {groups.map((group) => {
            const isCurrent = group.vaultId === current.vaultId;
            return (
              <Pressable
                key={group.vaultId}
                onPress={() => router.push(`/groups/${group.vaultId}`)}
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
                        {isCurrent ? 'Aperto adesso' : `vault ${group.vaultId.slice(0, 8)}…`}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>›</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Crea un gruppo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Nasce vuoto e solo tuo. Diventa condiviso quando inviti qualcuno dal gruppo stesso.
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleCreate}
            placeholder="Casa, Viaggio, Coinquilini…"
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_GROUP_NAME}
            returnKeyType="done"
            accessibilityLabel="Nome del gruppo"
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
          <Button
            label={creating ? 'Creazione…' : 'Crea'}
            onPress={handleCreate}
            disabled={normalized === null}
            loading={creating}
          />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Entra in un gruppo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Serve il codice mostrato dall&apos;altro telefono. I gruppi che hai già restano dove
            sono.
          </Text>
          <Button
            label="Scansiona un codice"
            variant="secondary"
            onPress={() => router.push('/pair/scan')}
          />
        </Card>
      </ScrollView>
    </ModalScreen>
  );
}
