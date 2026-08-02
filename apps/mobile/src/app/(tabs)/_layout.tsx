import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Icone come emoji: nessuna dipendenza da un font di icone finché non serve davvero.
 * Se in seguito vorremo icone vettoriali, si sostituisce solo questo componente.
 */
function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={[styles.icon, { opacity: focused ? 1 : 0.5 }]}>{icon}</Text>;
}

export default function TabsLayout() {
  const { colors, fontSize, fontWeight } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
      }}
    >
      {/* Per primo, perché l'ordine dei tab è l'ordine di dichiarazione. Non è una
          schermata ma uno stack: elenco dei gruppi → gruppo aperto. */}
      <Tabs.Screen
        name="(gruppi)"
        options={{
          title: 'Gruppi',
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Statistiche',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Impostazioni',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 22 },
});
