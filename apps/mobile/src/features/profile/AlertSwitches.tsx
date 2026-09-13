import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { BUDGET_NEAR_THRESHOLD } from '@jutrack/core';
import { BACKUP_MIN_EXPENSES } from '@/features/notifications/backup';
import { DATA_BACKUP_MIN_NEW } from '@/features/notifications/data-backup';
import { REMINDER_DAYS } from '@/features/notifications/reminder';
import { SYNC_STALL_HOURS } from '@/features/notifications/sync';
import type {
  NotificationKind,
  useNotificationSettings,
} from '@/features/notifications/useNotifications';
import { useTheme } from '@/theme';

interface AlertSwitchesProps {
  settings: ReturnType<typeof useNotificationSettings>;
  onToggle: (kind: NotificationKind, on: boolean) => void;
}

/**
 * I cinque interruttori degli avvisi, dentro il foglio che li apre.
 *
 * **Erano in `tu.tsx`, sempre aperti.** Quattro righe con altrettante spiegazioni sotto,
 * più due note in fondo: centodieci righe di schermata per delle cose che si toccano una
 * volta l'anno. Adesso stanno dietro una riga che dice quanti sono accesi.
 *
 * Il contenuto non è cambiato di una parola, e nemmeno le spiegazioni: qui si leggono
 * **mentre** si decide, che è l'unico momento in cui servono davvero.
 */
export function AlertSwitches({ settings, onToggle }: AlertSwitchesProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const toggle = onToggle;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {t('you.alerts.reminderTitle')}
          </Text>
          {/* I numeri restano costanti del codice e diventano segnaposto, non parole
              del dizionario: tradurre «3» non ha senso, e una lingua che lo scrivesse
              a mano lo lascerebbe indietro il giorno in cui `REMINDER_DAYS` cambia. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.alerts.reminderHint', { days: REMINDER_DAYS })}
          </Text>
        </View>
        <Switch
          value={settings.settings.reminder}
          onValueChange={(on) => toggle('reminder', on)}
          disabled={!settings.ready}
          accessibilityLabel={t('you.alerts.reminderTitle')}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {t('you.alerts.budgetTitle')}
          </Text>
          {/* La soglia si legge dal core invece di scriverla qui: è la stessa che
              colora le barre nei Grafici, e due numeri da tenere allineati sarebbero
              due numeri che prima o poi divergono. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.alerts.budgetHint', {
              percent: Math.round(BUDGET_NEAR_THRESHOLD * 100),
            })}
          </Text>
        </View>
        <Switch
          value={settings.settings.budget}
          onValueChange={(on) => toggle('budget', on)}
          disabled={!settings.ready}
          accessibilityLabel={t('you.alerts.budgetTitle')}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {t('you.alerts.syncTitle')}
          </Text>
          {/* Le ore si leggono dalla costante, come la soglia dei budget si legge dal
              core: un numero scritto due volte è un numero che prima o poi diverge. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.alerts.syncHint', { hours: SYNC_STALL_HOURS })}
          </Text>
        </View>
        <Switch
          value={settings.settings.sync}
          onValueChange={(on) => toggle('sync', on)}
          disabled={!settings.ready}
          accessibilityLabel={t('you.alerts.syncTitle')}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {t('you.alerts.backupTitle')}
          </Text>
          {/* La soglia si legge dalla costante, come le altre tre. La riga dice anche
              «una volta sola per gruppo», che è la cosa che distingue questo avviso
              dagli altri: la chiave non cambia mai, quindi salvarla una volta chiude
              la questione per sempre. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.alerts.backupHint', { count: BACKUP_MIN_EXPENSES })}
          </Text>
        </View>
        <Switch
          value={settings.settings.backup}
          onValueChange={(on) => toggle('backup', on)}
          disabled={!settings.ready}
          accessibilityLabel={t('you.alerts.backupTitle')}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {t('you.alerts.dataBackupTitle')}
          </Text>
          {/* **La riga dice «di nuovo», ed è la parola che lo distingue da quello
              sopra.** Là la chiave, salvata una volta, chiude la questione per sempre;
              qui i dati invecchiano a ogni spesa, quindi l'avviso torna. Senza quella
              parola i due sembrerebbero lo stesso avviso scritto due volte. */}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('you.alerts.dataBackupHint', { count: DATA_BACKUP_MIN_NEW })}
          </Text>
        </View>
        <Switch
          value={settings.settings.dataBackup}
          onValueChange={(on) => toggle('dataBackup', on)}
          disabled={!settings.ready}
          accessibilityLabel={t('you.alerts.dataBackupTitle')}
        />
      </View>

      {/* Il limite va detto, non scoperto: i due avvisi li produce l'app guardando il
          documento e il motore, quindi arrivano quando l'app è aperta — subito per
          quello che succede qui, all'apertura successiva per il resto. */}
      <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
        {t('you.alerts.scope')}
      </Text>

      {/* L'interruttore resta acceso perché la scelta è di chi l'ha fatta: spegnerlo
          d'ufficio la farebbe sparire senza spiegazione. A dire che non funziona è
          questa riga, non un tocco che si disfa da solo. */}
      {settings.blocked && (
        <Text style={{ color: colors.warning, fontSize: fontSize.xxs }}>
          {t('you.alerts.blocked')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
