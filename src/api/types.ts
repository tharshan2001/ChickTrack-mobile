/** Mirrors identity/dto/UserResponse. */
export type User = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  roles: string[];
  branchIds: string[];
  version: number;
  createdAt: string;
};

type Audited = { version: number; createdAt: string; updatedAt: string };

/** Mirrors chicken/dto/ChickenTypeResponse. Shown in the app as a "Product". */
export type ChickenType = Audited & {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};
export type ChickenTypeInput = { name: string; description: string | null };

/** Mirrors supplier/dto/SupplierResponse. */
export type Supplier = Audited & {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string | null;
  active: boolean;
};
export type SupplierInput = {
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string | null;
};

/** Mirrors branch/dto/BranchResponse. The code is set on create and never changes. */
export type Branch = Audited & {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
};
export type BranchCreateInput = { code: string; name: string; address: string | null; phone: string | null };
export type BranchUpdateInput = Omit<BranchCreateInput, 'code'>;

/** Mirrors expense/dto/ExpenseCategoryResponse. */
export type ExpenseCategory = ChickenType;
export type ExpenseCategoryInput = ChickenTypeInput;

/** Mirrors pricing/dto/DailyPriceResponse. Amounts are decimal strings. */
export type DailyPrice = {
  id: string;
  chickenTypeId: string;
  branchId: string | null;
  supplierId: string | null;
  purchasePricePerKg: string;
  sellingPricePerKg: string;
  effectiveFrom: string;
  createdAt: string;
};
export type DailyPriceInput = {
  chickenTypeId: string;
  branchId: string | null;
  supplierId: string | null;
  purchasePricePerKg: string;
  sellingPricePerKg: string;
  effectiveFrom: string;
};

/** Mirrors margin/dto/CompanyMarginRuleResponse. */
export type MarginRule = {
  id: string;
  chickenTypeId: string;
  branchId: string | null;
  markupPercent: string;
  effectiveFrom: string;
  createdAt: string;
};
export type MarginRuleInput = {
  chickenTypeId: string;
  branchId: string | null;
  markupPercent: string;
  effectiveFrom: string;
};
