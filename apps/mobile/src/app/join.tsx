import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
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
  const { colors, spacing, fontSize } = useTheme();
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
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <SectionLabel>
          {waiting
            ? t('pairing.join.noInviteTitle')
            : adopting
              ? t('pairing.join.enteringTitle')
              : t('pairing.receivedTitle')}
        </SectionLabel>
        <Note>{waiting ? t('pairing.join.noInviteHint') : t('pairing.join.receivedHint')}</Note>

        {error !== null && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {error}
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Button
            label={t('pairing.join.pasteOrScan')}
            onPress={() => router.replace('/pair/scan')}
          />
          <Button
            label={t('pairing.join.backToGroups')}
            variant="secondary"
            onPress={() => router.replace('/')}
          />
        </View>
      </ScrollView>
    </ModalScreen>
  );
}
