import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  computeBalances,
  formatCents,
  formatMoney,
  parseAmount,
  simplifyDebts,
} from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { formatDayTitle, todayIso } from '@/features/expenses/grouping';
import { useCurrencySymbol, useExpenses, useMembers, useSettlements, useVaultStore } from '@/state';
import { useTheme } from '@/theme';

/**
 * Registra un pagamento che salda un debito.
 *
 * Un pareggio non cancella né modifica le spese: quelle restano lo storico di cosa è
 * stato comprato. Sposta solo il saldo. Senza questa schermata il debito calcolato
 * crescerebbe all'infinito anche dopo essere stato pagato davvero, e il numero
 * smetterebbe di voler dire qualcosa.
 */
export default function SettleScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const store = useVaultStore();
  const members = useMembers();
  const expenses = useExpenses();
  const settlements = useSettlements();

  const transfers = useMemo(
    () =>
      simplifyDebts(
        computeBalances(
          expenses,
          settlements,
          members.map((m) => m.id),
        ),
      ),
    [expenses, settlements, members],
  );

  // Importo per ciascun pagamento proposto: precompilato col dovuto, ma modificabile
  // perché si salda anche solo in parte — «ti do venti adesso, il resto poi».
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const nameOf = (id: string): string => members.find((m) => m.id === id)?.name ?? 'qualcuno';

  const register = (fromMember: string, toMember: string, suggested: number): void => {
    const key = `${fromMember}-${toMember}`;
    const typed = amounts[key];
    const amountCents = typed === undefined || typed.trim() === '' ? suggested : parseAmount(typed);

    if (amountCents === null || amountCents <= 0) {
      Alert.alert('Importo non valido', 'Inserisci una cifra maggiore di zero.');
      return;
    }
    if (amountCents > suggested) {
      Alert.alert(
        'Più del dovuto',
        `Il debito è di ${formatMoney(suggested, symbol)}. Registrando ${formatMoney(amountCents, symbol)} il saldo si rovescerebbe a favore di chi paga.`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Registra comunque', onPress: () => commit(fromMember, toMember, amountCents) },
        ],
      );
      return;
    }
    commit(fromMember, toMember, amountCents);
  };

  const commit = (fromMember: string, toMember: string, amountCents: number): void => {
    try {
      store.addSettlement({ fromMember, toMember, amountCents, date: todayIso() });
      setAmounts((current) => ({ ...current, [`${fromMember}-${toMember}`]: '' }));
    } catch (error) {
      Alert.alert('Non registrato', error instanceof Error ? error.message : String(error));
    }
  };

  const remove = (id: string, description: string): void => {
    Alert.alert('Eliminare il pareggio?', `${description}. Il debito tornerà a comparire.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => store.deleteSettlement(id) },
    ]);
  };

  return (
    <ModalScreen title="Pareggi">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {transfers.length === 0 ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.md, lineHeight: 22 }}>
              Siete pari: non c&apos;è niente da saldare.
            </Text>
          </Card>
        ) : (
          transfers.map((transfer) => {
            const key = `${transfer.fromMember}-${transfer.toMember}`;
            return (
              <Card key={key} style={{ gap: spacing.md }}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, lineHeight: 22 }}>
                  {nameOf(transfer.fromMember)} deve{' '}
                  <Text style={{ fontWeight: fontWeight.semibold }}>
                    {formatMoney(transfer.amountCents, symbol)}
                  </Text>{' '}
                  a {nameOf(transfer.toMember)}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <TextInput
                    value={amounts[key] ?? ''}
                    onChangeText={(text) => setAmounts((c) => ({ ...c, [key]: text }))}
                    placeholder={formatCents(transfer.amountCents)}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Importo del pareggio"
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
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>{symbol}</Text>
                </View>

                <Button
                  label="Ha pagato"
                  onPress={() =>
                    register(transfer.fromMember, transfer.toMember, transfer.amountCents)
                  }
                />
              </Card>
            );
          })
        )}

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Storico
          </Text>
          {settlements.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Nessun pareggio registrato finora.
            </Text>
          ) : (
            settlements.map((settlement) => {
              const description = `${nameOf(settlement.fromMember)} → ${nameOf(settlement.toMember)}, ${formatMoney(settlement.amountCents, symbol)}`;
              return (
                <View key={settlement.id} style={styles.rowBetween}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.sm }}>{description}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                      {formatDayTitle(settlement.date)}
                    </Text>
                  </View>
                  <Text
                    onPress={() => remove(settlement.id, description)}
                    accessibilityRole="button"
                    style={{ color: colors.danger, fontSize: fontSize.sm, padding: spacing.xs }}
                  >
                    Elimina
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
