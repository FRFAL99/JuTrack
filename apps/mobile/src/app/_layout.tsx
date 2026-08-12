import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GroupIdentityGate } from '@/features/groups/GroupIdentityGate';
import { BudgetWatcher } from '@/features/notifications/BudgetWatcher';
import { ReminderScheduler } from '@/features/notifications/ReminderScheduler';
import { SyncWatcher } from '@/features/notifications/SyncWatcher';
import { ProfileOnboarding } from '@/features/profile/ProfileOnboarding';
import { WidgetPublisher } from '@/features/widgets/WidgetPublisher';
import {
  GroupsProvider,
  ProfileProvider,
  VaultProvider,
  useAppDataStatus,
  useGroupIdentity,
  useGroupsStatus,
  useVaultStatus,
} from '@/state';
import { useTheme } from '@/theme';

/** Schermata di attesa e schermata di guasto, identiche per i due gate. */
function Waiting() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function Broken({ title, message }: { title: string; message: string }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontSize: 44 }}>⚠️</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
        {title}
      </Text>
      <Text
        style={{ color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}
        selectable
      >
        {message}
      </Text>
    </View>
  );
}

/**
 * Attende il profilo, e al primissimo avvio lo chiede.
 *
 * Sta **sopra** il vault, non accanto: il membro che rappresenta me dentro un vault è
 * scritto con il `profileId`, quindi il profilo deve esistere prima che il vault si
 * monti. Così non c'è alcuno stato intermedio in cui l'app funziona ma «io» non esisto —
 * ed è in quello stato che nascevano i membri duplicati.
 */
function ProfileGate({ children }: { children: React.ReactNode }) {
  const status = useAppDataStatus();

  if (status.phase === 'loading') return <Waiting />;
  if (status.phase === 'error') {
    return <Broken title="Impossibile aprire i dati locali" message={status.message} />;
  }
  if (status.data.profile === null) return <ProfileOnboarding />;

  return <>{children}</>;
}

/**
 * Attende il registro dei gruppi.
 *
 * Sta fra il profilo e il vault: il gruppo corrente è ciò su cui il runtime si monta, e
 * dev'essere già scelto quando quello parte. **Che ce ne sia uno non è più garantito**
 * (Step 21): finita l'attesa, l'elenco può essere vuoto, e allora il vault sotto pubblica
 * la fase `absent`.
 */
function GroupsGate({ children }: { children: React.ReactNode }) {
  const status = useGroupsStatus();

  if (status.phase === 'loading') return <Waiting />;
  if (status.phase === 'error') {
    return <Broken title="Impossibile aprire i gruppi" message={status.message} />;
  }

  return <>{children}</>;
}

/**
 * Blocca il rendering delle schermate finché il gruppo aperto non è caricato.
 *
 * Senza, la lista spese comparirebbe vuota per un istante prima di popolarsi — e in
 * caso di errore sembrerebbe semplicemente un gruppo senza dati, nascondendo il guasto.
 *
 * Copre anche il cambio di gruppo: il runtime torna in `loading` mentre smonta l'uno e
 * monta l'altro, e per quella frazione di secondo le schermate non devono leggere lo
 * store di un gruppo che non è più quello aperto.
 *
 * **`absent` invece passa** (Step 21). Non c'è niente da attendere: non esiste un gruppo,
 * e bloccare qui l'intera app significherebbe uno spinner eterno al primo avvio. Le
 * schermate che il vault lo vogliono davvero sono già tutte dietro la guardia di
 * `app/(gruppo)/` (Step 19), o dentro lo stack `[vaultId]`, che senza gruppi non è
 * raggiungibile.
 */
function VaultGate({ children }: { children: React.ReactNode }) {
  const status = useVaultStatus();
  const identity = useGroupIdentity();

  if (status.phase === 'loading') return <Waiting />;
  if (status.phase === 'error') {
    return <Broken title="Impossibile aprire questo gruppo" message={status.message} />;
  }
  // Chi è appena entrato in un gruppo altrui risponde prima a una domanda: nuovo, o già
  // dentro con un altro telefono? Finché non risponde non viene scritto alcun membro.
  if (identity?.status === 'pending') return <GroupIdentityGate identity={identity} />;

  return <>{children}</>;
}

function Shell() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ProfileGate>
        {/* Riarma il promemoria a ogni avvio: una notifica programmata sparisce quando
            suona, e senza questo scatterebbe una volta sola. Non disegna niente e non
            dipende dai gruppi. */}
        <ReminderScheduler />
        <GroupsProvider>
          <GroupsGate>
            <VaultProvider>
              <VaultGate>
                {/* Guarda i budget del gruppo aperto e avvisa quando uno cambia livello.
                    Sta qui e non in una schermata: dentro i Grafici si controllerebbero
                    solo aprendo la scheda dove sono già disegnati. */}
                <BudgetWatcher />
                {/* Guarda il motore del gruppo aperto e avvisa se resta fermo. Qui e non
                    in una schermata per la ragione opposta e complementare: il pallino
                    del sync vive in Tu e in fondo alla lista spese, cioè dove chi ha il
                    sync rotto potrebbe non passare per giorni. */}
                <SyncWatcher />
                {/* Tiene aggiornato il saldo che si legge sulla home di Android. Qui e non
                    in una schermata per la ragione più forte delle tre: quel saldo si
                    guarda **fuori** dall'app, e chi apre l'app solo per registrare una
                    spesa non passa da dove lo si potrebbe ricalcolare. */}
                <WidgetPublisher />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                />
              </VaultGate>
            </VaultProvider>
          </GroupsGate>
        </GroupsProvider>
      </ProfileGate>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <Shell />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
