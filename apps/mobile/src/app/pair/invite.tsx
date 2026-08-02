import { useCallback, useEffect, useState } from 'react';
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
import { PairingQr } from '@/features/pairing/PairingQr';
import { useCurrentGroup, useGroups } from '@/state';
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
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { width } = useWindowDimensions();
  const { registry } = useGroups();
  const group = useCurrentGroup();

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
          setError('La chiave di questo gruppo non è leggibile su questo dispositivo.');
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
  }, [group.name, group.vaultId, registry]);

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
      message: `Entra in «${group.name}» su JuTrack:\n${invite.link.url}`,
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }, [group.name, invite]);

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
    <ModalScreen title={`Invita in «${group.name}»`}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Cosa stai per mandare
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            La chiave di questo gruppo.{' '}
            <Text style={{ color: colors.text }}>Chiunque apra il link entra</Text>: mandalo alla
            persona giusta e a nessun altro. Se viene inoltrato, anche chi lo riceve di rimbalzo
            legge tutte le spese del gruppo, adesso e in futuro.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Il link resta nella conversazione in cui l&apos;hai mandato. Dopo {minutes} minuti
            smette di essere accettato, ma la chiave che contiene no: se hai sbagliato destinatario,
            l&apos;unico rimedio è uscire dal gruppo e rifarlo.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Vale solo per «{group.name}»: gli altri tuoi gruppi non c&apos;entrano e restano
            inaccessibili a chi lo riceve. Il relay non lo legge — la chiave sta nella parte
            dell&apos;indirizzo che i browser non inviano ai server.
          </Text>
        </Card>

        {invite === null ? (
          <Button
            label={generating ? 'Preparazione…' : 'Ho capito, prepara l’invito'}
            onPress={generate}
            loading={generating}
          />
        ) : expired ? (
          <Card style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>⌛</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.md }}>Invito scaduto</Text>
            <Button
              label="Prepara un nuovo invito"
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
                Manda il link
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                Chi lo apre trova un bottone che apre JuTrack sul suo telefono. Valido ancora{' '}
                {formatRemaining(remaining)}.
              </Text>
              <Button label="Condividi il link" onPress={share} />
              <Button
                label={copied ? 'Link copiato' : 'Copia il link'}
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
                Oppure inquadra un codice
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSize.sm,
                  lineHeight: 20,
                  alignSelf: 'flex-start',
                }}
              >
                Se avete i due telefoni davanti, il QR evita di far passare la chiave da una chat.
                Sull&apos;altro: Gruppi → Entra in un gruppo → Scansiona un codice.
              </Text>
              {showQr ? (
                <View style={{ padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 8 }}>
                  <PairingQr value={invite.qr} size={qrSize} />
                </View>
              ) : (
                <Button
                  label="Mostra il codice QR"
                  variant="secondary"
                  onPress={() => setShowQr(true)}
                />
              )}
            </Card>

            <Button
              label="Rigenera l’invito"
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
