import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import {
  loadCameraModule,
  requestCameraPermission,
  type CameraPermission,
} from '@/features/pairing/camera';
import { useAdoptPairing } from '@/features/pairing/useAdoptPairing';
import { useTheme } from '@/theme';

type PermissionPhase = CameraPermission | 'unknown';

/**
 * Adotta la chiave di un vault già esistente sull'altro telefono.
 *
 * La fotocamera è la strada normale, ma non l'unica: il campo per incollare il codice
 * resta sempre disponibile. Se il modulo nativo manca o il permesso viene negato il
 * pairing deve restare possibile, altrimenti il secondo telefono non entra nel vault e
 * l'app smette di avere senso in coppia.
 */
export default function PairScanScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
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
    <ModalScreen title="Scansiona un codice">
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
          <Card style={{ gap: spacing.xs }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              {permission === 'unknown' ? 'Attivazione fotocamera…' : 'Fotocamera non disponibile'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              {describePermission(permission)}
            </Text>
          </Card>
        )}

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Oppure incolla il codice
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            L&apos;indirizzo che comincia con{' '}
            <Text style={{ color: colors.text }}>jutrack://pair</Text>. Contiene la chiave del vault
            in chiaro: non va inoltrato in chat né conservato altrove.
          </Text>
          <TextInput
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={() => submit(manual)}
            placeholder="jutrack://pair?v=1&k=…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            accessibilityLabel="Codice di collegamento"
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
              label="Incolla"
              variant="secondary"
              onPress={pasteFromClipboard}
              style={{ flex: 1 }}
            />
            <Button
              label={adopting ? 'Collegamento…' : 'Collega'}
              onPress={() => submit(manual)}
              disabled={manual.trim() === ''}
              loading={adopting}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {shown !== null && (
          <Card style={{ borderColor: colors.danger }}>
            <Text style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }} selectable>
              {shown}
            </Text>
          </Card>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

function describePermission(phase: PermissionPhase): string {
  switch (phase) {
    case 'unknown':
      return 'Sto chiedendo il permesso di usare la fotocamera.';
    case 'denied':
      return 'Permesso negato. Puoi concederlo dalle impostazioni di sistema, oppure incollare il codice qui sotto.';
    case 'unavailable':
      return 'Questa build non espone la fotocamera. Il collegamento funziona comunque incollando il codice qui sotto.';
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
