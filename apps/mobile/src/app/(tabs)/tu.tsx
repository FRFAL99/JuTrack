import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { CORE_VERSION } from '@jutrack/core';
import { initialOf } from '@/components/avatar';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import {
  useNotificationSettings,
  type NotificationKind,
} from '@/features/notifications/useNotifications';
import { ColorChoice } from '@/features/profile/ColorChoice';
import { CurrencyPicker } from '@/features/profile/CurrencyPicker';
import { LanguagePicker } from '@/features/profile/LanguagePicker';
import { AlertSwitches } from '@/features/profile/AlertSwitches';
import { SettingSheet } from '@/features/profile/SettingSheet';
import { alertsSummary, alertsTone, currencyLabel, languageName } from '@/features/profile/summary';
import { Card } from '@/components/Card';
import type { SyncState } from '@jutrack/core';
import { describeSync, steadySyncTone, syncTone, type SyncTone } from '@/features/sync/describe';
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
/** Le quattro impostazioni che si aprono in un foglio. */
type SettingKey = 'color' | 'language' | 'currency' | 'alerts';

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
  /**
   * Quale foglio è aperto, o nessuno.
   *
   * Uno `useState` con quattro valori e non quattro booleani: due fogli aperti insieme non
   * sono uno stato che deve poter esistere, e con quattro booleani lo diventa — basta
   * dimenticare di chiuderne uno. È la stessa forma di `openGroup` in `ExpenseForm`.
   */
  const [sheet, setSheet] = useState<SettingKey | null>(null);

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
  /**
   * Il pallino **non lampeggia a ogni chiamata**.
   *
   * `syncing` è un momento, non uno stato: col tono grezzo il verde si spegnerebbe e si
   * riaccenderebbe a ogni giro del motore, e da fermi sembra un guasto intermittente. Il
   * pallino risponde a «i dati sono allineati?», e una chiamata in volo non cambia la
   * risposta; a dire cosa sta succedendo adesso è il testo accanto.
   *
   * Il precedente è **stato**, e si aggiorna **durante il render** quando la fase cambia: è
   * lo schema che React documenta per «correggere uno stato quando una prop cambia», e qui
   * è l'unico che passa le due regole dei hook — un `ref` non si può leggere in render
   * (`react-hooks/refs`), e un `setState` dentro un `useEffect` è vietato a sua volta
   * (`react-hooks/set-state-in-effect`). React riesegue il render subito, senza dipingere
   * nulla in mezzo, quindi non c'è nessun fotogramma col tono vecchio.
   *
   * `steadySyncTone` è idempotente, quindi il doppio giro della modalità Strict non sposta
   * niente — c'è un test che lo tiene fermo.
   */
  const [seen, setSeen] = useState<{ phase: SyncState['phase']; tone: SyncTone }>(() => ({
    phase: syncState.phase,
    tone: syncTone(syncState.phase),
  }));
  if (seen.phase !== syncState.phase) {
    setSeen({ phase: syncState.phase, tone: steadySyncTone(syncState.phase, seen.tone) });
  }
  const tone = seen.tone;
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
    <View style={[styles.identity, { paddingHorizontal: spacing.lg, gap: 14 }]}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: profile.color, borderRadius: 26, width: 52, height: 52 },
        ]}
      >
        <Text style={{ color: colors.textOnAccent, fontSize: 22, fontWeight: fontWeight.bold }}>
          {initialOf(profile.name)}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
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
              fontSize: fontSize.xl,
              fontWeight: fontWeight.heavy,
              padding: 0,
            }}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.heavy,
              letterSpacing: -0.4,
            }}
          >
            {profile.name}
          </Text>
        )}
        <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
          {t('you.name.hint')}
        </Text>
      </View>

      {/* La matita è un bersaglio **suo**, non il nome stesso: il nome è lungo quanto è
          lungo, e su un nome di tre lettere l'area toccabile sarebbe minuscola. */}
      <Pressable
        onPress={() => setEditingName(true)}
        accessibilityRole="button"
        accessibilityLabel={t('you.name.edit')}
        accessibilityHint={profile.name}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        })}
      >
        <Feather name="edit-2" size={15} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  return (
    <Screen header={identityHeader}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Lo stato del sync è la sola cosa di questa schermata che **cambia da sola**, ed è
            l'unica che si viene a guardare senza volerne toccare nessun'altra: sta in una
            card sopraelevata in cima, non in una sezione fra le altre. */}
        <Card
          variant="raised"
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            marginBottom: spacing.lg,
            paddingVertical: 14,
            paddingHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm + 2,
          }}
        >
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              numberOfLines={2}
              style={{
                color: colors.text,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              {syncText}
            </Text>
            <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
              {t('you.sync.privacy')}
            </Text>
          </View>
          <Pressable onPress={syncNow} disabled={!syncReady} hitSlop={8}>
            <Text
              style={{
                color: colors.accent,
                fontSize: fontSize.xs,
                opacity: syncReady ? 1 : 0.4,
              }}
            >
              {t('you.sync.action')}
            </Text>
          </Pressable>
        </Card>

        <View style={[styles.rule, { backgroundColor: colors.border }]} />

        {/* Le quattro scelte di questo telefono, **chiuse**. Prima stavano tutte aperte: tre
            selettori e quattro interruttori con altrettante righe di spiegazione, cioè metà
            schermata occupata da cose che si toccano una volta l'anno.

            La riga chiusa porta il valore, non un segnaposto — è la regola della decisione 8
            del Piano v6, applicata a una schermata che quel piano non toccava. Le frasi
            stanno in `features/profile/summary.ts`, dove hanno dei test.

            La lingua resta la prima: è la sezione che decide in che lingua si legge ogni
            altra riga, e chi la cerca perché non capisce quello che ha davanti non deve
            scorrere per trovarla. Il valore mostrato è quello **in uso** — `i18n.language` e
            non `profile.language` — così chi non ha ancora scelto vede la lingua che il
            telefono gli ha dato. */}
        <SectionLabel>{t('you.device.title')}</SectionLabel>
        <ListRow
          label={t('you.language.title')}
          value={languageName(i18n.language)}
          onPress={() => setSheet('language')}
        />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow
          label={t('you.currency.title')}
          value={currencyLabel(currency)}
          onPress={() => setSheet('currency')}
        />
        <Rule inset={spacing.lg} color={colors.divider} />
        {/* Il colore non ha un nome: «Blu» sarebbe un'etichetta inventata da tenere
            allineata alla palette, e la pallina *è* l'informazione. */}
        <ListRow
          label={t('you.color.title')}
          accessory={
            <View
              style={[
                styles.swatch,
                { backgroundColor: profile.color, borderColor: colors.border },
              ]}
            />
          }
          onPress={() => setSheet('color')}
        />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow
          label={t('you.alerts.title')}
          value={alertsSummary(notifications.settings, notifications.blocked)}
          valueTone={alertsTone(notifications.blocked)}
          onPress={() => setSheet('alerts')}
        />

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
        {/* «Dati e diagnostica» e non un secondo «Questo telefono»: lo erano entrambe, e
            due sezioni con la stessa intestazione sulla stessa schermata non si
            distinguono. Qui sotto ci sono l'import, la diagnostica e l'azzeramento — cioè
            manutenzione, non preferenze. */}
        <SectionLabel>{t('you.device.maintenance')}</SectionLabel>
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

      {/* I quattro fogli. Uno solo può essere aperto, perché `sheet` è un valore e non
          quattro booleani. */}
      <SettingSheet
        visible={sheet === 'language'}
        onClose={() => setSheet(null)}
        title={t('you.language.title')}
        hint={t('you.language.hint')}
      >
        <LanguagePicker
          value={i18n.language}
          onChange={(next) => void update({ language: next })}
        />
      </SettingSheet>

      <SettingSheet
        visible={sheet === 'currency'}
        onClose={() => setSheet(null)}
        title={t('you.currency.title')}
        hint={t('you.currency.hint')}
      >
        <CurrencyPicker value={currency} onChange={(next) => void update({ currency: next })} />
      </SettingSheet>

      <SettingSheet
        visible={sheet === 'color'}
        onClose={() => setSheet(null)}
        title={t('you.color.title')}
        hint={t('you.color.hint')}
      >
        <ColorChoice value={profile.color} onChange={(color) => void update({ color })} />
      </SettingSheet>

      {/* Le due note in fondo restano dentro il foglio e non salgono in `hint`: dicono cosa
          fanno gli interruttori, e vanno lette accanto a loro. */}
      <SettingSheet
        visible={sheet === 'alerts'}
        onClose={() => setSheet(null)}
        title={t('you.alerts.title')}
      >
        <AlertSwitches settings={notifications} onToggle={toggle} />
      </SettingSheet>
    </Screen>
  );
}

/** Filetto sottile fra due righe della stessa lista, rientrato ad allinearsi al testo. */
function Rule({ inset, color }: { inset: number; color: string }) {
  return <View style={[styles.rule, { backgroundColor: color, marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { height: StyleSheet.hairlineWidth },
});
