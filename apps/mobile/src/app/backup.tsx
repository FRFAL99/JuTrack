import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { deriveVaultKeys, exportBackup, importBackup } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { assessPassphrase } from '@/features/backup/passphrase';
import { exportFileName } from '@/features/export/filenames';
import { isFileSharingAvailable, shareTextFile } from '@/features/export/share';
import { expoRandom } from '@/platform';
import { useCurrentGroup, useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * Backup e ripristino della chiave di un gruppo.
 *
 * È l'unica via di recupero che esiste: il relay conserva blob che non sa leggere, quindi
 * non c'è nessun «password dimenticata» da nessuna parte. Persa la chiave senza backup, i
 * dati sono persi — e lo scriviamo qui, non in fondo a una guida.
 *
 * Il file esportato è cifrato con la passphrase (scrypt + XChaCha20-Poly1305, vedi
 * `crypto/backup.ts`). Contiene **solo** la chiave: le spese stanno nell'export dati, che
 * è un'altra schermata e viaggia in chiaro.
 *
 * **Una chiave per gruppo, quindi un backup per gruppo.** Si salva quella del gruppo
 * aperto; ripristinarne una **aggiunge** un gruppo invece di sostituire quello corrente,
 * che dallo Step 12 non ha più alcuna ragione di essere abbandonato.
 */
export default function BackupScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { registry, groups, join, select } = useGroups();
  const group = useCurrentGroup();

  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [exporting, setExporting] = useState(false);

  const [restoreBlob, setRestoreBlob] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const assessment = assessPassphrase(passphrase);
  const mismatch = confirmation !== '' && confirmation !== passphrase;
  const canExport = assessment.acceptable && confirmation === passphrase && !exporting;

  const fieldStyle = {
    color: colors.text,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  };

  const handleExport = (): void => {
    setExporting(true);
    // Il tempo di scrypt su questo telefono è ignoto finché non lo si misura qui: il
    // costo di default (logN=16) è tarato su desktop. Il valore finisce nel messaggio
    // finale, così si sa se vada alzato o abbassato.
    const startedAt = Date.now();

    void registry
      .keyBytes(group.vaultId)
      .then(async (key) => {
        if (key === null) {
          throw new Error('La chiave di questo gruppo non è leggibile su questo dispositivo.');
        }
        const blob = await exportBackup(key, passphrase, expoRandom);
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        const name = exportFileName('chiave', 'txt', new Date());

        if (!isFileSharingAvailable()) {
          await Clipboard.setStringAsync(blob);
          Alert.alert(
            'Backup negli appunti',
            `Cifratura completata in ${elapsed} s. Su questa build manca il modulo per salvare i ` +
              'file: il backup è negli appunti. Incollalo subito in un gestore di password — gli ' +
              'appunti non sono un posto dove lasciarlo.',
          );
          return;
        }

        const outcome = await shareTextFile({
          name,
          content: blob + '\n',
          mimeType: 'text/plain',
          dialogTitle: name,
        });
        if (outcome.status === 'failed') throw outcome.error;
        if (outcome.status === 'unavailable') {
          await Clipboard.setStringAsync(blob);
          Alert.alert('Backup negli appunti', 'Il foglio di condivisione non è disponibile qui.');
          return;
        }
        Alert.alert(
          'Backup creato',
          `Cifratura completata in ${elapsed} s. Conserva il file dove conservi le password, e ` +
            'ricorda la passphrase: senza, il file non serve a niente.',
        );
      })
      .catch((error: unknown) => {
        Alert.alert('Backup fallito', error instanceof Error ? error.message : String(error));
      })
      .finally(() => setExporting(false));
  };

  const handleRestore = (): void => {
    setRestoring(true);
    setRestoreError(null);

    void importBackup(restoreBlob, restorePassphrase)
      .then((key) => {
        const incoming = deriveVaultKeys(key).vaultId;
        const known = groups.find((g) => g.vaultId === incoming);
        if (known !== undefined) {
          // Non è più un errore, ed è la ragione per cui il messaggio è cambiato: il
          // gruppo c'è già, quindi ripristinarlo significa semplicemente aprirlo.
          setRestoreBlob('');
          setRestorePassphrase('');
          void select(known.vaultId).then(() =>
            Alert.alert('Gruppo già presente', `«${known.name}» è di nuovo il gruppo aperto.`),
          );
          return;
        }

        // Non c'è più nulla di distruttivo da confermare: il ripristino **aggiunge** un
        // gruppo, e quelli che c'erano restano dove sono. Prima esisteva un solo slot per
        // la chiave, quindi ripristinarne una significava rendersi illeggibili i dati
        // dell'altro vault — ed era per quello che l'avviso parlava di una perdita.
        Alert.alert(
          'Ripristinare questo gruppo?',
          `Verrà aggiunto ai tuoi gruppi, senza toccare quelli che hai già. ` +
            'Le spese arriveranno col primo sync, se il gruppo è ancora sul relay.',
          [
            { text: 'Annulla', style: 'cancel' },
            {
              text: 'Ripristina',
              onPress: () => {
                // Si sta **entrando** in un vault che esiste già, e le sue categorie
                // arriveranno col primo sync: `join` lo registra come `joined`, così
                // seminare le proprie — e ritrovarsene sedici — non è possibile.
                void join(key, 'Gruppo ripristinato')
                  .then((restored) => {
                    setRestoreBlob('');
                    setRestorePassphrase('');
                    router.replace(`/groups/${restored.vaultId}`);
                  })
                  .catch((error: unknown) => {
                    setRestoreError(error instanceof Error ? error.message : String(error));
                  });
              },
            },
          ],
        );
      })
      .catch((error: unknown) => {
        setRestoreError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setRestoring(false));
  };

  return (
    <ModalScreen title={`Backup di «${group.name}»`}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.xs, borderColor: colors.danger }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Non esiste un «password dimenticata»
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            I dati sono cifrati end-to-end: il server conserva blob che non sa leggere. Se perdi la
            chiave e non hai un backup, le spese non tornano — nessuno può recuperarle, noi
            compresi.
          </Text>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Crea un backup
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              La chiave di «{group.name}», in un file cifrato con la passphrase che scegli. Da solo
              non serve a niente, e nemmeno la passphrase da sola: servono entrambi. Ogni gruppo ha
              la sua chiave, quindi va salvato uno per uno.
            </Text>
          </View>

          <TextInput
            value={passphrase}
            onChangeText={setPassphrase}
            placeholder="Passphrase"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Passphrase per il backup"
            style={fieldStyle}
          />
          {passphrase !== '' && (
            <Text
              style={{
                color: assessment.acceptable ? colors.textMuted : colors.danger,
                fontSize: fontSize.xs,
                lineHeight: 18,
              }}
            >
              {assessment.message}
            </Text>
          )}

          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Ripeti la passphrase"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Conferma della passphrase"
            style={fieldStyle}
          />
          {mismatch && (
            <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>
              Le due passphrase non coincidono.
            </Text>
          )}

          <Button
            label={exporting ? 'Cifratura…' : 'Crea il backup'}
            onPress={handleExport}
            loading={exporting}
            disabled={!canExport}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
            La cifratura richiede qualche secondo: è voluto. Rende costoso provare le passphrase a
            tappeto su un file rubato.
          </Text>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Ripristina da un backup
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Incolla il contenuto del file di backup, quello che comincia per JTBK1.
            </Text>
          </View>

          <TextInput
            value={restoreBlob}
            onChangeText={setRestoreBlob}
            placeholder="JTBK1.…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Contenuto del backup"
            style={[fieldStyle, { minHeight: 88, textAlignVertical: 'top' }]}
          />
          <TextInput
            value={restorePassphrase}
            onChangeText={setRestorePassphrase}
            placeholder="Passphrase del backup"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Passphrase del backup da ripristinare"
            style={fieldStyle}
          />
          <Button
            label={restoring ? 'Verifica…' : 'Ripristina la chiave'}
            variant="secondary"
            onPress={handleRestore}
            loading={restoring}
            disabled={restoreBlob.trim() === '' || restorePassphrase === '' || restoring}
          />
          {restoreError !== null && (
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {restoreError}
            </Text>
          )}
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ModalScreen>
  );
}
