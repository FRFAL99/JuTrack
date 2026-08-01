import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function ExpensesScreen() {
  return (
    <Screen title="Spese">
      <EmptyState
        icon="🧾"
        title="Nessuna spesa"
        hint="Le spese registrate compariranno qui, raggruppate per giorno."
      />
    </Screen>
  );
}
