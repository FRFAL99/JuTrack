import { useCallback, useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import {
  loadCameraModule,
  requestCameraPermission,
  type CameraPermission,
} from '@/features/pairing/camera';
import { useAdoptPairing } from '@/features/pairing/useAdoptPairing';
import { useTheme } from '@/theme';

type PermissionPhase = CameraPermission | 'unknown';

/**
 * Entra in un gruppo che esiste già su un altro telefono.
 *
 * Tre strade, un solo esito: inquadrare il QR, incollare il link arrivato in chat,
 * incollare l'URI del vecchio pairing. Il campo di testo resta sempre disponibile perché
 * se il modulo nativo della fotocamera manca o il permesso viene negato l'ingresso deve
 * restare possibile, altrimenti l'app smette di avere senso in coppia.
 */
export default function PairScanScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize } = useTheme();
  const { submit, error, adopting } = useAdoptPairing();

  const camera = loadCameraModule();
  const [permission, setPermission] = useState<PermissionPhase>(
    camera === null ? 'unavailable' : 'unknown',
  );
  const [manual, setManual] = useState('');
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  useEffect(() => {
    if (camera === null) return;
    let cancelled = false;
    void requestCameraPermission(camera)
      .then((outcome) => {
        if (!cancelled) setPermission(outcome);
      })
      .catch(() => {
        // Anche il solo chiedere il permesso può fallire su una build priva del modulo
        // nativo: vale come «fotocamera non disponibile», non come permesso negato.
        if (!cancelled) setPermission('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [camera]);

  const pasteFromClipboard = useCallback((): void => {
    setClipboardError(null);
    void Clipboard.getStringAsync()
      .then((text) => {
        setManual(text);
        submit(text);
      })
      .catch((cause: unknown) => {
        setClipboardError(cause instanceof Error ? cause.message : String(cause));
      });
  }, [submit]);

  const CameraView = camera?.CameraView;
  const shown = error ?? clipboardError;

  return (
    <ModalScreen title={t('pairing.scan.title')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {permission === 'granted' && CameraView !== undefined ? (
          <View
            style={[
              styles.viewfinder,
              {
                borderRadius: radius.lg,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => submit(data)}
            />
          </View>
        ) : (
          /* La fotocamera che non c'è **non** è un commento: è lo stato in cui si è, e dice
             perché il riquadro sopra è vuoto. Resta in `warning` e a piena leggibilità;
             sotto, in nota, come rimediare. */
          <View style={{ marginHorizontal: -spacing.lg }}>
            <SectionLabel>
              {permission === 'unknown'
                ? t('pairing.scan.activating')
                : t('pairing.scan.cameraUnavailable')}
            </SectionLabel>
            <Note tone={permission === 'unknown' ? 'default' : 'warning'}>
              {describePermission(permission, t)}
            </Note>
          </View>
        )}

        {/* **La coda di questa frase è un avviso, non una spiegazione**: «contiene la chiave
            del gruppo in chiaro: dopo averlo usato, non lasciarlo in giro». Resta separata e
            in `warning`, perché incollata in fondo a una nota grigia sarebbe la parte che non
            si legge. */}
        <View style={{ marginHorizontal: -spacing.lg }}>
          <SectionLabel>{t('pairing.scan.pasteHeading')}</SectionLabel>
          <Note>
            {t('pairing.scan.pasteHintIntro')} {t('pairing.scan.schemePrefix')}
          </Note>
          <Note tone="warning">{t('pairing.scan.pasteHintRest')}</Note>
        </View>

        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={() => submit(manual)}
            placeholder={t('pairing.scan.placeholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            accessibilityLabel={t('pairing.scan.linkLabel')}
            style={{
              color: colors.text,
              fontSize: fontSize.sm,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              padding: spacing.md,
              minHeight: 72,
            }}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label={t('pairing.scan.paste')}
              variant="secondary"
              onPress={pasteFromClipboard}
              style={{ flex: 1 }}
            />
            <Button
              label={adopting ? t('pairing.scan.connecting') : t('pairing.scan.connect')}
              onPress={() => submit(manual)}
              disabled={manual.trim() === ''}
              loading={adopting}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {shown !== null && (
          <View style={{ paddingTop: spacing.sm }}>
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {shown}
            </Text>
          </View>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

function describePermission(phase: PermissionPhase, t: TFunction): string {
  switch (phase) {
    case 'unknown':
      return t('pairing.scan.permission.unknown');
    case 'denied':
      return t('pairing.scan.permission.denied');
    case 'unavailable':
      return t('pairing.scan.permission.unavailable');
    case 'granted':
      return '';
  }
}

const styles = StyleSheet.create({
  viewfinder: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
