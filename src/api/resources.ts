import { createCrud } from '@/api/crud';
import type {
  Branch,
  BranchCreateInput,
  BranchUpdateInput,
  ChickenType,
  ChickenTypeInput,
  ExpenseCategory,
  ExpenseCategoryInput,
  Supplier,
  SupplierInput,
} from '@/api/types';

export const products = createCrud<ChickenType, ChickenTypeInput>('/api/v1/chicken-types');
export const suppliers = createCrud<Supplier, SupplierInput>('/api/v1/suppliers');
export const branches = createCrud<Branch, BranchCreateInput, BranchUpdateInput>('/api/v1/branches');
export const expenseCategories = createCrud<ExpenseCategory, ExpenseCategoryInput>('/api/v1/expense-categories');
