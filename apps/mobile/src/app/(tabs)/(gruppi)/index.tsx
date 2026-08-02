import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { groupSubtitle } from '@/features/groups/list';
import { MAX_GROUP_NAME, normalizeGroupName, useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * I gruppi di questo telefono: la radice del primo tab.
 *
 * Un gruppo è un vault a sé: chiave propria, spese proprie, persone proprie. «Casa» e
 * «Viaggio in Grecia» non si mescolano, e non serve più un telefono per ciascuno.
 *
 * Aprire un gruppo lo rende quello corrente: il motore di sync si sposta lì, perché
 * tenerne due accesi raddoppierebbe le richieste al relay per un gruppo che nessuno sta
 * guardando. Gli altri si riallineano appena li si apre.
 *
 * Non è più una modale: è la schermata a cui risponde `/`, cioè l'URL iniziale su nativo.
 * Quindi niente «Chiudi» — non c'è nulla sotto da scoprire.
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
        // `push` e non `replace`: l'elenco è la radice di questo stack, e sostituirlo
        // lascerebbe il gruppo appena creato senza nulla sotto — «indietro» uscirebbe
        // dall'app invece di tornare qui.
        router.push(`/groups/${group.vaultId}`);
      })
      .catch((cause: unknown) => {
        Alert.alert('Creazione fallita', cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setCreating(false));
  };

  return (
    <Screen title="I tuoi gruppi">
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
                        {groupSubtitle(group.vaultId, current.vaultId)}
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
            Serve un invito: il link che ti hanno mandato, o il codice mostrato dall&apos;altro
            telefono. I gruppi che hai già restano dove sono.
          </Text>
          <Button
            label="Incolla un invito o scansiona"
            variant="secondary"
            onPress={() => router.push('/pair/scan')}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
