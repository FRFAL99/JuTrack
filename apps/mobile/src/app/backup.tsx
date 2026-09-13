import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { deriveVaultKeys, exportBackup, importBackup } from '@jutrack/core';
import { Button } from '@/components/Button';
import { isFilePickerAvailable, pickKeyFile } from '@/features/import/pick';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import { assessPassphrase } from '@/features/backup/passphrase';
import { exportFileName } from '@/features/export/filenames';
import { isFileSharingAvailable, shareTextFile } from '@/features/export/share';
import { recordBackup } from '@/features/notifications/backup';
import { expoRandom } from '@/platform';
import { useAppData, useCurrentGroup, useGroups } from '@/state';
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
 *
 * **È l'unica schermata che deve funzionare con zero gruppi**, ed è per questo che è
 * rimasta fuori da `app/(gruppo)/`: il ripristino serve proprio a chi un gruppo non ce
 * l'ha — al primo avvio, dopo un azzeramento, o su un telefono nuovo. Senza gruppo aperto
 * sparisce la metà «crea un backup», che senza una chiave non ha nulla da cifrare, e resta
 * la metà che ne rimette una dentro.
 */
export default function BackupScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize } = useTheme();
  const { meta } = useAppData();
  const { registry, groups, join, select } = useGroups();
  const group = useCurrentGroup();

  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [exporting, setExporting] = useState(false);

  const [restoreBlob, setRestoreBlob] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

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
    // Il bottone non esiste senza un gruppo aperto: la guardia è qui perché il compilatore
    // non può sapere che le due condizioni sono la stessa.
    if (group === null) return;
    setExporting(true);
    // Il tempo di scrypt su questo telefono è ignoto finché non lo si misura qui: il
    // costo di default (logN=16) è tarato su desktop. Il valore finisce nel messaggio
    // finale, così si sa se vada alzato o abbassato.
    const startedAt = Date.now();

    void registry
      .keyBytes(group.vaultId)
      .then(async (key) => {
        if (key === null) {
          throw new Error(t('backup.keyUnreadable'));
        }
        const blob = await exportBackup(key, passphrase, expoRandom);
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        const name = exportFileName('chiave', 'txt', new Date());

        /**
         * Segna che la chiave di questo gruppo è uscita dall'app, cifrata.
         *
         * **È il massimo che si possa osservare, e va detto.** Né il foglio di condivisione
         * né gli appunti dicono se chi ha ricevuto il file l'ha poi conservato: `shareAsync`
         * torna quando il foglio si è aperto, e un annullamento dopo non si vede (vedi
         * `ShareOutcome`). Marcare qui significa quindi «la chiave cifrata ha lasciato
         * l'app», non «esiste un backup al sicuro» — ed è esattamente per questo che
         * l'avviso dello Step 43 dice «non **risulta** un backup» invece di «non hai
         * salvato». La frase è vera in entrambe le direzioni dell'incertezza.
         */
        const remember = (): Promise<void> => recordBackup(meta, group.vaultId);

        if (!isFileSharingAvailable()) {
          await Clipboard.setStringAsync(blob);
          await remember();
          Alert.alert(
            t('backup.clipboardAlert.title'),
            t('backup.clipboardAlert.body', { elapsed }),
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
          await remember();
          Alert.alert(t('backup.clipboardAlert.title'), t('backup.shareUnavailableBody'));
          return;
        }
        await remember();
        Alert.alert(t('backup.createdAlert.title'), t('backup.createdAlert.body', { elapsed }));
      })
      .catch((error: unknown) => {
        Alert.alert(
          t('backup.exportFailedTitle'),
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => setExporting(false));
  };

  /**
   * Sceglie il file del backup, con lo stesso schema di `/importa`.
   *
   * Le due schermate erano coerenti quando entrambe chiedevano di incollare (Step 42), e
   * devono restarlo ora che entrambe sanno scegliere: chi ha imparato il gesto di là se lo
   * aspetta di qua. La passphrase resta da digitare — quella non sta in nessun file, ed è
   * tutto il punto.
   */
  const chooseFile = (): void => {
    setPicking(true);
    setRestoreError(null);
    void pickKeyFile()
      .then((outcome) => {
        if (outcome.status === 'read') {
          setRestoreBlob(outcome.content.trim());
          return;
        }
        if (outcome.status === 'cancelled') return;
        if (outcome.status === 'unavailable') {
          Alert.alert(
            t('importScreen.pickUnavailable.title'),
            t('importScreen.pickUnavailable.body'),
          );
          return;
        }
        Alert.alert(
          t('importScreen.pickFailedTitle'),
          outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
        );
      })
      .finally(() => setPicking(false));
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
            Alert.alert(
              t('backup.alreadyPresent.title'),
              t('backup.alreadyPresent.body', { name: known.name }),
            ),
          );
          return;
        }

        // Non c'è più nulla di distruttivo da confermare: il ripristino **aggiunge** un
        // gruppo, e quelli che c'erano restano dove sono. Prima esisteva un solo slot per
        // la chiave, quindi ripristinarne una significava rendersi illeggibili i dati
        // dell'altro vault — ed era per quello che l'avviso parlava di una perdita.
        Alert.alert(t('backup.restoreConfirm.title'), t('backup.restoreConfirm.body'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('backup.restoreConfirm.confirm'),
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
        ]);
      })
      .catch((error: unknown) => {
        setRestoreError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setRestoring(false));
  };

  return (
    <ModalScreen
      title={
        group === null
          ? t('backup.title.noGroup')
          : t('backup.title.withGroup', { name: group.name })
      }
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* L'avviso resta **rosso** ma scende di corpo: era una card con un titolo in
            grassetto sopra una riga a `fontSize.sm`, cioè pesante quanto i due moduli che
            la seguono. Qui è la prima cosa che si legge e la sola in `danger` di tutta la
            schermata — che è quanto basta perché non passi inosservata. */}
        <SectionLabel>{t('backup.noRecoveryTitle')}</SectionLabel>
        <Note tone="danger">{t('backup.noRecoveryBody')}</Note>

        {/* Senza un gruppo aperto non c'è nessuna chiave da salvare, e un modulo che
            chiede una passphrase per cifrare il nulla sarebbe solo un modo di far
            sbagliare. Resta il ripristino, che è ciò per cui si arriva qui da zero. */}
        {group !== null && (
          <>
            <SectionLabel>{t('backup.createTitle')}</SectionLabel>
            <Note>{t('backup.createBody', { name: group.name })}</Note>
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              <TextInput
                value={passphrase}
                onChangeText={setPassphrase}
                placeholder={t('backup.passphrasePlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('backup.passphraseA11y')}
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
                placeholder={t('backup.confirmPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('backup.confirmA11y')}
                style={fieldStyle}
              />
              {mismatch && (
                <Text style={{ color: colors.danger, fontSize: fontSize.xs }}>
                  {t('backup.mismatch')}
                </Text>
              )}

              <Button
                label={exporting ? t('backup.encrypting') : t('backup.createButton')}
                onPress={handleExport}
                loading={exporting}
                disabled={!canExport}
              />
            </View>
            {/* Perché ci mette qualche secondo: sta **sotto** il bottone perché è la
                risposta a averlo premuto, non una cosa da sapere prima. */}
            <View style={{ paddingTop: spacing.sm }}>
              <Note>{t('backup.encryptHint')}</Note>
            </View>
          </>
        )}

        <SectionLabel>{t('backup.restoreTitle')}</SectionLabel>
        <Note>{t('backup.restoreBody')}</Note>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <TextInput
            value={restoreBlob}
            onChangeText={setRestoreBlob}
            placeholder={t('backup.blobPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('backup.blobA11y')}
            style={[fieldStyle, { minHeight: 88, textAlignVertical: 'top' }]}
          />
          <TextInput
            value={restorePassphrase}
            onChangeText={setRestorePassphrase}
            placeholder={t('backup.restorePassphrasePlaceholder')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('backup.restorePassphraseA11y')}
            style={fieldStyle}
          />
          {isFilePickerAvailable() && (
            <Button
              label={picking ? t('importScreen.picking') : t('backup.pickButton')}
              variant="secondary"
              onPress={chooseFile}
              loading={picking}
              disabled={picking || restoring}
            />
          )}
          <Button
            label={restoring ? t('backup.verifying') : t('backup.restoreButton')}
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
        </View>
      </ScrollView>
    </ModalScreen>
  );
}
