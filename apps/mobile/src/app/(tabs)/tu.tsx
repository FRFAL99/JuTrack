import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { CORE_VERSION } from '@jutrack/core';
import { initialOf } from '@/components/avatar';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { ColorChoice } from '@/features/profile/ColorChoice';
import { CurrencyPicker } from '@/features/profile/CurrencyPicker';
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
 */
export default function TuScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { update } = useAppData();
  const profile = useProfile();
  const group = useCurrentGroup();
  const vault = useVaultStatus();
  const syncState = useSyncState();
  const currency = useCurrencyCode();

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

  const showIdInfo = (): void => {
    Alert.alert(
      'Il tuo identificativo',
      'È così che gli altri telefoni ti riconoscono dentro un gruppo. È un numero casuale, ' +
        'generato una volta su questo telefono: non è un account, non c’è niente a cui ' +
        'accedere, e da solo non dice nulla di te. Serve solo se qualcosa va storto e vuoi ' +
        `dire di quale persona stiamo parlando.\n\n${profile.profileId}`,
    );
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
          placeholder="Il tuo nome"
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_PROFILE_NAME}
          returnKeyType="done"
          accessibilityLabel="Il tuo nome"
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
          accessibilityLabel="Cambia nome"
          accessibilityHint={profile.name}
          style={styles.nameRow}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}>
            {profile.name}
          </Text>
          <Feather name="edit-2" size={16} color={colors.textMuted} />
        </Pressable>
      )}

      <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
        Stesso nome in tutti i tuoi gruppi
      </Text>

      <ColorChoice value={profile.color} onChange={(color) => void update({ color })} />
    </View>
  );

  return (
    <Screen header={identityHeader}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />

        <SectionLabel>Valuta</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <CurrencyPicker value={currency} onChange={(next) => void update({ currency: next })} />
          {/* La nota non è un dettaglio legale: JuTrack non ha tassi di cambio, quindi due
              persone dello stesso gruppo che scelgono valute diverse vedono totali che
              sommano unità diverse. Il campo è locale al telefono, la scelta no. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            Vale solo su questo telefono, e per le spese che registri da qui. JuTrack non converte
            fra valute: in un gruppo conviene sceglierne una sola.
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />

        <SectionLabel>Sincronizzazione</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
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
                Sincronizza
              </Text>
            </Pressable>
          </View>
          <Text
            style={{ color: colors.textFaint, fontSize: fontSize.xxs, paddingLeft: spacing.sm + 7 }}
          >
            Cifrato end-to-end · il relay non legge nulla
          </Text>
        </View>

        {group !== null && (
          <>
            <View
              style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]}
            />
            <SectionLabel>Il gruppo aperto</SectionLabel>
            <ListRow
              label={group.name}
              value="persone e invito"
              onPress={() => router.push(`/groups/${group.vaultId}/manage`)}
            />
            <Rule inset={spacing.lg} color={colors.divider} />
            <ListRow label="Categorie e budget" onPress={() => router.push('/categories')} />
            <Rule inset={spacing.lg} color={colors.divider} />
            <ListRow label="Backup della chiave" onPress={() => router.push('/backup')} />
            <Rule inset={spacing.lg} color={colors.divider} />
            <ListRow
              label="Esporta i dati"
              value="CSV · JSON"
              onPress={() => router.push('/export')}
            />
          </>
        )}

        <View style={[styles.rule, { backgroundColor: colors.border, marginTop: spacing.lg }]} />
        <SectionLabel>Questo telefono</SectionLabel>
        <ListRow label="Diagnostica" onPress={() => router.push('/probe')} />
        <Rule inset={spacing.lg} color={colors.divider} />
        <ListRow
          tone="danger"
          label="Azzera questo telefono"
          onPress={() => router.push('/azzera')}
        />

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: 4 }}>
          <Pressable
            onPress={showIdInfo}
            accessibilityRole="button"
            accessibilityLabel="Il tuo identificativo"
          >
            <Text
              selectable
              style={{ color: colors.textFaint, fontSize: fontSize.xxs, fontFamily: 'monospace' }}
            >
              id {profile.profileId.slice(0, 8)}…
            </Text>
          </Pressable>
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            JuTrack 0.1.0 · core {CORE_VERSION}
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
  rule: { height: StyleSheet.hairlineWidth },
});
