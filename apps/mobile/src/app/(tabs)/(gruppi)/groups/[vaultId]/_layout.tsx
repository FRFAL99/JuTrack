import { useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * Entrare in questo stack **rende corrente il gruppo** dell'URL.
 *
 * La guardia sta nel layout e non nelle schermate: gira una volta per gruppo invece che
 * una per schermata, e le spese (`index`) e la gestione (`manage`) la ereditano senza
 * ripeterla. È anche il punto in cui il runtime del vault si sposta, quindi le schermate
 * sotto possono leggere lo store dando per scontato che sia quello giusto.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function GroupLayout() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ vaultId?: string }>();
  const vaultId = Array.isArray(params.vaultId) ? params.vaultId[0] : params.vaultId;
  const { current, groups, select } = useGroups();
  const stillExists = groups.some((group) => group.vaultId === vaultId);

  // Il cambio di gruppo smonta e rimonta il runtime: finché non è finito, i dati sotto
  // sono ancora quelli del gruppo di prima e mostrarli sarebbe una bugia.
  //
  // `stillExists` copre il caso in cui il gruppo di questa rotta sia stato appena
  // abbandonato o rigenerato: il corrente è già un altro, e senza il controllo questo
  // layout chiederebbe di tornare su un gruppo che non c'è più.
  useEffect(() => {
    if (vaultId !== undefined && stillExists && vaultId !== current.vaultId) void select(vaultId);
  }, [current.vaultId, select, stillExists, vaultId]);

  if (vaultId === undefined || vaultId !== current.vaultId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
