import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function StatsScreen() {
  return (
    <Screen title="Statistiche">
      <EmptyState
        icon="📊"
        title="Ancora nessun dato"
        hint="Andamento mensile, ripartizione per categoria e saldo tra di voi appariranno qui una volta registrate le prime spese."
      />
    </Screen>
  );
}
