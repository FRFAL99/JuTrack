import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMoney } from '@jutrack/core';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ExpenseRow } from '@/features/expenses/ExpenseRow';
import { groupByDay } from '@/features/expenses/grouping';
import { useEngineActivity } from '@/features/sync/useEngineActivity';
import { useCategories, useCurrentGroup, useExpenses, useMembers, type GroupRecord } from '@/state';
import { useTheme } from '@/theme';

/**
 * Le spese del gruppo aperto: il dettaglio del gruppo, non più il primo tab.
 *
 * Il gruppo non è più un parametro implicito da leggere in una pill: è il **titolo**
 * della schermata, e toccarlo porta a gestirlo. Che sia il gruppo giusto lo garantisce la
 * guardia in `[vaultId]/_layout.tsx`, che l'ha reso corrente prima di montare questo.
 *
 * **Quella stessa guardia rende `null` impossibile qui**, ma il compilatore non lo sa, e
 * la risposta non è un `!`: è un componente sopra. Tutti gli hook di sotto leggono il
 * vault, quindi un `return` anticipato in mezzo a loro sarebbe illegale — le chiamate
 * devono venire prima di ogni uscita, e il loro numero non può cambiare fra un render e
 * l'altro. È lo stesso motivo di `PairInviteScreen` → `InviteToGroup`.
 */
export default function ExpensesScreen() {
  const group = useCurrentGroup();
  // Irraggiungibile: il layout mostra il proprio caricamento finché il gruppo dell'URL non
  // è quello corrente, quindi qui non si arriva mai senza. Niente stato vuoto da disegnare.
  if (group === null) return null;
  return <ExpensesOfGroup group={group} />;
}

function ExpensesOfGroup({ group }: { group: GroupRecord }) {
  const { colors, spacing, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  // Qui si guardano le spese dell'altro: è il posto in cui il poll deve essere stretto.
  useEngineActivity();
  const expenses = useExpenses();
  const categories = useCategories(true);
  const members = useMembers();

  // Mappe invece di `find` dentro la riga: con N spese ed M categorie il rendering
  // passa da N×M confronti a N accessi diretti.
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const sections = useMemo(() => groupByDay(expenses), [expenses]);
  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amountCents, 0), [expenses]);

  return (
    <Screen
      title={group.name}
      onTitlePress={() => router.push(`/groups/${group.vaultId}/manage`)}
      titleHint="Apre la gestione del gruppo: nome, persone, invito"
    >
      {expenses.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Nessuna spesa"
          hint="Tocca il pulsante + per registrare la prima."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                Totale · {expenses.length} {expenses.length === 1 ? 'spesa' : 'spese'}
              </Text>
              <Text
                style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}
              >
                {formatMoney(total)}
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                {
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.lg,
                  paddingBottom: spacing.xs,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.semibold,
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                {formatMoney(section.totalCents)}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              category={item.categoryId === null ? undefined : categoriesById.get(item.categoryId)}
              paidByMember={membersById.get(item.paidBy)}
              onPress={() => router.push(`/expense/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/expense/new')}
        accessibilityRole="button"
        accessibilityLabel="Aggiungi spesa"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: pressed ? colors.accentPressed : colors.accent,
            borderRadius: radius.pill,
            bottom: insets.bottom + spacing.lg,
            right: spacing.lg,
          },
        ]}
      >
        <Text style={{ color: colors.textOnAccent, fontSize: 30, lineHeight: 34 }}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
