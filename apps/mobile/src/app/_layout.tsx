import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileOnboarding } from '@/features/profile/ProfileOnboarding';
import { ProfileProvider, VaultProvider, useAppDataStatus, useVaultStatus } from '@/state';
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
 * Blocca il rendering delle schermate finché il vault non è caricato.
 *
 * Senza, la lista spese comparirebbe vuota per un istante prima di popolarsi — e in
 * caso di errore sembrerebbe semplicemente un vault senza dati, nascondendo il guasto.
 */
function VaultGate({ children }: { children: React.ReactNode }) {
  const status = useVaultStatus();

  if (status.phase === 'loading') return <Waiting />;
  if (status.phase === 'error') {
    return <Broken title="Impossibile aprire i dati locali" message={status.message} />;
  }

  return <>{children}</>;
}

function Shell() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ProfileGate>
        <VaultProvider>
          <VaultGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </VaultGate>
        </VaultProvider>
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
