import { expenseCategories } from '@/api/resources';
import { expenseCategoryCopy } from '@/features/copy';
import { EditSimpleEntity } from '@/features/simple-entity';

export default function EditExpenseCategory() {
  return <EditSimpleEntity crud={expenseCategories} copy={expenseCategoryCopy} />;
}
