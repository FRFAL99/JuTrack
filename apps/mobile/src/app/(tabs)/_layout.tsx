import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';

type FeatherName = ComponentProps<typeof Feather>['name'];

/**
 * L'icona prende il `color` che la tab bar le passa, che è già
 * `tabBarActiveTintColor`/`tabBarInactiveTintColor`: le emoji di prima non potevano essere
 * colorate e distinguevano il tab a fuoco per opacità, che è un segnale più debole.
 */
function TabIcon({ name, color }: { name: FeatherName; color: ColorValue }) {
  return <Feather name={name} size={22} color={color} />;
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
          tabBarIcon: ({ color }) => <TabIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Grafici',
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart-2" color={color} />,
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
          tabBarIcon: ({ color }) => <TabIcon name="sliders" color={color} />,
        }}
      />
      {/* Per ultimo, come vuole la convenzione: è il tab di «chi sono io», non un
          contenuto. Sta fuori dai gruppi perché il profilo è uno solo e li attraversa
          tutti — è il `profileId` a rendermi la stessa persona in ognuno. */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
