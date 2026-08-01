import { router } from 'expo-router';
import { buildSplit } from '@jutrack/core';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { useMembers, useVaultStore } from '@/state';

export default function NewExpenseScreen() {
  const store = useVaultStore();
  const members = useMembers();

  const handleSubmit = (values: ExpenseFormValues): void => {
    const participants = values.splitEqually ? members.map((m) => m.id) : [values.paidBy];

    store.addExpense({
      amountCents: values.amountCents,
      date: values.date,
      categoryId: values.categoryId,
      note: values.note,
      paidBy: values.paidBy,
      split: buildSplit(
        values.splitEqually && participants.length > 1 ? 'equal' : 'single',
        values.amountCents,
        participants,
      ),
    });

    router.back();
  };

  return (
    <ModalScreen title="Nuova spesa">
      <ExpenseForm onSubmit={handleSubmit} submitLabel="Salva" />
    </ModalScreen>
  );
}
