import { expenseCategories } from '@/api/resources';
import { expenseCategoryCopy } from '@/features/copy';
import { AddSimpleEntity } from '@/features/simple-entity';

export default function AddExpenseCategory() {
  return <AddSimpleEntity crud={expenseCategories} copy={expenseCategoryCopy} />;
}
