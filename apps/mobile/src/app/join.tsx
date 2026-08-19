import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { useAdoptPairing } from '@/features/pairing/useAdoptPairing';
import { useTheme } from '@/theme';

/**
 * Riceve un invito arrivato come link: `jutrack://join#…`.
 *
 * **Il fragment non passa da expo-router.** Il router instrada sul percorso e trasforma la
 * query in parametri, ma ciò che sta dopo il `#` non è né l'uno né l'altra — ed è proprio
 * lì che sta la chiave, per non farla arrivare mai a un server. Quindi qui si legge il
 * link **grezzo** con `Linking.useURL()`, che restituisce l'URL così com'è entrato nel
 * telefono.
 *
 * `useLinkingURL()` e non `getInitialURL()`: copre sia l'app aperta dal link sia l'app già
 * viva che ne riceve uno, e restituisce subito l'URL iniziale a ogni ricarica.
 */
export default function JoinScreen() {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const url = Linking.useLinkingURL();
  const { submit, error, adopting } = useAdoptPairing();

  // Un solo tentativo per link: `submit` cambia identità a ogni render e rilancerebbe la
  // conferma all'infinito se fosse una dipendenza dell'effetto.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (url === null || handled.current === url) return;
    handled.current = url;
    submit(url);
  }, [submit, url]);

  const waiting = url === null;

  return (
    <ModalScreen title={t('pairing.join.title')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.xs }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {waiting
              ? t('pairing.join.noInviteTitle')
              : adopting
                ? t('pairing.join.enteringTitle')
                : t('pairing.receivedTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {waiting ? t('pairing.join.noInviteHint') : t('pairing.join.receivedHint')}
          </Text>
        </Card>

        {error !== null && (
          <Card style={{ borderColor: colors.danger }}>
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {error}
            </Text>
          </Card>
        )}

        <Button
          label={t('pairing.join.pasteOrScan')}
          onPress={() => router.replace('/pair/scan')}
        />
        <Button
          label={t('pairing.join.backToGroups')}
          variant="secondary"
          onPress={() => router.replace('/')}
        />
      </ScrollView>
    </ModalScreen>
  );
}
