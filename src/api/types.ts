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

// ---- distribution ----

export type DistributionStatus = 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CLOSED' | 'REVERSED';

export type DistributionInput = {
  branchId: string;
  /** yyyy-mm-dd */
  distributionDate: string;
  notes: string | null;
  items: { chickenTypeId: string; weightKg: string }[];
  expenses: { categoryId: string | null; description: string | null; amount: string; allocationMethod: 'BY_WEIGHT' }[];
};

/** One line per stock batch the weight was taken from (oldest first). */
export type DistributionItem = {
  id: string;
  stockBatchId: string;
  chickenTypeId: string;
  weightKg: string;
  unitCost: string;
  ourMarginPerKg: string;
  distributionExpensePerKg: string;
  transferPricePerKg: string;
  lineCost: string;
  lineTransferValue: string;
};

export type DiscrepancyReason = 'MELT_WATER' | 'DAMAGE' | 'WEIGHT_DIFFERENCE' | 'SHORT_DELIVERY' | 'OTHER';

export type Distribution = {
  id: string;
  reference: string;
  branchId: string;
  distributionDate: string;
  status: DistributionStatus;
  totalWeightKg: string;
  totalCost: string;
  totalTransferValue: string;
  totalOurMargin: string;
  expenseAmount: string;
  notes: string | null;
  reversalReason: string | null;
  items: DistributionItem[];
  expenses: { id: string; categoryId: string | null; description: string | null; amount: string }[];
  receipts: {
    id: string;
    receivedAt: string;
    notes: string | null;
    items: {
      id: string;
      distributionItemId: string;
      receivedWeightKg: string;
      discrepancyWeightKg: string;
      discrepancyReason: DiscrepancyReason | null;
    }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

// ---- branch operations ----

export type BranchStock = { chickenTypeId: string; availableWeightKg: string };

export type BranchSaleItem = {
  id: string;
  chickenTypeId: string;
  weightKg: string;
  sellingPricePerKg: string;
  transferPricePerKg: string;
  revenue: string;
  cost: string;
  profit: string;
};

/** One record per branch per day; saving again for the same day replaces it. */
export type BranchSale = {
  id: string;
  reference: string;
  branchId: string;
  saleDate: string;
  totalSales: string;
  transferValue: string;
  branchProfit: string;
  notes: string | null;
  items: BranchSaleItem[];
  createdAt: string;
  updatedAt: string;
};

export type BranchSaleInput = {
  branchId: string;
  saleDate: string;
  notes: string | null;
  items: { chickenTypeId: string; weightKg: string }[];
};

// ---- money ----

export type PaymentMethod = 'CASH' | 'BANK' | 'CHEQUE';

/** Mirrors payment/dto/BranchSettlementResponse. */
export type Settlement = {
  id: string;
  branchId: string;
  settlementDate: string;
  amount: string;
  method: string;
  reference: string | null;
  notes: string | null;
  status: 'POSTED' | 'REVERSED' | string;
  reversalReason: string | null;
  allocations: { id: string; branchSaleId: string; amount: string }[];
  createdAt: string;
  updatedAt: string;
};

export type SettlementInput = {
  branchId: string;
  settlementDate: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  allocations: { branchSaleId: string; amount: string }[];
};

/** A branch sale not fully paid for yet (GET /branches/{id}/open-sales). */
export type OpenSale = {
  branchSaleId: string;
  reference: string;
  saleDate: string;
  transferValue: string;
  outstandingAmount: string;
};

/** Mirrors report/dto/DashboardResponse (amounts are decimal strings). */
export type Dashboard = {
  from: string;
  to: string;
  procurementValue: string;
  procurementWeightKg: string;
  stockWeightKg: string;
  stockValue: string;
  distributionWeightKg: string;
  distributionTransferValue: string;
  ourMargin: string;
  totalSales: string;
  branchProfit: string;
  branchOutstanding: string;
  shrinkageWeightKg: string;
};
