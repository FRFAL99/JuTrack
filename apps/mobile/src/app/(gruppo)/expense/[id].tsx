import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { useExpense, useVaultStore } from '@/state';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useVaultStore();
  const expense = useExpense(id);

  if (expense === null || expense.deletedAt !== null) {
    // Può succedere davvero: l'altro dispositivo può aver cancellato la spesa
    // mentre questa schermata era aperta.
    return (
      <ModalScreen title="Spesa">
        <EmptyState
          icon="🔍"
          title="Spesa non trovata"
          hint="Potrebbe essere stata eliminata dall'altro dispositivo."
        />
      </ModalScreen>
    );
  }

  const handleSubmit = (values: ExpenseFormValues): void => {
    store.updateExpense(expense.id, {
      amountCents: values.amountCents,
      categoryId: values.categoryId,
      note: values.note,
      store: values.store,
      tags: values.tags,
      paidBy: values.paidBy,
      // Lo split arriva sempre insieme all'importo: VaultStore rifiuta un aggiornamento
      // che lascerebbe le quote incoerenti col totale.
      split: values.split,
    });

    router.back();
  };

  const handleDelete = (): void => {
    Alert.alert('Eliminare la spesa?', 'L azione si applica anche sull altro dispositivo.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          store.deleteExpense(expense.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ModalScreen title="Modifica spesa" compact>
      <ExpenseForm
        initial={expense}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Salva le modifiche"
      />
    </ModalScreen>
  );
}
