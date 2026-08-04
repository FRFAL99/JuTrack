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
  parseAmount,
  type Expense,
  type ExpenseSplit,
  type Member,
  type SplitMode,
} from '@jutrack/core';
import { initialOf } from '@/components/avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/features/categories/CategoryIcon';
import { useCategories, useMembers, useMyMemberId } from '@/state';
import { numeric, tightTitle, useTheme } from '@/theme';
import { formatDayTitle, todayIso } from './grouping';
import { describeGap, previewShareCents, splitModeLabel, splitPreview } from './split-text';

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

/**
 * Il form della spesa: **importo → chi e come → categoria → dettagli**.
 *
 * È l'ordine in cui la spesa viene detta a voce («cinquanta euro, ho pagato io, si divide,
 * spesa al supermercato»), e non quello in cui era scritto prima — importo, descrizione,
 * categoria, chi ha pagato, come si divide, con la parte sui soldi divisa in due tronconi
 * separati dal resto. Era la schermata più densa dell'app, ed è quella che si apre più
 * spesso.
 *
 * **Il salva sta in fondo, non in alto.** A piena larghezza, dove arriva il pollice: in una
 * schermata che si compila dall'alto verso il basso, l'azione che la conclude è l'ultima
 * cosa, non la prima. In alto resta solo la x per uscire.
 *
 * La logica di calcolo non è cambiata: `parseAmount`, `buildSplit` e la validazione delle
 * quote sono quelle di prima, e le frasi che le spiegano sono uscite in `split-text.ts`,
 * dove hanno dei test.
 */
export function ExpenseForm({ initial, onSubmit, onDelete, submitLabel }: ExpenseFormProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const categories = useCategories();
  const members = useMembers();
  const myMemberId = useMyMemberId();

  const [amountText, setAmountText] = useState(
    initial === undefined ? '' : formatCents(initial.amountCents).replace(/\./g, ''),
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [editingNote, setEditingNote] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  // Chi paga è quasi sempre chi sta scrivendo: il proprio membro è il default, non il
  // primo della lista in ordine alfabetico.
  const [paidBy, setPaidBy] = useState<string>(initial?.paidBy ?? myMemberId);
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

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

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
      const equal = buildSplit('equal', amountCents, memberIds).shares;
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
    return buildSplit('equal', total, memberIds);
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

  const sectionTitle = {
    color: colors.textMuted,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. L'importo è la card eroe, e **la cifra è il campo**: non c'è un riquadro da
            centrare col dito, si tocca il numero. */}
        <Card
          variant="raised"
          style={{
            marginHorizontal: spacing.lg,
            padding: 22,
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <Text style={sectionTitle}>Importo</Text>
          <View style={styles.amountRow}>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0,00"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              autoFocus={initial === undefined}
              accessibilityLabel="Importo della spesa"
              style={[
                numeric,
                tightTitle,
                {
                  minWidth: 120,
                  textAlign: 'right',
                  color: colors.text,
                  fontSize: fontSize.display,
                  fontWeight: fontWeight.heavy,
                  padding: 0,
                },
              ]}
            />
            <Text
              style={{
                color: colors.textFaint,
                fontSize: fontSize.xl,
                fontWeight: fontWeight.heavy,
              }}
            >
              €
            </Text>
          </View>
          {amountError !== undefined && (
            <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>{amountError}</Text>
          )}
        </Card>

        {/* 2. Chi paga e come si divide: una domanda sola, perché la risposta all'una
            cambia il significato dell'altra. Con una persona sola non si pone. */}
        {members.length > 1 && (
          <View style={{ paddingTop: spacing.lg }}>
            <Text style={[sectionTitle, { paddingHorizontal: spacing.lg + 2 }]}>
              Chi paga e come si divide
            </Text>
            <Card
              variant="flat"
              style={{
                marginHorizontal: spacing.lg,
                marginTop: spacing.sm,
                paddingVertical: spacing.lg,
                paddingHorizontal: 18,
                gap: spacing.md,
              }}
            >
              <View style={styles.people}>
                {members.map((member) => (
                  <PersonBox
                    key={member.id}
                    member={member}
                    selected={member.id === paidBy}
                    isMe={member.id === myMemberId}
                    shareCents={previewShareCents(mode, amountCents, memberIds, member.id, paidBy)}
                    onPress={() => setPaidBy(member.id)}
                  />
                ))}
              </View>

              <View style={styles.chips}>
                {SPLIT_MODES.map((value) => {
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
                        backgroundColor: selected ? colors.accent : 'transparent',
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
                        {splitModeLabel(value, members.length)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'equal' && (
                <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                  {splitPreview(amountCents, members.length)}
                </Text>
              )}
              {mode === 'single' && (
                <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
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
                        placeholderTextColor={colors.textFaint}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`Quota a carico di ${member.name}`}
                        style={[
                          numeric,
                          {
                            width: 110,
                            textAlign: 'right',
                            color: colors.text,
                            fontSize: fontSize.sm,
                            backgroundColor: colors.background,
                            borderRadius: radius.md,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: colors.border,
                            paddingVertical: spacing.sm,
                            paddingHorizontal: spacing.md,
                          },
                        ]}
                      />
                    </View>
                  ))}
                  {/* Quote che non sommano al totale produrrebbero un saldo sbagliato:
                      VaultStore le rifiuterebbe, ma dirlo qui è più utile che scoprirlo
                      con un errore al salvataggio. */}
                  <Text
                    style={{
                      color: customGap === 0 ? colors.income : colors.danger,
                      fontSize: fontSize.xxs,
                    }}
                  >
                    {describeGap(customGap, amountCents)}
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* 3. Categoria: pill col pallino del colore. */}
        <View style={{ paddingTop: spacing.lg }}>
          <Text style={[sectionTitle, { paddingHorizontal: spacing.lg + 2 }]}>Categoria</Text>
          <Card
            variant="flat"
            style={{
              marginHorizontal: spacing.lg,
              marginTop: spacing.sm,
              paddingVertical: spacing.lg,
              paddingHorizontal: 18,
            }}
          >
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
                      gap: spacing.xs + 2,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.pill,
                      backgroundColor: selected ? category.color + '22' : 'transparent',
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: selected ? category.color : colors.border,
                    }}
                  >
                    <CategoryIcon icon={category.icon} color={category.color} size={14} />
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
          </Card>
        </View>

        {/* 4. I dettagli, che si toccano di rado: data e nota. */}
        <View style={{ paddingTop: spacing.lg }}>
          <Card
            variant="flat"
            style={{ marginHorizontal: spacing.lg, paddingHorizontal: 18, paddingVertical: 4 }}
          >
            {/* La data **non è modificabile**, come non lo era prima: un selettore di date
                vuole un modulo nativo (`@react-native-community/datetimepicker`), quindi
                una build EAS nuova. Mostrarla resta utile — su una spesa vecchia dice di
                quale giorno si sta parlando — e una riga che non si tocca è più onesta di
                un campo che finge. */}
            <View style={[styles.detailRow, { paddingVertical: spacing.md }]}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Data</Text>
              <Text style={[numeric, { color: colors.text, fontSize: fontSize.sm }]}>
                {formatDayTitle(initial?.date ?? todayIso())}
              </Text>
            </View>

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />

            {editingNote ? (
              <TextInput
                autoFocus
                value={note}
                onChangeText={setNote}
                onBlur={() => setEditingNote(false)}
                onSubmitEditing={() => setEditingNote(false)}
                placeholder="Per esempio: spesa al supermercato"
                placeholderTextColor={colors.textFaint}
                returnKeyType="done"
                accessibilityLabel="Nota della spesa"
                style={{
                  color: colors.text,
                  fontSize: fontSize.sm,
                  paddingVertical: spacing.md,
                }}
              />
            ) : (
              <Pressable
                onPress={() => setEditingNote(true)}
                accessibilityRole="button"
                accessibilityLabel={note === '' ? 'Aggiungi una nota' : `Nota: ${note}`}
                style={[styles.detailRow, { paddingVertical: spacing.md }]}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Nota</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    textAlign: 'right',
                    color: note === '' ? colors.textFaint : colors.text,
                    fontSize: fontSize.sm,
                  }}
                >
                  {note === '' ? 'Facoltativa' : note}
                </Text>
              </Pressable>
            )}
          </Card>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.sm }}>
          <Button
            label={submitLabel}
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{ minHeight: 54 }}
          />
          {onDelete !== undefined && (
            <Button label="Elimina spesa" variant="danger" onPress={onDelete} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Il riquadro di una persona: chi ha pagato, e quanto gli tocca.
 *
 * Selezionato prende il **colore del membro**, non l'accento: è la stessa tinta con cui
 * quella persona compare negli avatar e nei grafici, quindi il riquadro dice *chi* e non
 * solo *scelto*. L'iniziale e il nome ci sono sempre, quindi il colore non porta l'identità
 * da solo.
 */
function PersonBox({
  member,
  selected,
  isMe,
  shareCents,
  onPress,
}: {
  member: Member;
  selected: boolean;
  isMe: boolean;
  shareCents: number | null;
  onPress: () => void;
}) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Ha pagato ${member.name}`}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: 120,
        alignItems: 'center',
        gap: 4,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? member.color : colors.border,
        backgroundColor: selected
          ? member.color + '22'
          : pressed
            ? colors.surfacePressed
            : 'transparent',
      })}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: member.color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.textOnAccent, fontSize: 11, fontWeight: fontWeight.bold }}>
          {initialOf(member.name)}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontSize: fontSize.sm,
          fontWeight: selected ? fontWeight.semibold : fontWeight.regular,
        }}
      >
        {isMe ? 'Tu' : member.name}
      </Text>
      {/* La quota si aggiorna mentre si scrive l'importo: è ciò che rende visibile la
          differenza fra le tre modalità senza doverle provare una a una. */}
      <Text style={[numeric, { color: colors.textFaint, fontSize: fontSize.xxs }]}>
        {shareCents === null ? ' ' : `${formatCents(shareCents)} €`}
      </Text>
    </Pressable>
  );
}

const SPLIT_MODES: SplitMode[] = ['equal', 'custom', 'single'];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
