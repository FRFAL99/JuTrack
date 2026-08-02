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
          title: 'Grafici',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      {/* Le impostazioni sono dell'**app**, non di un gruppo: da questo step non
          contengono più nulla che appartenga a un gruppo (categorie, backup, export sono
          nella sua gestione) né al profilo, che ha un tab suo. È anche l'unico tab che
          dallo Step 21 dovrà funzionare senza alcun gruppo aperto. */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Impostazioni',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
      {/* Per ultimo, come vuole la convenzione: è il tab di «chi sono io», non un
          contenuto. Sta fuori dai gruppi perché il profilo è uno solo e li attraversa
          tutti — è il `profileId` a rendermi la stessa persona in ognuno. */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ focused }) => <TabIcon icon="🙂" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 22 },
});
