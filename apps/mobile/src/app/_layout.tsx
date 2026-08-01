import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VaultProvider, useVaultStatus } from '@/state';
import { useTheme } from '@/theme';

/**
 * Blocca il rendering delle schermate finché il vault non è caricato.
 *
 * Senza, la lista spese comparirebbe vuota per un istante prima di popolarsi — e in
 * caso di errore sembrerebbe semplicemente un vault senza dati, nascondendo il guasto.
 */
function VaultGate({ children }: { children: React.ReactNode }) {
  const status = useVaultStatus();
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  if (status.phase === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status.phase === 'error') {
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
        <Text
          style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}
        >
          Impossibile aprire i dati locali
        </Text>
        <Text
          style={{ color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}
          selectable
        >
          {status.message}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

function Shell() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <VaultGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </VaultGate>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VaultProvider>
        <Shell />
      </VaultProvider>
    </SafeAreaProvider>
  );
}
