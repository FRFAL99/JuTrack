import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BUDGET_NEAR_THRESHOLD, CORE_VERSION } from '@jutrack/core';
import { initialOf } from '@/components/avatar';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { BACKUP_MIN_EXPENSES } from '@/features/notifications/backup';
import { REMINDER_DAYS } from '@/features/notifications/reminder';
import { SYNC_STALL_HOURS } from '@/features/notifications/sync';
import {
  useNotificationSettings,
  type NotificationKind,
} from '@/features/notifications/useNotifications';
import { ColorChoice } from '@/features/profile/ColorChoice';
import { CurrencyPicker } from '@/features/profile/CurrencyPicker';
import { LanguagePicker } from '@/features/profile/LanguagePicker';
import { describeSync, syncTone } from '@/features/sync/describe';
import {
  MAX_PROFILE_NAME,
  normalizeProfileName,
  useAppData,
  useCurrencyCode,
  useCurrentGroup,
  useProfile,
  useSyncState,
  useVaultStatus,
} from '@/state';
import { useTheme } from '@/theme';

/**
 * Chi sono io, su questo telefono — e le impostazioni che riguardano me, non un gruppo.
 *
 * Fusione di `profile.tsx` e `settings.tsx` (redesign, passo 4): il profilo non è una
 * preferenza dell'app, è l'unica cosa che attraversa **tutti** i gruppi, e le impostazioni
 * di sincronizzazione e diagnostica non appartengono a un gruppo più di quanto appartengano
 * a me. Un solo tab invece di due chiude i quattro tab senza gerarchia.
 *
 * Sta **fuori** da `app/(gruppo)/`: legge il gruppo aperto con `useCurrentGroup()`, che è
 * nullabile, e con `useVaultStatus()`, che non solleva — deve funzionare anche con zero
 * gruppi, com'era già per Impostazioni (Step 21).
 *
 * **È la prima schermata tradotta** (Step 37), e non per caso: è quella che contiene il
 * selettore della lingua, quindi è l'unica in cui il cambio si vede senza andare da nessuna
 * parte. Fanno eccezione due cose, ed entrambe arrivano da fuori: la riga di stato del sync,
 * che la scrive `describe.ts` anche in fondo alla lista spese, e i nomi di gruppi e persone,
 * che stanno nel documento condiviso e non sono testo dell'app.
 */
export default function TuScreen() {
  const { t, i18n } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { update } = useAppData();
  const profile = useProfile();
  const group = useCurrentGroup();
  const vault = useVaultStatus();
  const syncState = useSyncState();
  const currency = useCurrencyCode();
  const notifications = useNotificationSettings();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  // Come per il vecchio profile.tsx: il nome si salva sul blur, non a ogni tasto, o ogni
  // lettera produrrebbe un update Yjs e una riga nel log del relay.
  const commitName = (): void => {
    setEditingName(false);
    const normalized = normalizeProfileName(draftName);
    if (normalized === null) {
      setDraftName(profile.name);
      return;
    }
    if (normalized === profile.name) return;
    void update({ name: normalized });
  };

  const syncNow = (): void => {
    if (vault.phase !== 'ready') return;
    void vault.runtime.engine.syncOnce();
  };

  const { text: syncText } = describeSync(syncState);
  const tone = syncTone(syncState.phase);
  const dotColor =
    tone === 'warn' ? colors.warning : tone === 'ok' ? colors.income : colors.textMuted;
  const syncReady = vault.phase === 'ready';

  /**
   * L'interruttore non si accende da solo: prima il permesso, poi la scelta.
   *
   * Se il permesso non arriva, `set` non salva niente e l'interruttore resta giù — ma **va
   * detto perché**, o sembrerebbe un tocco non registrato. I due rifiuti mandano in due
   * posti diversi: uno alle impostazioni di Android, l'altro alla build.
   *
   * Uno solo per tutti gli avvisi: il permesso è dell'app, non della singola voce, e i due
   * messaggi sarebbero identici riga per riga.
   */
  const toggle = (kind: NotificationKind, on: boolean): void => {
    void (async () => {
      const refusal = await notifications.set(kind, on);
      if (refusal === 'denied') {
        Alert.alert(t('you.alerts.deniedTitle'), t('you.alerts.deniedBody'));
      } else if (refusal === 'unavailable') {
        Alert.alert(t('you.alerts.unavailableTitle'), t('you.alerts.unavailableBody'));
      }
    })();
  };

  const showIdInfo = (): void => {
    Alert.alert(t('you.device.idLabel'), t('you.device.idBody', { id: profile.profileId }));
  };

  const identityHeader = (
    <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: profile.color, borderRadius: 30, width: 60, height: 60 },
        ]}
      >
        <Text style={{ color: colors.textOnAccent, fontSize: 26, fontWeight: fontWeight.bold }}>
          {initialOf(profile.name)}
        </Text>
      </View>

      {editingName ? (
        <TextInput
          autoFocus
          value={draftName}
          onChangeText={setDraftName}
          onBlur={commitName}
          onSubmitEditing={commitName}
          placeholder={t('you.name.label')}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_PROFILE_NAME}
          returnKeyType="done"
          accessibilityLabel={t('you.name.label')}
          style={{
            color: colors.text,
            fontSize: fontSize.xxl,
            fontWeight: fontWeight.bold,
            textAlign: 'center',
            minWidth: 160,
          }}
        />
      ) : (
        <Pressable
          onPress={() => setEditingName(true)}
          accessibilityRole="button"
          accessibilityLabel={t('you.name.edit')}
          accessibilityHint={profile.name}
          style={styles.nameRow}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}>
            {profile.name}
          </Text>
          <Feather name="edit-2" size={16} color={colors.textMuted} />
        </Pressable>
      )}

      <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>{t('you.name.hint')}</Text>

      <ColorChoice value={profile.color} onChange={(color) => void update({ color })} />
    </View>
  );

  return (
    <Screen header={identityHeader}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />

        {/* Prima della valuta, e prima di tutto il resto: è la sezione che decide in che
            lingua si legge ogni altra sezione, e chi la sta cercando perché non capisce
            quello che ha davanti non deve scorrere per trovarla. Il valore mostrato è
            quello **in uso** — `i18n.language` e non `profile.language` — così chi non ha
            ancora scelto vede evidenziata la lingua che il telefono gli ha dato. */}
        <SectionLabel>{t('you.language.title')}</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <LanguagePicker
            value={i18n.language}
            onChange={(next) => void update({ language: next })}
          />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.language.hint')}
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />

        <SectionLabel>{t('you.currency.title')}</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <CurrencyPicker value={currency} onChange={(next) => void update({ currency: next })} />
          {/* La nota non è un dettaglio legale: JuTrack non ha tassi di cambio, quindi due
              persone dello stesso gruppo che scelgono valute diverse vedono totali che
              sommano unità diverse. Il campo è locale al telefono, la scelta no. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.currency.hint')}
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />

        <SectionLabel>{t('you.alerts.title')}</SectionLabel>
        {/* `sm` e non `xs`: con tre interruttori uno sotto l'altro, quattro punti di stacco
            farebbero leggere le righe come un blocco solo. */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                {t('you.alerts.reminderTitle')}
              </Text>
              {/* I numeri restano costanti del codice e diventano segnaposto, non parole
                  del dizionario: tradurre «3» non ha senso, e una lingua che lo scrivesse
                  a mano lo lascerebbe indietro il giorno in cui `REMINDER_DAYS` cambia. */}
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {t('you.alerts.reminderHint', { days: REMINDER_DAYS })}
              </Text>
            </View>
            <Switch
              value={notifications.settings.reminder}
              onValueChange={(on) => toggle('reminder', on)}
              disabled={!notifications.ready}
              accessibilityLabel={t('you.alerts.reminderTitle')}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                {t('you.alerts.budgetTitle')}
              </Text>
              {/* La soglia si legge dal core invece di scriverla qui: è la stessa che
                  colora le barre nei Grafici, e due numeri da tenere allineati sarebbero
                  due numeri che prima o poi divergono. */}
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {t('you.alerts.budgetHint', {
                  percent: Math.round(BUDGET_NEAR_THRESHOLD * 100),
                })}
              </Text>
            </View>
            <Switch
              value={notifications.settings.budget}
              onValueChange={(on) => toggle('budget', on)}
              disabled={!notifications.ready}
              accessibilityLabel={t('you.alerts.budgetTitle')}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                {t('you.alerts.syncTitle')}
              </Text>
              {/* Le ore si leggono dalla costante, come la soglia dei budget si legge dal
                  core: un numero scritto due volte è un numero che prima o poi diverge. */}
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {t('you.alerts.syncHint', { hours: SYNC_STALL_HOURS })}
              </Text>
            </View>
            <Switch
              value={notifications.settings.sync}
              onValueChange={(on) => toggle('sync', on)}
              disabled={!notifications.ready}
              accessibilityLabel={t('you.alerts.syncTitle')}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                {t('you.alerts.backupTitle')}
              </Text>
              {/* La soglia si legge dalla costante, come le altre tre. La riga dice anche
                  «una volta sola per gruppo», che è la cosa che distingue questo avviso
                  dagli altri: la chiave non cambia mai, quindi salvarla una volta chiude
                  la questione per sempre. */}
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {t('you.alerts.backupHint', { count: BACKUP_MIN_EXPENSES })}
              </Text>
            </View>
            <Switch
              value={notifications.settings.backup}
              onValueChange={(on) => toggle('backup', on)}
              disabled={!notifications.ready}
              accessibilityLabel={t('you.alerts.backupTitle')}
            />
          </View>

          {/* Il limite va detto, non scoperto: i due avvisi li produce l'app guardando il
              documento e il motore, quindi arrivano quando l'app è aperta — subito per
              quello che succede qui, all'apertura successiva per il resto. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.alerts.scope')}
          </Text>

          {/* L'interruttore resta acceso perché la scelta è di chi l'ha fatta: spegnerlo
              d'ufficio la farebbe sparire senza spiegazione. A dire che non funziona è
              questa riga, non un tocco che si disfa da solo. */}
          {notifications.blocked && (
            <Text style={{ color: colors.warning, fontSize: fontSize.xxs }}>
              {t('you.alerts.blocked')}
            </Text>
          )}
        </View>

        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />

        <SectionLabel>{t('you.sync.title')}</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            {/* Resta in italiano fino allo Step 38, ed è deliberato: la frase la scrive
                `describe.ts`, che la scrive anche in fondo alla lista spese. Tradurre un
                modulo condiviso vuol dire tradurre le schermate che lo usano. */}
            <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }} numberOfLines={2}>
              {syncText}
            </Text>
            <Pressable onPress={syncNow} disabled={!syncReady} hitSlop={8}>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: fontSize.sm,
                  opacity: syncReady ? 1 : 0.4,
                }}
              >
                {t('you.sync.action')}
              </Text>
            </Pressable>
          </View>
          <Text
            style={{ color: colors.textFaint, fontSize: fontSize.xxs, paddingLeft: spacing.sm + 7 }}
          >
            {t('you.sync.privacy')}
          </Text>
        </View>

        {group !== null && (
          <>
            <View
              style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]}
            />
            <SectionLabel>{t('you.group.title')}</SectionLabel>
            {/* `group.name` non passa da `t`, e non passerà mai: è un nome che qualcuno ha
                scritto nel documento condiviso. Tradurre i dati del gruppo vorrebbe dire
                mostrare all'altro telefono un gruppo con un altro nome. */}
            <ListRow
              label={group.name}
              value={t('you.group.manage')}
              onPress={() => router.push(`/groups/${group.vaultId}/manage`)}
            />
            <Rule inset={spacing.lg} color={colors.divider} />
            <ListRow label={t('you.group.categories')} onPress={() => router.push('/categories')} />
            <Rule inset={spacing.lg} color={colors.divider} />
            <ListRow label={t('you.group.backup')} onPress={() => router.push('/backup')} />
            <Rule inset={spacing.lg} color={colors.divider} />
            {/* «CSV · JSON» resta letterale: sono due nomi di formato, uguali in ogni
                lingua, e una chiave di dizionario per una costante è una chiave in più da
                tenere allineata senza niente in cambio. */}
            <ListRow
              label={t('you.group.export')}
              value="CSV · JSON"
              onPress={() => router.push('/export')}
            />
          </>
        )}

        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />
        <SectionLabel>{t('you.device.title')}</SectionLabel>
        {/* Sta qui e non fra le voci del gruppo, benché sia il gemello di «Backup della
            chiave»: l'import **crea** un gruppo, quindi è una cosa del telefono, e va
            raggiungibile proprio quando di gruppi non ce n'è nessuno — che è il caso in cui
            serve. La sezione del gruppo, sopra, si smonta senza gruppo. */}
        <ListRow label={t('you.device.importExport')} onPress={() => router.push('/importa')} />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow label={t('you.device.probe')} onPress={() => router.push('/probe')} />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow
          tone="danger"
          label={t('you.device.wipe')}
          onPress={() => router.push('/azzera')}
        />

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: 4 }}>
          <Pressable
            onPress={showIdInfo}
            accessibilityRole="button"
            accessibilityLabel={t('you.device.idLabel')}
          >
            <Text
              selectable
              style={{ color: colors.textFaint, fontSize: fontSize.xxs, fontFamily: 'monospace' }}
            >
              id {profile.profileId.slice(0, 8)}…
            </Text>
          </Pressable>
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.device.version', { app: '0.1.0', core: CORE_VERSION })}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Filetto sottile fra due righe della stessa lista, rientrato ad allinearsi al testo. */
function Rule({ inset, color }: { inset: number; color: string }) {
  return <View style={[styles.rule, { backgroundColor: color, marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { height: StyleSheet.hairlineWidth },
});
