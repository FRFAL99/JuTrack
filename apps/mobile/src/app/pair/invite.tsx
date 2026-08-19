import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  createInviteLink,
  createPairingInvite,
  DEFAULT_PAIRING_TTL_MS,
  type InviteLink,
} from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { RELAY_URL } from '@/config';
import { GroupRequired } from '@/features/groups/GroupRequired';
import { PairingQr } from '@/features/pairing/PairingQr';
import { useCurrentGroup, useGroups, type GroupRecord } from '@/state';
import { useTheme } from '@/theme';

/** L'invito al gruppo aperto, nelle tre forme in cui può viaggiare. */
interface Invite {
  link: InviteLink;
  /** L'URI del QR, nella forma che i lettori già in circolazione conoscono. */
  qr: string;
}

/**
 * Invita qualcuno nel **gruppo aperto**: un link da mandare, o un QR da inquadrare.
 *
 * Il link è la strada normale — le due persone non devono più essere nella stessa stanza —
 * e il QR resta sotto per quando lo sono e non si vuole far passare la chiave da una chat.
 *
 * Nessuna delle due compare da sola: prima si spiega cosa si sta per mandare e si chiede
 * conferma. Dentro c'è la chiave del gruppo in chiaro, quindi un messaggio inoltrato o una
 * foto dello schermo bastano a far entrare un estraneo. È un rischio accettato e
 * documentato nel threat model, ma va detto **prima**, non dopo.
 *
 * **Il link è più pericoloso del QR, e la schermata deve dirlo.** Un QR vive cinque minuti
 * sullo schermo di chi lo mostra; un link resta nella cronologia della conversazione, si
 * inoltra con due tocchi e sopravvive a chi l'ha mandato.
 */
export default function PairInviteScreen() {
  const { t } = useTranslation();
  const group = useCurrentGroup();

  // Questa schermata ha bisogno di un gruppo, ma **non** può stare in `app/(gruppo)/`
  // insieme alle altre che lo richiedono: `app/(gruppo)/pair/invite.tsx` e
  // `app/pair/index.tsx` farebbero convergere due cartelle diverse sullo stesso segmento
  // `/pair`. Quindi la guardia è qui, in linea, con lo stesso componente del layout.
  //
  // La guardia sta in un componente **sopra** quello che lavora, non in un `return`
  // anticipato dentro di esso: le regole degli hook impongono che le chiamate vengano
  // prima di ogni uscita, e con un gruppo nullabile (Step 21) sarebbero tutte a leggere
  // un `group` che può non esserci.
  if (group === null) {
    return (
      <ModalScreen title={t('pairing.invite.guardTitle')}>
        <GroupRequired what={t('pairing.invite.requiredWhat')} />
      </ModalScreen>
    );
  }

  return <InviteToGroup group={group} />;
}

function InviteToGroup({ group }: { group: GroupRecord }) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { width } = useWindowDimensions();
  const { registry } = useGroups();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback((): void => {
    setGenerating(true);
    setError(null);
    setCopied(false);
    // La chiave radice, non le derivate: è quella a dover finire nell'invito, e da lei
    // l'altro telefono ricava vaultId, contentKey e authKey da solo.
    void registry
      .keyBytes(group.vaultId)
      .then((key) => {
        if (key === null) {
          setError(t('pairing.invite.keyUnreadable'));
          return;
        }
        // Un solo istante per entrambe le forme: due chiamate a `Date.now()` darebbero
        // due scadenze diverse per lo stesso invito, e il conto alla rovescia a schermo
        // ne descriverebbe una sola.
        const now = Date.now();
        const link = createInviteLink(key, { baseUrl: RELAY_URL, name: group.name, now });
        const { uri } = createPairingInvite(key, { now });
        setInvite({ link, qr: uri });
        setRemaining(link.expiresAt - now);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setGenerating(false));
  }, [group.name, group.vaultId, registry, t]);

  // Il conto alla rovescia è ricalcolato dall'orologio a ogni tick, non decrementato:
  // se il telefono sospende, un contatore decrementato resterebbe indietro e mostrerebbe
  // un invito ancora valido quando è già scaduto.
  useEffect(() => {
    if (invite === null) return;
    const id = setInterval(() => setRemaining(invite.link.expiresAt - Date.now()), 500);
    return () => clearInterval(id);
  }, [invite]);

  const share = useCallback((): void => {
    if (invite === null) return;
    setError(null);
    // `Share` è API core di React Native, non un modulo Expo: funziona anche nella build
    // installata, che non contiene `expo-sharing`.
    void Share.share({
      message: t('pairing.invite.shareMessage', { name: group.name, url: invite.link.url }),
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }, [group.name, invite, t]);

  const copy = useCallback((): void => {
    if (invite === null) return;
    setError(null);
    void Clipboard.setStringAsync(invite.link.url)
      .then(() => setCopied(true))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, [invite]);

  const expired = invite !== null && remaining <= 0;
  const qrSize = Math.min(width - spacing.xl * 4, 300);
  const minutes = Math.round(DEFAULT_PAIRING_TTL_MS / 60000);

  return (
    <ModalScreen title={t('pairing.invite.title', { name: group.name })}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {t('pairing.invite.explainHeading')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('pairing.invite.explainIntro')}{' '}
            <Text style={{ color: colors.text }}>{t('pairing.invite.explainWarning')}</Text>
            {t('pairing.invite.explainRest')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('pairing.invite.linkPersists', { minutes })}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('pairing.invite.scopeNote', { name: group.name })}
          </Text>
        </Card>

        {invite === null ? (
          <Button
            label={generating ? t('pairing.invite.preparing') : t('pairing.invite.understood')}
            onPress={generate}
            loading={generating}
          />
        ) : expired ? (
          <Card style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>⌛</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.md }}>
              {t('pairing.invite.expiredTitle')}
            </Text>
            <Button
              label={t('pairing.invite.expiredRegenerate')}
              onPress={generate}
              loading={generating}
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        ) : (
          <>
            <Card style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {t('pairing.invite.sendLinkHeading')}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                {t('pairing.invite.linkValidFor', { remaining: formatRemaining(remaining) })}
              </Text>
              <Button label={t('pairing.invite.shareLink')} onPress={share} />
              <Button
                label={copied ? t('pairing.invite.linkCopied') : t('pairing.invite.copyLink')}
                variant="secondary"
                onPress={copy}
              />
            </Card>

            <Card style={{ gap: spacing.sm, alignItems: showQr ? 'center' : 'stretch' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                  alignSelf: 'flex-start',
                }}
              >
                {t('pairing.invite.scanHeading')}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSize.sm,
                  lineHeight: 20,
                  alignSelf: 'flex-start',
                }}
              >
                {t('pairing.invite.showQrHint')}
              </Text>
              {showQr ? (
                <View style={{ padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 8 }}>
                  <PairingQr value={invite.qr} size={qrSize} />
                </View>
              ) : (
                <Button
                  label={t('pairing.invite.showQr')}
                  variant="secondary"
                  onPress={() => setShowQr(true)}
                />
              )}
            </Card>

            <Button
              label={t('pairing.invite.regenerate')}
              variant="secondary"
              onPress={generate}
              loading={generating}
            />
          </>
        )}

        {error !== null && (
          <Card style={{ borderColor: colors.danger }}>
            <Text style={{ color: colors.danger, fontSize: fontSize.sm }} selectable>
              {error}
            </Text>
          </Card>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

/** `m:ss` con i secondi sempre a due cifre, per non far ballare la larghezza del testo. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
