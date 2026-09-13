import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import { plural } from '@/i18n/translate';
import { shortVaultId } from '@/features/groups/list';
import { SyncBadge } from '@/features/sync/SyncBadge';
import {
  MAX_GROUP_NAME,
  normalizeGroupName,
  useCategories,
  useCurrentGroup,
  useGroups,
  useMembers,
  useMyMemberId,
  useSyncState,
  useVaultRuntime,
  type GroupRecord,
} from '@/state';
import { useTheme } from '@/theme';

/**
 * Gestione di un gruppo: come si chiama, chi ne fa parte, come invitare, come uscirne.
 *
 * **La guardia di selezione non è più qui**: sta in `[vaultId]/_layout.tsx`, che rende
 * corrente il gruppo dell'URL prima di montare questa schermata e quella delle spese. Qui
 * si può quindi leggere e scrivere il runtime del vault dando per scontato che sia il suo.
 *
 * È spinta dentro lo stack del tab, non sulla radice: mantiene la tab bar, e il pulsante
 * in alto a destra dice «Indietro» invece di «Chiudi».
 *
 * Il gruppo si legge in un componente **sopra** quello che lavora: sotto ci sono hook che
 * leggono il vault, e un `return` anticipato in mezzo a loro violerebbe le regole degli
 * hook. Vale come per la lista delle spese.
 */
export default function GroupManageScreen() {
  const group = useCurrentGroup();
  // Irraggiungibile: il layout non monta questa schermata finché il gruppo dell'URL non è
  // quello corrente.
  if (group === null) return null;
  return <ManageGroup current={group} />;
}

function ManageGroup({ current }: { current: GroupRecord }) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { groups, rename, leave, regenerate } = useGroups();
  const { store, keys } = useVaultRuntime();
  const myMemberId = useMyMemberId();
  const members = useMembers();
  const syncState = useSyncState();
  const categories = useCategories();

  const [draft, setDraft] = useState(current.name);
  const [leaving, setLeaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  /**
   * Spento di default: cancellare dal relay è irreversibile e vale per **tutti**, non
   * solo per questo telefono. Chi esce da un gruppo che gli altri continuano a usare non
   * deve poterlo svuotare per distrazione.
   */
  const [wipeRelay, setWipeRelay] = useState(false);

  // Il nome si salva quando il campo perde il fuoco, non a ogni tasto: scrivendo, ogni
  // lettera produrrebbe un update Yjs, e quindi una riga nel log del relay.
  const commitName = (): void => {
    const normalized = normalizeGroupName(draft);
    if (normalized === null) {
      setDraft(current.name);
      return;
    }
    if (normalized === current.name) return;
    // Dentro il vault per primo: è quello l'autorevole, ed è così che il nome nuovo
    // raggiunge l'altro telefono. Il registro tiene solo la copia per la lista.
    store.setGroupName(normalized);
    void rename(current.vaultId, normalized);
  };

  const handleLeave = (): void => {
    const last = groups.length === 1;
    Alert.alert(
      `Uscire da «${current.name}»?`,
      'Le spese di questo gruppo spariscono da questo telefono. Senza un backup della chiave ' +
        'non tornano più: non esiste un reset lato server. ' +
        (last
          ? 'È il tuo unico gruppo: resterai senza, e potrai crearne uno o entrare con un invito. '
          : 'Chi altro ne fa parte non se ne accorge e continua a usarlo. ') +
        (wipeRelay
          ? 'La copia sul relay verrà cancellata: chi resta non riceverà più aggiornamenti, ' +
            'ma tiene ciò che ha già scaricato.'
          : 'La copia sul relay resta e scade da sola dopo trenta giorni.'),
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            setLeaving(true);
            void leave(current.vaultId, { wipeRelay })
              // All'elenco dei gruppi, che è la radice di questo stack: il gruppo di
              // questa rotta non esiste più, e restarci mostrerebbe lo spinner della
              // guardia per sempre.
              .then(() => router.replace('/'))
              .catch((cause: unknown) => {
                Alert.alert(
                  'Uscita fallita',
                  cause instanceof Error ? cause.message : String(cause),
                );
                setLeaving(false);
              });
          },
        },
      ],
    );
  };

  const handleRegenerate = (): void => {
    Alert.alert(
      `Rigenerare «${current.name}»?`,
      'Il gruppo riparte con una chiave nuova, portandosi dietro spese, categorie e saldi. ' +
        'Da questo telefono sparisce quello vecchio, e chi vuoi tenere va reinvitato: ' +
        'finché non accetta, resta fuori. Chi era nel gruppo continua a vedere ciò che ' +
        'aveva già; quello che smette è il flusso di aggiornamenti.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rigenera',
          style: 'destructive',
          onPress: () => {
            setRegenerating(true);
            // Lo stato si legge **adesso**, dal documento aperto: dopo lo spostamento il
            // runtime è già quello del gruppo nuovo, e non ci sarebbe più niente da copiare.
            const state = store.encodeState();
            void regenerate(current.vaultId, state, { wipeRelay })
              .then(() => router.replace('/pair/invite'))
              .catch((cause: unknown) => {
                Alert.alert(
                  'Rigenerazione fallita',
                  cause instanceof Error ? cause.message : String(cause),
                );
                setRegenerating(false);
              });
          },
        },
      ],
    );
  };

  const busy = leaving || regenerating;

  return (
    <ModalScreen title={current.name} closeLabel="‹ Indietro">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <SectionLabel>{t('manage.name.title')}</SectionLabel>
        <Note>{t('manage.name.note')}</Note>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitName}
            onSubmitEditing={commitName}
            placeholder={t('manage.name.title')}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_GROUP_NAME}
            returnKeyType="done"
            accessibilityLabel={t('manage.name.title')}
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
              {t('manage.name.vault', { id: shortVaultId(keys.vaultId) })}
            </Text>
            <SyncBadge state={syncState} />
          </View>
        </View>

        <SectionLabel>{t('manage.members.title')}</SectionLabel>
        <Note>{members.length <= 1 ? t('manage.members.alone') : t('manage.members.many')}</Note>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {/* Sola lettura, di proposito: una persona aggiunta a mano non ha un telefono
              dietro, quindi non potrebbe mai registrare una spesa né vedere il saldo. */}
          <View style={{ gap: spacing.xs }}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View
                  style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: member.color }}
                />
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>{member.name}</Text>
                {member.id === myMemberId && (
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {t('manage.members.you')}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Button
            label={t('manage.members.invite')}
            variant="secondary"
            onPress={() => router.push('/pair/invite')}
          />
        </View>

        {/* Tutto ciò che riguarda **questo** gruppo sta qui dentro, e non nelle impostazioni
            dell'app: erano cinque `NavCard` con due o tre righe di sottotitolo ciascuna, e
            tre di loro comparivano **anche** in «Tu». Adesso sono cinque righe, e la ragione
            che i cinque sottotitoli ripetevano a turno — sono del gruppo, non del telefono —
            si scrive una volta sopra. */}
        <SectionLabel>{t('manage.group.title')}</SectionLabel>
        <Note>{t('manage.group.note')}</Note>
        <ListRow
          label={t('manage.group.categories')}
          value={plural('manage.group.categoriesValue', categories.length)}
          onPress={() => router.push('/categories')}
        />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow label={t('manage.group.budget')} onPress={() => router.push('/budget')} />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow label={t('manage.group.settlements')} onPress={() => router.push('/settle')} />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow label={t('manage.group.backup')} onPress={() => router.push('/backup')} />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow
          label={t('manage.group.export')}
          value="CSV · JSON"
          onPress={() => router.push('/export')}
        />

        <SectionLabel>{t('manage.regenerate.title')}</SectionLabel>
        <Note>{t('manage.regenerate.note')}</Note>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <Button
            label={regenerating ? t('manage.regenerate.busy') : t('manage.regenerate.action')}
            variant="secondary"
            onPress={handleRegenerate}
            disabled={busy}
            loading={regenerating}
          />
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card style={{ gap: spacing.sm, borderColor: colors.danger }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              {t('manage.leave.title')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              {t('manage.leave.body')}
            </Text>

            {/* Vale anche per la rigenerazione, che del gruppo vecchio esce comunque: è la
              stessa domanda, e ripeterla in due punti la farebbe sembrare due cose diverse. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                  {t('manage.leave.wipeRelay')}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
                  {wipeRelay ? t('manage.leave.wipeRelayOn') : t('manage.leave.wipeRelayOff')}
                </Text>
              </View>
              <Switch
                value={wipeRelay}
                onValueChange={setWipeRelay}
                accessibilityLabel={t('manage.leave.wipeRelay')}
              />
            </View>

            <Button
              label={leaving ? t('manage.leave.busy') : t('manage.leave.action')}
              variant="danger"
              onPress={handleLeave}
              disabled={busy}
              loading={leaving}
            />
          </Card>
        </View>
      </ScrollView>
    </ModalScreen>
  );
}

/** Filetto fra due righe della stessa lista, rientrato ad allinearsi al testo. */
function Rule({ inset, color }: { inset: number; color: string }) {
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginLeft: inset }} />
  );
}

const styles = StyleSheet.create({
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
});
