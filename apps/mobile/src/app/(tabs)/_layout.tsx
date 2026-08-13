import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
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

/**
 * `useTranslation` qui e non solo dentro le schermate: la tab bar è l'unica cosa che si vede
 * da ogni schermata, quindi è la prova che il cambio di lingua **esce** da dove lo si è
 * toccato. Le tre etichette sono anche le uniche stringhe che lo Step 37 traduce fuori da
 * `tu.tsx`.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
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
          title: t('tabs.groups'),
          tabBarIcon: ({ color }) => <TabIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.charts'),
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart-2" color={color} />,
        }}
      />
      {/* Per ultimo, come vuole la convenzione: è il tab di «chi sono io», non un
          contenuto. Sta fuori dai gruppi perché il profilo è uno solo e li attraversa
          tutti — è il `profileId` a rendermi la stessa persona in ognuno. Assorbe le
          impostazioni dell'app (redesign, passo 4): sincronizzazione e diagnostica non
          appartengono a un gruppo più di quanto appartengano a me. */}
      <Tabs.Screen
        name="tu"
        options={{
          title: t('tabs.you'),
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
      {/* Non più un tab: `href: null` lo toglie dalla tab bar senza rimuovere la rotta,
          che resta un semplice redirect verso `/tu` per chi la ritrova come stato di
          navigazione salvato da prima dell'aggiornamento. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
