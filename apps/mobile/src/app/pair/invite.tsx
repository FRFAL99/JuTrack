import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { createPairingInvite, DEFAULT_PAIRING_TTL_MS, type PairingInvite } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { PairingQr } from '@/features/pairing/PairingQr';
import { useCurrentGroup, useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * Mostra il QR con cui l'altro telefono entra nel **gruppo aperto**.
 *
 * Il codice non compare da solo: prima si spiega cosa contiene e si chiede conferma.
 * Dentro c'è la chiave del gruppo in chiaro, quindi lo schermo acceso su un tavolo, una
 * foto o una condivisione dello schermo bastano a far entrare un estraneo. È un rischio
 * accettato e documentato nel threat model, ma va detto **prima**, non dopo.
 */
export default function PairInviteScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { width } = useWindowDimensions();
  const { registry } = useGroups();
  const group = useCurrentGroup();

  const [invite, setInvite] = useState<PairingInvite | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback((): void => {
    setGenerating(true);
    setError(null);
    // La chiave radice, non le derivate: è quella a dover finire nel codice, e da lei
    // l'altro telefono ricava vaultId, contentKey e authKey da solo.
    void registry
      .keyBytes(group.vaultId)
      .then((key) => {
        if (key === null) {
          setError('La chiave di questo gruppo non è leggibile su questo dispositivo.');
          return;
        }
        const fresh = createPairingInvite(key, { now: Date.now() });
        setInvite(fresh);
        setRemaining(fresh.expiresAt - Date.now());
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setGenerating(false));
  }, [group.vaultId, registry]);

  // Il conto alla rovescia è ricalcolato dall'orologio a ogni tick, non decrementato:
  // se il telefono sospende, un contatore decrementato resterebbe indietro e mostrerebbe
  // un invito ancora valido quando è già scaduto.
  useEffect(() => {
    if (invite === null) return;
    const id = setInterval(() => setRemaining(invite.expiresAt - Date.now()), 500);
    return () => clearInterval(id);
  }, [invite]);

  const expired = invite !== null && remaining <= 0;
  const qrSize = Math.min(width - spacing.xl * 4, 300);

  return (
    <ModalScreen title={`Invita in «${group.name}»`}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              fontWeight: fontWeight.semibold,
            }}
          >
            Cosa contiene questo codice
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            La chiave di questo gruppo, in chiaro. Chi la inquadra — anche da una foto o da uno
            schermo condiviso — può leggere tutte le sue spese, adesso e in futuro. Mostralo solo
            all&apos;altro telefono e solo mentre lo state guardando entrambi.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Vale solo per «{group.name}»: gli altri tuoi gruppi non c&apos;entrano e restano
            inaccessibili a chi lo scansiona.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Il codice smette di essere accettato dopo {Math.round(DEFAULT_PAIRING_TTL_MS / 60000)}{' '}
            minuti.
          </Text>
        </Card>

        {invite === null ? (
          <Button
            label={generating ? 'Preparazione…' : 'Ho capito, mostra il codice'}
            onPress={generate}
            loading={generating}
          />
        ) : (
          <Card style={{ alignItems: 'center', gap: spacing.md }}>
            {expired ? (
              <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
                <Text style={{ fontSize: 40 }}>⌛</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>Codice scaduto</Text>
              </View>
            ) : (
              <>
                <View style={{ padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 8 }}>
                  <PairingQr value={invite.uri} size={qrSize} />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  Valido ancora {formatRemaining(remaining)}
                </Text>
              </>
            )}
            <Button
              label={expired ? 'Genera un nuovo codice' : 'Rigenera'}
              variant={expired ? 'primary' : 'secondary'}
              onPress={generate}
              loading={generating}
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        )}

        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Sull&apos;altro telefono: Impostazioni → Gruppi → Entra in un gruppo → Scansiona un
            codice.
          </Text>
        </Card>

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
