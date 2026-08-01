import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildSplit, formatCents, parseAmount, type Expense } from '@jutrack/core';
import { Button } from '@/components/Button';
import { useCategories, useMembers } from '@/state';
import { useTheme } from '@/theme';
import { todayIso } from './grouping';

export interface ExpenseFormValues {
  amountCents: number;
  date: string;
  categoryId: string | null;
  note: string;
  paidBy: string;
  splitEqually: boolean;
}

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (values: ExpenseFormValues) => void;
  onDelete?: () => void;
  submitLabel: string;
}

export function ExpenseForm({ initial, onSubmit, onDelete, submitLabel }: ExpenseFormProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const categories = useCategories();
  const members = useMembers();

  const [amountText, setAmountText] = useState(
    initial === undefined ? '' : formatCents(initial.amountCents).replace(/\./g, ''),
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [paidBy, setPaidBy] = useState<string>(initial?.paidBy ?? members[0]?.id ?? '');
  const [splitEqually, setSplitEqually] = useState(
    initial === undefined ? members.length > 1 : initial.split.mode !== 'single',
  );
  const [touched, setTouched] = useState(false);

  const amountCents = useMemo(() => parseAmount(amountText), [amountText]);
  // L'errore compare solo dopo il primo tentativo di invio: segnalare "importo non
  // valido" mentre l'utente sta ancora digitando la prima cifra è solo fastidioso.
  const amountError =
    touched && (amountCents === null || amountCents <= 0)
      ? 'Inserisci un importo maggiore di zero'
      : undefined;

  const canSubmit = amountCents !== null && amountCents > 0 && paidBy !== '';

  const handleSubmit = (): void => {
    setTouched(true);
    if (!canSubmit || amountCents === null) return;
    onSubmit({
      amountCents,
      date: initial?.date ?? todayIso(),
      categoryId,
      note: note.trim(),
      paidBy,
      splitEqually,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={[labelStyle(colors.textMuted, fontSize.xs), styles.label]}>IMPORTO</Text>
          <View style={styles.amountRow}>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus={initial === undefined}
              accessibilityLabel="Importo della spesa"
              style={{
                flex: 1,
                color: colors.text,
                fontSize: fontSize.xxl,
                fontWeight: fontWeight.bold,
                paddingVertical: spacing.xs,
              }}
            />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSize.xl,
                fontWeight: fontWeight.bold,
              }}
            >
              €
            </Text>
          </View>
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: amountError ? colors.danger : colors.border,
            }}
          />
          {amountError !== undefined && (
            <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>{amountError}</Text>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[labelStyle(colors.textMuted, fontSize.xs), styles.label]}>DESCRIZIONE</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Facoltativa"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Descrizione della spesa"
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[labelStyle(colors.textMuted, fontSize.xs), styles.label]}>CATEGORIA</Text>
          <View style={styles.chips}>
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(selected ? null : category.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    backgroundColor: selected ? category.color + '25' : colors.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: selected ? category.color : colors.border,
                  }}
                >
                  <Text>{category.icon}</Text>
                  <Text
                    style={{
                      color: selected ? colors.text : colors.textMuted,
                      fontSize: fontSize.sm,
                      fontWeight: selected ? fontWeight.semibold : fontWeight.regular,
                    }}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {members.length > 1 && (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text style={[labelStyle(colors.textMuted, fontSize.xs), styles.label]}>
                CHI HA PAGATO
              </Text>
              <View style={styles.chips}>
                {members.map((member) => {
                  const selected = member.id === paidBy;
                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => setPaidBy(member.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.lg,
                        borderRadius: radius.pill,
                        backgroundColor: selected ? colors.accent : colors.surface,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: selected ? colors.accent : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.textOnAccent : colors.textMuted,
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.medium,
                        }}
                      >
                        {member.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={() => setSplitEqually((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: splitEqually }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                padding: spacing.md,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>Dividi a metà</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                  {splitEqually
                    ? splitPreview(amountCents, members.length)
                    : 'Interamente a carico di chi ha pagato'}
                </Text>
              </View>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: splitEqually ? colors.accent : 'transparent',
                  borderWidth: splitEqually ? 0 : StyleSheet.hairlineWidth * 2,
                  borderColor: colors.border,
                }}
              >
                {splitEqually && <Text style={{ color: colors.textOnAccent }}>✓</Text>}
              </View>
            </Pressable>
          </>
        )}

        <View style={{ gap: spacing.sm }}>
          <Button label={submitLabel} onPress={handleSubmit} disabled={!canSubmit} />
          {onDelete !== undefined && (
            <Button label="Elimina spesa" variant="danger" onPress={onDelete} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Anteprima della quota per persona, per rendere concreto l'effetto dello split. */
function splitPreview(amountCents: number | null, memberCount: number): string {
  if (amountCents === null || amountCents <= 0 || memberCount < 2) {
    return 'Diviso in parti uguali';
  }
  const shares = buildSplit(
    'equal',
    amountCents,
    Array.from({ length: memberCount }, (_, i) => String(i)),
  ).shares;
  const values = Object.values(shares);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Quando l'importo non è divisibile esattamente le quote differiscono di un
  // centesimo: mostrarlo evita che sembri un errore di calcolo.
  return min === max
    ? `${formatCents(min)} € a testa`
    : `${formatCents(min)} € / ${formatCents(max)} € a testa`;
}

function labelStyle(color: string, size: number) {
  return { color, fontSize: size };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { letterSpacing: 0.8, fontWeight: '600' as const },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
