import { useState } from 'react';
import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { NavCard } from '@/components/NavCard';
import { useWipeDevice } from '@/features/profile/useWipeDevice';
import { plural } from '@/i18n/translate';
import { useGroups, useProfile } from '@/state';
import { useTheme } from '@/theme';

/**
 * Azzera questo telefono: che cosa sparisce, che cosa no, e la doppia conferma.
 *
 * Sta sulla radice e **fuori** da `app/(gruppo)/`: chi azzera resta senza gruppi, e questa
 * schermata deve continuare a essere disegnabile mentre lo fa. Per la stessa ragione non
 * legge il vault — solo il profilo e il registro dei gruppi, che è ciò che elenca.
 *
 * La conferma è **un interruttore più un `Alert`**, e non un `Alert.prompt` con il nome del
 * profilo da riscrivere: su Android `Alert.prompt` non esiste. L'interruttore fa da attrito
 * deliberato — il bottone non si può premere per sbaglio mentre si scorre la pagina — e
 * l'`Alert` finale è l'ultima occasione per annullare.
 */
export default function WipeDeviceScreen() {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const profile = useProfile();
  const { groups } = useGroups();
  const { phase, error, start } = useWipeDevice();
  /**
   * Spento di default, e non ricordato: è il gesto meno reversibile dell'app, e ogni volta
   * che si apre questa schermata la domanda va rifatta da capo.
   */
  const [understood, setUnderstood] = useState(false);
  const busy = phase === 'closing' || phase === 'wiping';

  const confirm = (): void => {
    const groupsClause =
      groups.length === 0
        ? ''
        : groups.length === 1
          ? t('wipe.confirmBody.oneGroup')
          : t('wipe.confirmBody.manyGroups', { count: groups.length });
    Alert.alert(
      t('wipe.confirmTitle'),
      t('wipe.confirmBody.base', { name: profile.name, groupsClause }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('wipe.confirmButton'), style: 'destructive', onPress: start },
      ],
    );
  };

  const heading = {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  } as const;
  const body = { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 } as const;

  return (
    <ModalScreen title={t('wipe.title')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {/* In cima, non in fondo: è l'unica cosa che rende reversibile il gesto, e va
            letta prima di decidere, non dopo. */}
        {groups.length > 0 && (
          <NavCard
            title={t('wipe.backupFirstTitle')}
            subtitle={t('wipe.backupFirstSubtitle')}
            onPress={() => router.push('/backup')}
          />
        )}

        <Card style={{ gap: spacing.sm, borderColor: colors.danger }}>
          <Text style={heading}>{t('wipe.whatDisappearsTitle')}</Text>
          <Text style={body}>{t('wipe.whatDisappearsIntro')}</Text>

          <Bullet>{t('wipe.bulletProfile', { name: profile.name })}</Bullet>
          {groups.length > 0 && (
            <>
              <Bullet>{plural('wipe.bulletGroups', groups.length)}</Bullet>
              <Bullet>{t('wipe.bulletKeys')}</Bullet>
            </>
          )}

          {groups.length > 0 && (
            <View style={{ paddingLeft: spacing.md, paddingTop: spacing.xs, gap: 2 }}>
              {groups.map((group) => (
                <Text key={group.vaultId} style={{ color: colors.text, fontSize: fontSize.sm }}>
                  · {group.name}
                </Text>
              ))}
            </View>
          )}

          <Text style={[body, { paddingTop: spacing.xs }]}>{t('wipe.whatDisappearsFooter')}</Text>
        </Card>

        {/* Senza gruppi non c'è nessuna copia sul relay di cui parlare: dirlo lo stesso
            farebbe cercare all'utente qualcosa che non esiste. */}
        {groups.length > 0 && (
          <Card style={{ gap: spacing.sm }}>
            <Text style={heading}>{t('wipe.whatRemainsTitle')}</Text>
            <Text style={body}>
              {t('wipe.relayCopy.before')}{' '}
              <Text style={{ color: colors.text }}>{t('wipe.relayCopy.switchLabel')}</Text>
              {t('wipe.relayCopy.after')}
            </Text>
            <Text style={body}>{t('wipe.whatRemainsOthers')}</Text>
          </Card>
        )}

        <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }}>
              {t('wipe.understandLabel')}
            </Text>
            <Switch
              value={understood}
              onValueChange={setUnderstood}
              disabled={busy}
              accessibilityLabel={t('wipe.understandLabel')}
            />
          </View>

          <Button
            label={
              phase === 'closing'
                ? t('wipe.closingGroup')
                : phase === 'wiping'
                  ? t('wipe.wiping')
                  : t('wipe.action')
            }
            variant="danger"
            onPress={confirm}
            disabled={!understood}
            loading={busy}
          />

          {/* Un azzeramento fallito lascia uno stato normale — profilo presente, qualche
              gruppo in meno — e si può riprovare: `wipeDevice` si ferma prima di toccare
              il profilo apposta. Dirlo evita che sembri un telefono a metà. */}
          {error !== null && (
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {error}
            </Text>
          )}
        </Card>
      </ScrollView>
    </ModalScreen>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  const { colors, spacing, fontSize } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Text style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}>—</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20, flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
