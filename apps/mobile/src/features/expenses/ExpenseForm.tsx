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
import {
  buildSplit,
  formatCents,
  formatMoney,
  parseAmount,
  type Expense,
  type ExpenseSplit,
  type SplitMode,
} from '@jutrack/core';
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
  /**
   * Quote già bilanciate sull'importo.
   *
   * Le costruisce il form, non le schermate che lo usano: la coerenza fra `mode` e
   * `shares` è una sola regola, e duplicarla in ogni chiamante è il modo più rapido per
   * farle divergere.
   */
  split: ExpenseSplit;
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
  const [mode, setMode] = useState<SplitMode>(
    initial?.split.mode ?? (members.length > 1 ? 'equal' : 'single'),
  );
  // Quote personalizzate come testo: convertirle in centesimi a ogni tasto
  // impedirebbe di scrivere «12,» mentre si digita «12,50».
  const [customShares, setCustomShares] = useState<Record<string, string>>(() =>
    initial?.split.mode === 'custom'
      ? Object.fromEntries(
          Object.entries(initial.split.shares).map(([id, v]) => [id, formatCents(v)]),
        )
      : {},
  );
  const [touched, setTouched] = useState(false);

  const amountCents = useMemo(() => parseAmount(amountText), [amountText]);
  // L'errore compare solo dopo il primo tentativo di invio: segnalare "importo non
  // valido" mentre l'utente sta ancora digitando la prima cifra è solo fastidioso.
  const amountError =
    touched && (amountCents === null || amountCents <= 0)
      ? 'Inserisci un importo maggiore di zero'
      : undefined;

  const customTotal = useMemo(
    () => members.reduce((sum, m) => sum + (parseAmount(customShares[m.id] ?? '') ?? 0), 0),
    [customShares, members],
  );
  const customGap = (amountCents ?? 0) - customTotal;
  const customBalances = mode !== 'custom' || (amountCents !== null && customGap === 0);

  const canSubmit = amountCents !== null && amountCents > 0 && paidBy !== '' && customBalances;

  /** Passando a quote libere si parte dalla divisione equa: è il punto di partenza più probabile. */
  const chooseMode = (next: SplitMode): void => {
    if (next === 'custom' && Object.keys(customShares).length === 0 && amountCents !== null) {
      const equal = buildSplit(
        'equal',
        amountCents,
        members.map((m) => m.id),
      ).shares;
      setCustomShares(
        Object.fromEntries(Object.entries(equal).map(([id, v]) => [id, formatCents(v)])),
      );
    }
    setMode(next);
  };

  const buildValues = (total: number): ExpenseSplit => {
    if (mode === 'single' || members.length < 2) return buildSplit('single', total, [paidBy]);
    if (mode === 'custom') {
      const shares = Object.fromEntries(
        members.map((m) => [m.id, parseAmount(customShares[m.id] ?? '') ?? 0]),
      );
      return { mode: 'custom', shares };
    }
    return buildSplit(
      'equal',
      total,
      members.map((m) => m.id),
    );
  };

  const handleSubmit = (): void => {
    setTouched(true);
    if (!canSubmit || amountCents === null) return;
    onSubmit({
      amountCents,
      date: initial?.date ?? todayIso(),
      categoryId,
      note: note.trim(),
      paidBy,
      split: buildValues(amountCents),
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

            <View style={{ gap: spacing.sm }}>
              <Text style={[labelStyle(colors.textMuted, fontSize.xs), styles.label]}>
                COME SI DIVIDE
              </Text>
              <View style={styles.chips}>
                {SPLIT_MODES.map(({ value, label }) => {
                  const selected = value === mode;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => chooseMode(value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
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
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'equal' && (
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                  {splitPreview(amountCents, members.length)}
                </Text>
              )}
              {mode === 'single' && (
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                  Interamente a carico di chi ha pagato
                </Text>
              )}

              {mode === 'custom' && (
                <View style={{ gap: spacing.sm }}>
                  {members.map((member) => (
                    <View key={member.id} style={styles.shareRow}>
                      <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sm }}>
                        {member.name}
                      </Text>
                      <TextInput
                        value={customShares[member.id] ?? ''}
                        onChangeText={(text) =>
                          setCustomShares((current) => ({ ...current, [member.id]: text }))
                        }
                        placeholder="0,00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`Quota a carico di ${member.name}`}
                        style={{
                          width: 110,
                          textAlign: 'right',
                          color: colors.text,
                          fontSize: fontSize.sm,
                          backgroundColor: colors.surface,
                          borderRadius: radius.md,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.border,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                        }}
                      />
                    </View>
                  ))}
                  {/* Quote che non sommano al totale produrrebbero un saldo sbagliato:
                      VaultStore le rifiuterebbe, ma dirlo qui è più utile che scoprirlo
                      con un errore al salvataggio. */}
                  <Text
                    style={{
                      color: customGap === 0 ? colors.income : colors.danger,
                      fontSize: fontSize.xs,
                    }}
                  >
                    {describeGap(customGap, amountCents)}
                  </Text>
                </View>
              )}
            </View>
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

const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: 'equal', label: 'In parti uguali' },
  { value: 'single', label: 'Solo chi ha pagato' },
  { value: 'custom', label: 'Quote libere' },
];

/** Dice quanto manca o quanto avanza rispetto al totale, in parole. */
function describeGap(gap: number, amountCents: number | null): string {
  if (amountCents === null || amountCents <= 0) return 'Inserisci prima l’importo della spesa';
  if (gap === 0) return 'Le quote coprono esattamente il totale';
  return gap > 0 ? `Mancano ${formatMoney(gap)}` : `Eccedono di ${formatMoney(-gap)}`;
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
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
