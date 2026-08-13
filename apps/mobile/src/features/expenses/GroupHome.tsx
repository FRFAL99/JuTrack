import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { computeBalances, monthBounds, simplifyDebts, totalsByCategory } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { initialOf } from '@/components/avatar';
import { AvatarStack } from '@/components/AvatarStack';
import { Card } from '@/components/Card';
import { HeroAmount } from '@/components/HeroAmount';
import { Screen } from '@/components/Screen';
import { ExpenseRow } from '@/features/expenses/ExpenseRow';
import { describeMyBalance } from '@/features/expenses/balance-line';
import { currentMonth, formatMonthTitle, groupByDay } from '@/features/expenses/grouping';
import { yourShareCents } from '@/features/expenses/share';
import { GroupSwitcherSheet } from '@/features/groups/GroupSwitcherSheet';
import { groupColor } from '@/features/groups/list';
import { describeSync, syncTone } from '@/features/sync/describe';
import { useEngineActivity } from '@/features/sync/useEngineActivity';
import {
  useCategories,
  useCurrencySymbol,
  useExpenses,
  useMembers,
  useMyMemberId,
  useSettlements,
  useSyncState,
  type GroupRecord,
} from '@/state';
import { numeric, tightTitle, useTheme } from '@/theme';

/**
 * Le spese del gruppo aperto: **la radice del primo tab**, e la schermata principale
 * dell'app.
 *
 * Prima la radice era l'elenco dei gruppi e le spese stavano un livello sotto. Aprire l'app
 * per registrare una spesa — che è quello che si fa quasi sempre — costava un tocco su una
 * domanda che si pone di rado, «in quale gruppo?». Adesso quella domanda sta nella pill
 * dell'header, e la risposta in un foglio.
 *
 * **Questo componente è montato da due rotte**, e non è un caso: `/` (il gruppo aperto) e
 * `/groups/<vaultId>` (l'indirizzo su cui atterra chi entra da un invito, che non si può
 * cambiare senza rompere gli inviti già mandati). Le due rotte mostrano la stessa cosa
 * perché sono la stessa cosa; la differenza è solo chi decide quale gruppo — il registro
 * nella prima, l'URL nella seconda, attraverso la guardia del layout.
 *
 * Non si è fatta la strada più ovvia, cioè un `<Redirect href="/" />` in `/groups/<id>`: in
 * uno stack le schermate sotto quella a fuoco **restano montate**, quindi quel redirect
 * scatterebbe anche mentre si guarda `/groups/<id>/manage`, strappando via la gestione del
 * gruppo appena aperta. Un componente condiviso non naviga, e non ha quel modo di fallire.
 */
export function GroupHome({ group }: { group: GroupRecord }) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const insets = useSafeAreaInsets();
  // Qui si guardano le spese dell'altro: è il posto in cui il poll deve essere stretto.
  useEngineActivity();

  const [switching, setSwitching] = useState(false);

  const expenses = useExpenses();
  const categories = useCategories(true);
  const members = useMembers();
  const settlements = useSettlements();
  const myMemberId = useMyMemberId();
  const syncState = useSyncState();

  const month = currentMonth();
  const bounds = monthBounds(month);
  const monthExpenses = useExpenses({ from: bounds.from, to: bounds.to });

  // Mappe invece di `find` dentro la riga: con N spese ed M categorie il rendering
  // passa da N×M confronti a N accessi diretti.
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // `t` fra le dipendenze di questo `useMemo` e del prossimo, e non è cerimonia: `groupByDay`
  // e `describeMyBalance` scrivono testo leggendo la lingua **nel momento in cui girano**.
  // Senza, al cambio di lingua il componente si ridisegnerebbe — `useTranslation` lo fa — ma
  // le intestazioni dei giorni e la riga del saldo resterebbero quelle memoizzate prima, cioè
  // nella lingua di prima. `t` cambia identità a ogni cambio di lingua, ed è il solo appiglio
  // che React ha per accorgersene; la regola vede solo le variabili citate nel corpo, quindi
  // qui la chiama di troppo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sections = useMemo(() => groupByDay(expenses), [expenses, t]);
  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amountCents, 0),
    [monthExpenses],
  );

  /** La barra di composizione: dice «dove sono finiti» senza aprire i Grafici. */
  const composition = useMemo(() => {
    const totals = totalsByCategory(monthExpenses);
    return totals
      .map((total) => ({
        key: total.categoryId ?? 'none',
        share: total.share,
        color:
          total.categoryId === null
            ? colors.textFaint
            : (categoriesById.get(total.categoryId)?.color ?? colors.textFaint),
      }))
      .filter((segment) => segment.share > 0);
  }, [monthExpenses, categoriesById, colors.textFaint]);

  /** Il mio saldo, cumulativo su tutta la storia: un debito non si azzera col calendario. */
  const myBalance = useMemo(
    () =>
      describeMyBalance(
        simplifyDebts(
          computeBalances(
            expenses,
            settlements,
            members.map((m) => m.id),
          ),
        ),
        myMemberId,
        (id) => membersById.get(id)?.name ?? t('common.someone'),
        symbol,
      ),
    [expenses, settlements, members, membersById, myMemberId, symbol, t],
  );

  const balanceColor =
    myBalance.tone === 'credit'
      ? colors.income
      : myBalance.tone === 'debt'
        ? colors.expense
        : colors.textMuted;

  const tone = syncTone(syncState.phase);
  const syncColor =
    tone === 'warn' ? colors.warning : tone === 'ok' ? colors.income : colors.textMuted;

  const header = (
    <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
      <Pressable
        onPress={() => setSwitching(true)}
        accessibilityRole="button"
        accessibilityLabel={t('home.groupLabel', { name: group.name })}
        accessibilityHint={t('home.groupHint')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: 6,
          paddingLeft: 6,
          paddingRight: spacing.md,
          borderRadius: radius.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        })}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: groupColor(group.vaultId),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: fontWeight.bold }}>
            {initialOf(group.name)}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{
            maxWidth: 170,
            color: colors.text,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.bold,
          }}
        >
          {group.name}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={() => router.push(`/groups/${group.vaultId}/manage`)}
        accessibilityRole="button"
        accessibilityLabel={t('home.settings')}
        style={({ pressed }) => ({
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        })}
      >
        <Feather name="sliders" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  const hero = (
    <Card variant="raised" style={{ marginHorizontal: spacing.lg, gap: spacing.md }}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            {formatMonthTitle(month)}
          </Text>
          <HeroAmount
            cents={monthTotal}
            symbol={symbol}
            symbolColor={colors.textMuted}
            style={[
              numeric,
              tightTitle,
              { color: colors.text, fontSize: 38, fontWeight: fontWeight.heavy },
            ]}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 4,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: syncColor + '14',
          }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: syncColor }} />
          <Text style={{ color: syncColor, fontSize: fontSize.xxs }} numberOfLines={1}>
            {describeSync(syncState).text}
          </Text>
        </View>
      </View>

      {/* A zero non si disegna una barra vuota: direbbe «nessuna categoria» dove invece
          non c'è ancora nessuna spesa, che è un'altra cosa. */}
      {composition.length > 0 && (
        <View
          accessible
          accessibilityLabel={t('home.composition')}
          style={{ flexDirection: 'row', gap: 2, height: 7 }}
        >
          {composition.map((segment) => (
            <View
              key={segment.key}
              style={{
                flex: segment.share,
                borderRadius: 4,
                backgroundColor: segment.color,
              }}
            />
          ))}
        </View>
      )}

      {members.length > 1 && (
        <>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
          <View style={styles.heroTop}>
            <AvatarStack people={members} surface={colors.surfaceRaised} />
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                marginLeft: spacing.sm,
                color: balanceColor,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
              }}
            >
              {myBalance.text}
            </Text>
            <Pressable
              onPress={() => router.push('/settle')}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>
                {t('home.settle')}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </Card>
  );

  return (
    <Screen header={header}>
      {expenses.length === 0 ? (
        <View>
          {hero}
          {/* Il FAB resta visibile: è la via d'uscita da questo stato, e uno stato vuoto
              senza via d'uscita è un vicolo cieco. */}
          <View style={{ alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm }}>
            <Feather name="file-text" size={34} color={colors.textFaint} />
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              {t('home.emptyTitle')}
            </Text>
            {/* Il nome del bottone era in grassetto dentro la frase, e adesso è fra
                virgolette dentro una frase sola. Spezzare la frase in due chiavi per
                tenere il grassetto avrebbe imposto al traduttore l'ordine italiano delle
                parole, che è il modo più comune di rompere una traduzione. Le virgolette
                citano il bottone, e la frase in cambio dice anche **dove** si trova. */}
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {t('home.emptyBody', { action: t('home.fab') })}
            </Text>
          </View>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          ListHeaderComponent={hero}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                {
                  paddingHorizontal: spacing.lg + 2,
                  paddingTop: spacing.xl - 4,
                  paddingBottom: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.bold,
                }}
              >
                {section.title}
              </Text>
              <Text style={[numeric, { color: colors.textMuted, fontSize: fontSize.xs }]}>
                {formatMoney(section.totalCents, symbol)}
              </Text>
            </View>
          )}
          // Un contenitore per giorno, e le righe dentro: il `Card variant="flat"` non ha
          // padding proprio, così lo stato premuto di una riga arriva fino al suo bordo.
          // Gli angoli si arrotondano solo in cima e in fondo alla sezione, perché
          // `SectionList` non offre un contenitore per sezione da avvolgere.
          renderItem={({ item, index, section }) => (
            <Card
              variant="flat"
              style={{
                marginHorizontal: spacing.lg,
                borderTopLeftRadius: index === 0 ? radius.lg : 0,
                borderTopRightRadius: index === 0 ? radius.lg : 0,
                borderBottomLeftRadius: index === section.data.length - 1 ? radius.lg : 0,
                borderBottomRightRadius: index === section.data.length - 1 ? radius.lg : 0,
              }}
            >
              {index > 0 && (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: colors.divider,
                    marginLeft: 64,
                  }}
                />
              )}
              <ExpenseRow
                expense={item}
                category={
                  item.categoryId === null ? undefined : categoriesById.get(item.categoryId)
                }
                paidByMember={membersById.get(item.paidBy)}
                yourShareCents={yourShareCents(item, myMemberId)}
                onPress={() => router.push(`/expense/${item.id}`)}
              />
            </Card>
          )}
        />
      )}

      {/* Esteso, non un `+` nudo: quello non diceva **cosa** aggiunge, e in una schermata
          che ha anche gruppi e categorie non era ovvio. */}
      <Pressable
        onPress={() => router.push('/expense/new')}
        accessibilityRole="button"
        accessibilityLabel={t('home.fabLabel')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: pressed ? colors.accentPressed : colors.accent,
            borderRadius: radius.pill,
            bottom: insets.bottom + 14,
            right: spacing.lg,
          },
        ]}
      >
        <Feather name="plus" size={20} color={colors.textOnAccent} />
        <Text
          style={{
            color: colors.textOnAccent,
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
          }}
        >
          {t('home.fab')}
        </Text>
      </Pressable>

      <GroupSwitcherSheet
        visible={switching}
        onClose={() => setSwitching(false)}
        currentStats={{
          expenseCount: expenses.length,
          monthTotal: formatMoney(monthTotal, symbol),
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: '#748FFC',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
});
