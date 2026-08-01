import { router } from 'expo-router';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { useVaultStore } from '@/state';

export default function NewExpenseScreen() {
  const store = useVaultStore();

  const handleSubmit = (values: ExpenseFormValues): void => {
    store.addExpense({
      amountCents: values.amountCents,
      date: values.date,
      categoryId: values.categoryId,
      note: values.note,
      paidBy: values.paidBy,
      split: values.split,
    });

    router.back();
  };

  return (
    <ModalScreen title="Nuova spesa">
      <ExpenseForm onSubmit={handleSubmit} submitLabel="Salva" />
    </ModalScreen>
  );
}
