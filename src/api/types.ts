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

// ---- stock ----

/** Mirrors inventory/dto/StockBatchResponse. available = remaining - reserved (held for draft dispatches). */
export type StockBatch = {
  id: string;
  chickenTypeId: string;
  chickenTypeName: string;
  procurementItemId: string | null;
  receivedWeightKg: string;
  remainingWeightKg: string;
  reservedWeightKg: string;
  availableWeightKg: string;
  landedCostPerKg: string;
  remainingValue: string;
  receivedAt: string;
  ageDays: number;
};

export type MovementType = 'RECEIPT' | 'DISTRIBUTION' | 'RETURN' | 'DAMAGE' | 'LOSS' | 'ADJUSTMENT' | 'REVERSAL';

/** Mirrors inventory/dto/InventoryMovementResponse. weightKg is always positive; the type gives the direction. */
export type InventoryMovement = {
  id: string;
  stockBatchId: string;
  chickenTypeId: string;
  type: MovementType;
  weightKg: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdAt: string;
};

export type AdjustmentType = 'DAMAGE' | 'LOSS' | 'RETURN' | 'ADJUSTMENT';

/** Mirrors inventory/dto/StockAdjustmentResponse. weightChangeKg is signed. */
export type StockAdjustment = {
  id: string;
  reference: string;
  stockBatchId: string;
  type: AdjustmentType;
  weightChangeKg: string;
  remainingWeightKg: string;
  reason: string;
  createdAt: string;
};

export type StockAdjustmentInput = {
  stockBatchId: string;
  type: AdjustmentType;
  weightKg: string;
  direction: 'INCREASE' | 'DECREASE' | null;
  reason: string;
};

// ---- procurement ----

export type CommissionMethod = 'FIXED' | 'PER_KG' | 'PERCENTAGE' | 'PER_BIRD';

export type ProcurementItemInput = {
  chickenTypeId: string;
  paidWeightKg: string;
  purchasePricePerKg: string;
  commissionMethod: CommissionMethod;
  commissionValue: string | null;
  quantity: number | null;
};

export type ProcurementExpenseInput = { categoryId: string | null; description: string | null; amount: string };

export type ProcurementInput = {
  supplierId: string;
  /** yyyy-mm-dd */
  procurementDate: string;
  notes: string | null;
  items: ProcurementItemInput[];
  expenses: ProcurementExpenseInput[];
};

export type ProcurementItem = {
  id: string;
  chickenTypeId: string;
  paidWeightKg: string;
  purchasePricePerKg: string;
  commissionMethod: CommissionMethod;
  commissionValue: string | null;
  quantity: number | null;
  purchaseValue: string;
  commissionAmount: string;
  allocatedExpenseAmount: string;
  totalCost: string;
  receivedWeightKg: string;
  landedCostPerKg: string;
};

export type Procurement = {
  id: string;
  reference: string;
  supplierId: string;
  procurementDate: string;
  status: string;
  purchaseValue: string;
  commissionAmount: string;
  expenseAmount: string;
  totalCost: string;
  paidWeightKg: string;
  receivedWeightKg: string;
  landedCostPerKg: string;
  notes: string | null;
  reversalReason: string | null;
  items: ProcurementItem[];
  expenses: { id: string; categoryId: string | null; description: string | null; amount: string }[];
  createdAt: string;
  updatedAt: string;
};
