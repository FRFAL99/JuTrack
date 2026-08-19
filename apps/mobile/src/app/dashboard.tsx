import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { knownStores, knownTags } from '@jutrack/core';
import { ModalScreen } from '@/components/ModalScreen';
import { moveWidget, toggleWidget, type LayoutItem } from '@/features/stats/dashboard/layout';
import { useDashboardLayout } from '@/features/stats/dashboard/useDashboardLayout';
import {
  describeNeed,
  unmetNeeds,
  widgetSpec,
  type GroupFacts,
  type WidgetSpec,
} from '@/features/stats/dashboard/widgets';
import { plural } from '@/i18n/translate';
import { useCurrentGroup, useExpenses, useMembers } from '@/state';
import { useTheme } from '@/theme';

/**
 * «Componi la dashboard»: quali grafici, e in che ordine.
 *
 * Sta sulla **radice** come `azzera.tsx` e `backup.tsx`, non dentro `app/(gruppo)/`: è una
 * schermata-foglia che copre la tab bar, e il layout è una preferenza del telefono, non di
 * un gruppo. Senza un gruppo aperto si compone lo stesso — mancheranno solo i suggerimenti
 * che dipendono dai dati, ed è la ragione per cui questa schermata è divisa in due.
 */
export default function DashboardScreen() {
  const group = useCurrentGroup();
  return group === null ? <Composer facts={null} /> : <ComposerWithFacts />;
}

/**
 * Gli stessi comandi, più i suggerimenti che si possono dare solo leggendo il gruppo.
 *
 * Il componente è diviso in due perché `useExpenses` e `useMembers` leggono il vault, e
 * questa rotta è raggiungibile anche quando non ce n'è uno montato.
 */
function ComposerWithFacts() {
  const members = useMembers();
  const expenses = useExpenses();
  return (
    <Composer
      facts={{
        members: members.length,
        stores: knownStores(expenses).length,
        tags: knownTags(expenses).length,
      }}
    />
  );
}

function Composer({ facts }: { facts: GroupFacts | null }) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const { layout, ready, update, reset } = useDashboardLayout();

  const visible = layout.filter((item) => item.visible).length;

  return (
    <ModalScreen title={t('dashboard.title')}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSize.sm,
            lineHeight: 20,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          {t('dashboard.intro')}
        </Text>

        {ready &&
          layout.map((item, index) => {
            const spec = widgetSpec(item.id);
            // Un id senza scheda non si può disegnare né spiegare. `parseLayout` li scarta
            // già in lettura, quindi qui non dovrebbe arrivarne nessuno: saltarlo è la
            // seconda rete, non la prima.
            if (spec === undefined) return null;
            return (
              <WidgetRow
                key={item.id}
                spec={spec}
                item={item}
                facts={facts}
                first={index === 0}
                last={index === layout.length - 1}
                onToggle={() => update(toggleWidget(layout, item.id))}
                onMove={(delta) => update(moveWidget(layout, item.id, delta))}
              />
            );
          })}

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs, lineHeight: 16 }}>
            {visible === 0
              ? t('dashboard.allOff')
              : plural('dashboard.visibleCount', visible, { total: layout.length })}
          </Text>
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>
              {t('dashboard.resetOrder')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ModalScreen>
  );
}

interface WidgetRowProps {
  spec: WidgetSpec;
  item: LayoutItem;
  facts: GroupFacts | null;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onMove: (delta: number) => void;
}

/**
 * Una riga: nome, a cosa serve, interruttore e due chevron.
 *
 * **Frecce e non trascinamento.** Il drag & drop vuole `react-native-gesture-handler` e
 * `react-native-reanimated`, due moduli nativi, cioè una build EAS nuova per un gesto — ed è
 * la stessa decisione già presa per il foglio dei gruppi, per il selettore di date e per la
 * griglia dei giorni. Due chevron fanno la stessa cosa e funzionano con TalkBack senza
 * lavoro aggiuntivo.
 */
function WidgetRow({ spec, item, facts, first, last, onToggle, onMove }: WidgetRowProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const unmet = facts === null ? [] : unmetNeeds(spec, facts);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: item.visible ? colors.text : colors.textMuted,
            fontSize: fontSize.md,
            fontWeight: fontWeight.medium,
          }}
        >
          {spec.title}
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs, lineHeight: 15 }}>
          {spec.subtitle}
        </Text>
        {/* Il suggerimento accanto al nome, con la **stessa frase** che il widget mostrerà
            di sé nella dashboard: due formulazioni diverse farebbero pensare a due
            condizioni diverse. */}
        {unmet.length > 0 && (
          <Text style={{ color: colors.warning, fontSize: fontSize.xxs, lineHeight: 15 }}>
            {unmet.map(describeNeed).join(' ')}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Chevron
          name="chevron-up"
          label={t('dashboard.moveUp', { title: spec.title })}
          disabled={first}
          onPress={() => onMove(-1)}
        />
        <Chevron
          name="chevron-down"
          label={t('dashboard.moveDown', { title: spec.title })}
          disabled={last}
          onPress={() => onMove(1)}
        />
      </View>

      <Switch value={item.visible} onValueChange={onToggle} accessibilityLabel={spec.title} />
    </View>
  );
}

function Chevron({
  name,
  label,
  disabled,
  onPress,
}: {
  name: 'chevron-up' | 'chevron-down';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={{ width: 30, height: 34, alignItems: 'center', justifyContent: 'center' }}
    >
      <Feather name={name} size={20} color={disabled ? colors.textFaint : colors.accent} />
    </Pressable>
  );
}
