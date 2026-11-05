import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { API_URL } from '@/auth/config';
import { getAccessToken } from '@/auth/session';

export type ReportResult<T> = {
  name: string;
  rows: T[];
  totals: Record<string, string>;
};

export type ProfitReportRow = {
  branchName: string;
  saleCount: number;
  totalSales: string;
  transferValue: string;
  branchProfit: string;
  profitPercent: string;
};

export type SalesReportRow = {
  reference: string;
  saleDate: string;
  branchName: string;
  totalSales: string;
  transferValue: string;
  branchProfit: string;
  profitPercent: string;
};

export type DistributionReportRow = {
  reference: string;
  distributionDate: string;
  branchName: string;
  status: string;
  weightKg: string;
  cost: string;
  transferValue: string;
  ourMargin: string;
  expenseAmount: string;
};

export type ProcurementReportRow = {
  reference: string;
  procurementDate: string;
  supplierName: string;
  itemCount: number;
  paidWeightKg: string;
  purchaseValue: string;
  commissionAmount: string;
  expenseAmount: string;
  totalCost: string;
  landedCostPerKg: string;
};

export type StockReportRow = {
  batchId: string;
  chickenTypeName: string;
  receivedDate: string;
  ageDays: number;
  receivedWeightKg: string;
  remainingWeightKg: string;
  landedCostPerKg: string;
  stockValue: string;
};

export type ShrinkageReportRow = {
  movementDate: string;
  chickenTypeName: string;
  branchName: string;
  weightKg: string;
  reason: string;
  referenceType: string;
  referenceId: string;
};

export type SettlementReportRow = {
  settlementId: string;
  settlementDate: string;
  branchName: string;
  method: string;
  reference: string;
  amount: string;
  allocationCount: number;
};

const keys = {
  report: (name: string, from: string, to: string) => ['reports', name, from, to] as const,
};

type Range = { from: string; to: string };

function reportQuery<T>(name: string, range: Range) {
  return {
    queryKey: keys.report(name, range.from, range.to),
    queryFn: () =>
      api<ReportResult<T>>('GET', `/api/v1/reports/${name}`, {
        query: { from: range.from, to: range.to },
      }),
  };
}

export function useProfitReport(range: Range) {
  return useQuery(reportQuery<ProfitReportRow>('profit', range));
}

/** Downloads a report as CSV or PDF, straight from the backend's export endpoint. */
export async function downloadReport(name: string, format: 'csv' | 'pdf', range: Range): Promise<Uint8Array> {
  const query = new URLSearchParams({ format, from: range.from, to: range.to });
  const res = await fetch(`${API_URL}/api/v1/reports/${name}/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  if (!res.ok) throw new Error('Could not export this report');
  return new Uint8Array(await res.arrayBuffer());
}
