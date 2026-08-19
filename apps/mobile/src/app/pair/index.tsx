import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { PAIRING_URI_PREFIX } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { useAdoptPairing } from '@/features/pairing/useAdoptPairing';
import { useTheme } from '@/theme';

/**
 * Riceve un `jutrack://pair?…` aperto da fuori.
 *
 * Chi scansiona il QR con la fotocamera di sistema — cosa che capita, perché è il gesto
 * naturale — apre l'app su questa rotta invece che sullo scanner interno. Senza questa
 * schermata vedrebbe un errore di rotta inesistente e concluderebbe che il pairing non
 * funziona. La conferma richiesta è la stessa della scansione interna: arrivare da un
 * link non deve rendere l'adozione più silenziosa.
 */
export default function PairDeepLinkScreen() {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const params = useLocalSearchParams<{ v?: string; k?: string; e?: string }>();
  const { submit, error } = useAdoptPairing();

  const key = firstValue(params.k);
  // Un solo tentativo: `submit` cambia identità a ogni render e rilancerebbe la
  // conferma all'infinito se fosse una dipendenza dell'effetto.
  const asked = useRef(false);

  useEffect(() => {
    if (key === undefined || asked.current) return;
    asked.current = true;

    const query = [
      `v=${firstValue(params.v) ?? ''}`,
      `k=${key}`,
      ...(firstValue(params.e) === undefined ? [] : [`e=${firstValue(params.e) as string}`]),
    ];
    submit(`${PAIRING_URI_PREFIX}?${query.join('&')}`);
  }, [key, params.e, params.v, submit]);

  return (
    <ModalScreen title={t('pairing.deepLink.title')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.xs }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {key === undefined ? t('pairing.deepLink.noCodeTitle') : t('pairing.receivedTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {key === undefined
              ? t('pairing.deepLink.noCodeHint')
              : t('pairing.deepLink.receivedHint')}
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

        <Button label={t('pairing.deepLink.scan')} onPress={() => router.replace('/pair/scan')} />
        <Button
          label={t('pairing.deepLink.showMyCode')}
          variant="secondary"
          onPress={() => router.replace('/pair/invite')}
        />
      </ScrollView>
    </ModalScreen>
  );
}

/** expo-router restituisce un array quando un parametro compare più volte nell'URL. */
function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
