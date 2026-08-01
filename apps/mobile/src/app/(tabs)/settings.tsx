import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CORE_VERSION } from '@jutrack/core';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useCategories, useMembers, useVaultStore } from '@/state';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const store = useVaultStore();
  const categories = useCategories();
  const members = useMembers();
  const [newMember, setNewMember] = useState('');

  const handleAddMember = (): void => {
    const trimmed = newMember.trim();
    if (trimmed === '') return;
    store.addMember({ name: trimmed, color: '#C2255C' });
    setNewMember('');
  };

  return (
    <Screen title="Impostazioni">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Pressable onPress={() => router.push('/categories')} accessibilityRole="button">
          {({ pressed }) => (
            <Card style={{ backgroundColor: pressed ? colors.surfacePressed : colors.surface }}>
              <View style={styles.rowBetween}>
                <View style={{ gap: 2 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    Categorie
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {categories.length} attive
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>›</Text>
              </View>
            </Card>
          )}
        </Pressable>

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

        <Pressable onPress={() => router.push('/probe')} accessibilityRole="button">
          {({ pressed }) => (
            <Card style={{ backgroundColor: pressed ? colors.surfacePressed : colors.surface }}>
              <View style={styles.rowBetween}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    Diagnostica
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                    Verifica un sottosistema alla volta — crypto, database, portachiavi, relay — e
                    mostra dove si interrompe.
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>›</Text>
              </View>
            </Card>
          )}
        </Pressable>

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
