import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Category, IsoDate, Member, PersonMode } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { CategoryIcon } from '@/features/categories/CategoryIcon';
import { plural } from '@/i18n/translate';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { AMOUNT_CHOICES, amountRange, isAmountChosen } from './amount';
import { hasValue, KEY_OF, toggleValue, type QueryFacets } from './facets';
import { PeriodPicker } from './PeriodPicker';
import type { Period } from './period';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  facets: QueryFacets;
  onFacetsChange: (facets: QueryFacets) => void;
  categories: Category[];
  members: Member[];
  /** Il vocabolario del gruppo, derivato dalle spese: `knownStores` e `knownTags`. */
  stores: string[];
  tags: string[];
  /** Quante spese soddisfano la domanda in questo momento. */
  matchCount: number;
  today: IsoDate;
}

/**
 * I sei filtri, in un foglio dal basso.
 *
 * **Le modifiche si applicano subito**, non a un «Applica»: la barra dei chip resta visibile
 * sopra il foglio e il conteggio in fondo cambia mentre si tocca, quindi si vede l'effetto
 * di un filtro prima di chiudere. Uno stato di bozza da confermare vorrebbe dire tenere due
 * copie della stessa domanda e un modo di sbagliare a riallinearle.
 *
 * **`Modal` di React Native e non `@gorhom/bottom-sheet`**, con struttura e misure copiate
 * da `features/groups/GroupSwitcherSheet.tsx`: quello porterebbe `react-native-reanimated` e
 * `react-native-gesture-handler`, due moduli nativi, cioè una build EAS nuova per
 * un'animazione. È la stessa decisione presa lì e per il selettore di date, e va pagata
 * quando servirà trascinare il foglio con il dito, non prima.
 */
export function FilterSheet({
  visible,
  onClose,
  period,
  onPeriodChange,
  facets,
  onFacetsChange,
  categories,
  members,
  stores,
  tags,
  matchCount,
  today,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const insets = useSafeAreaInsets();

  /** Le due modalità del filtro persona, con le parole che le distinguono davvero. */
  const personModes: { id: PersonMode; label: string }[] = [
    { id: 'owed', label: t('stats.filters.personMode.owed') },
    { id: 'paid', label: t('stats.filters.personMode.paid') },
  ];

  const patch = (change: QueryFacets) => onFacetsChange({ ...facets, ...change });

  /** Una chiave che sparisce invece di restare a `undefined`: la vuole `exactOptionalPropertyTypes`. */
  const without = (key: keyof QueryFacets): QueryFacets => {
    const next = { ...facets };
    delete next[key];
    return next;
  };

  const setList = (key: 'categoryIds' | 'stores' | 'tags', value: string[] | undefined) =>
    onFacetsChange(value === undefined ? without(key) : { ...facets, [key]: value });

  const chooseMember = (memberId: string) => {
    if (facets.memberId === memberId) {
      const next = without('memberId');
      delete next.personMode;
      onFacetsChange(next);
      return;
    }
    patch({ memberId });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          maxHeight: '80%',
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
          <Section title={t('stats.filters.sections.period')}>
            <PeriodPicker period={period} onChange={onPeriodChange} today={today} />
          </Section>

          {/* Con una persona sola il filtro non ha niente da separare: mostrarlo sarebbe
              una domanda a cui c'è una risposta sola. */}
          {members.length > 1 && (
            <Section title={t('stats.filters.sections.person')}>
              <View style={styles.chips}>
                {members.map((member) => (
                  <Chip
                    key={member.id}
                    label={member.name}
                    color={member.color}
                    selected={facets.memberId === member.id}
                    onPress={() => chooseMember(member.id)}
                  />
                ))}
              </View>
              {facets.memberId !== undefined && (
                <View style={{ gap: spacing.sm }}>
                  <View style={styles.chips}>
                    {personModes.map((mode) => (
                      <Chip
                        key={mode.id}
                        label={mode.label}
                        selected={(facets.personMode ?? 'owed') === mode.id}
                        onPress={() => patch({ personMode: mode.id })}
                      />
                    ))}
                  </View>
                  {/* La differenza fra le due va detta: sono la stessa spesa vista da due
                      lati, e un numero plausibile e sbagliato non si riconosce a occhio. */}
                  <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs, lineHeight: 16 }}>
                    {(facets.personMode ?? 'owed') === 'owed'
                      ? t('stats.filters.personModeHint.owed')
                      : t('stats.filters.personModeHint.paid')}
                  </Text>
                </View>
              )}
            </Section>
          )}

          {categories.length > 0 && (
            <Section title={t('stats.filters.sections.category')}>
              <View style={styles.chips}>
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    color={category.color}
                    icon={<CategoryIcon icon={category.icon} color={category.color} size={14} />}
                    selected={hasValue(facets.categoryIds, category.id, KEY_OF.category)}
                    onPress={() =>
                      setList(
                        'categoryIds',
                        toggleValue(facets.categoryIds, category.id, KEY_OF.category),
                      )
                    }
                  />
                ))}
              </View>
            </Section>
          )}

          {/* Negozi e tag compaiono solo se esistono: il vocabolario si deriva dalle spese,
              e in un gruppo che non li usa questi due blocchi sarebbero vuoti. */}
          {stores.length > 0 && (
            <Section title={t('stats.filters.sections.store')}>
              <View style={styles.chips}>
                {stores.map((store) => (
                  <Chip
                    key={KEY_OF.store(store)}
                    label={store}
                    selected={hasValue(facets.stores, store, KEY_OF.store)}
                    onPress={() =>
                      setList('stores', toggleValue(facets.stores, store, KEY_OF.store))
                    }
                  />
                ))}
              </View>
            </Section>
          )}

          {tags.length > 0 && (
            <Section title={t('stats.filters.sections.tag')}>
              <View style={styles.chips}>
                {tags.map((tag) => (
                  <Chip
                    key={KEY_OF.tag(tag)}
                    label={tag}
                    selected={hasValue(facets.tags, tag, KEY_OF.tag)}
                    onPress={() => setList('tags', toggleValue(facets.tags, tag, KEY_OF.tag))}
                  />
                ))}
              </View>
            </Section>
          )}

          <Section title={t('stats.filters.sections.amount')}>
            <View style={styles.chips}>
              {AMOUNT_CHOICES.map((choice) => {
                const chosen = isAmountChosen(choice, facets);
                return (
                  <Chip
                    key={choice.label}
                    label={`${choice.label} ${symbol}`}
                    selected={chosen}
                    onPress={() => {
                      if (chosen) {
                        const next = without('minCents');
                        delete next.maxCents;
                        onFacetsChange(next);
                        return;
                      }
                      const next = without('maxCents');
                      onFacetsChange({ ...next, ...amountRange(choice) });
                    }}
                  />
                );
              })}
            </View>
            {/* Sull'importo **proiettato**: con un filtro persona la fascia si misura sulla
                quota, non sul prezzo pieno, o l'istogramma mostrerebbe barre fuori fascia. */}
            {facets.memberId !== undefined && (
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {t('stats.filters.amountHint')}
              </Text>
            )}
          </Section>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
            {plural('stats.expenseCount', matchCount)}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text
              style={{
                color: colors.accent,
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
              }}
            >
              {t('stats.filters.done')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * L'intestazione di un blocco del foglio.
 *
 * Ripete la tipografia di `SectionLabel` senza esserlo: quel componente porta con sé i
 * padding della schermata dei grafici — sedici punti per lato, che qui sono già del foglio —
 * e cancellarli con dei margini negativi sarebbe peggio di sei righe di stile.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.textMuted,
          fontSize: fontSize.xxs,
          fontWeight: fontWeight.bold,
          letterSpacing: 1.3,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000099' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
