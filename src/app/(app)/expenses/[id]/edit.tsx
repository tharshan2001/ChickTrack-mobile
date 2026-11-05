import { router, useLocalSearchParams } from 'expo-router';

import type { OperatingExpense } from '@/api/types';
import { EditLoader } from '@/components/form';
import { ExpenseForm } from '@/features/expense-form';
import { useExpense, useUpdateExpense } from '@/features/expenses-api';

export default function EditExpenseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Edit expense" query={useExpense(id)}>{(e) => <EditExpense e={e} />}</EditLoader>;
}

function EditExpense({ e }: { e: OperatingExpense }) {
  const update = useUpdateExpense(e.id);
  return <ExpenseForm title="Edit expense" submitTitle="Save changes" initial={e} save={update} onSaved={() => router.back()} />;
}
