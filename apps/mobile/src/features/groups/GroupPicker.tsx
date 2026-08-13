import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { GroupRow } from '@/features/groups/GroupRow';
import { NewGroupModal } from '@/features/groups/NewGroupModal';
import type { GroupStats } from '@/features/groups/list';
import { useGroups } from '@/state';
import { useTheme } from '@/theme';

interface GroupPickerProps {
  /** Spese e totale del mese del gruppo **aperto**. Le altre righe non le hanno: vedi `groupSubtitle`. */
  currentStats?: GroupStats;
  /** Chiamato dopo un cambio di gruppo o una creazione, per chiudere il contenitore. */
  onDone: () => void;
}

/**
 * L'elenco dei gruppi e i modi di averne un altro: **un componente, due contenitori**.
 *
 * Lo montano il foglio del selettore (dalla pill nell'header delle spese) e lo stato vuoto
 * «nessun gruppo» a piena pagina. Sono la stessa domanda posta in due momenti — «in quale
 * gruppo sono?» e «non ne hai nessuno» — e tenerne due copie significherebbe che la seconda
 * si dimentica un ingresso: è già successo, ed è la ragione per cui `backup.tsx` sta fuori
 * da `(gruppo)`.
 *
 * **Cambiare gruppo non naviga verso il gruppo, torna alla radice.** Le spese del gruppo
 * aperto *sono* la radice del tab: `select()` basta a spostarle. Il `dismissTo('/')` serve
 * al caso in cui si stia guardando `/groups/<id>` — l'indirizzo su cui atterra chi entra da
 * un invito — perché lì la guardia del layout riporterebbe corrente il gruppo dell'URL, e
 * il cambio si disferebbe da sé. Si naviga **prima** di selezionare, così quella guardia è
 * già smontata quando il gruppo corrente cambia.
 */
export function GroupPicker({ currentStats, onDone }: GroupPickerProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const { groups, current, select } = useGroups();
  const [creating, setCreating] = useState(false);

  const open = (vaultId: string): void => {
    if (vaultId === current?.vaultId) {
      onDone();
      return;
    }
    router.dismissTo('/');
    void select(vaultId);
    onDone();
  };

  return (
    <>
      {groups.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('groups.emptyIntro')}
          </Text>
        </View>
      ) : (
        <>
          <SectionLabel>{t('groups.title')}</SectionLabel>
          {groups.map((group, index) => (
            <View key={group.vaultId}>
              {index > 0 && (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: colors.divider,
                    marginLeft: 38,
                  }}
                />
              )}
              <GroupRow
                group={group}
                currentVaultId={current?.vaultId ?? null}
                {...(group.vaultId === current?.vaultId && currentStats !== undefined
                  ? { stats: currentStats }
                  : {})}
                onPress={() => open(group.vaultId)}
              />
            </View>
          ))}
        </>
      )}

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.lg,
        }}
      >
        <Button
          label={t('groups.newGroup')}
          variant="secondary"
          onPress={() => setCreating(true)}
          style={{ flex: 1 }}
        />
        <Button
          label={t('groups.joinInvite')}
          variant="secondary"
          onPress={() => {
            onDone();
            router.push('/pair/scan');
          }}
          style={{ flex: 1 }}
        />
      </View>

      {/* La terza strada, e solo quando non ce ne sono altre: chi ha già dei gruppi
          ripristina una chiave dalla gestione del gruppo, dove sa di quale chiave si
          parla. Chi non ne ha nessuno non ha nessun gruppo da cui passare — ed è
          esattamente il caso per cui `backup.tsx` è rimasta fuori da `(gruppo)`. */}
      {groups.length === 0 && (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
            {t('groups.restoreIntro')}
          </Text>
          <Button
            label={t('groups.restore')}
            variant="secondary"
            onPress={() => {
              onDone();
              router.push('/backup');
            }}
          />
        </View>
      )}

      <NewGroupModal
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          // `create` apre già il gruppo nuovo, e la radice mostra il gruppo aperto: non
          // c'è nulla da spingere. Restava da chiudere il contenitore, e da tornare alla
          // radice se si stava guardando il gruppo di prima per URL.
          router.dismissTo('/');
          onDone();
        }}
      />
    </>
  );
}
