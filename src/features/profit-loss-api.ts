import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { ProfitLoss } from '@/api/types';
import { getAccessToken } from '@/auth/session';
import { API_URL } from '@/auth/config';
import { formatIsoDate, formatShortDate } from '@/lib/format';

export type PLPeriod = 'daily' | 'monthly' | 'yearly' | 'custom';
export type PLGroupBy = 'none' | 'day' | 'month' | 'year';

export type PLParams = {
  period: PLPeriod;
  date?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  groupBy?: PLGroupBy;
  branchId?: string;
};

function query(p: PLParams): Record<string, string> {
  const q: Record<string, string> = { period: p.period };
  for (const k of ['date', 'month', 'year', 'from', 'to', 'groupBy', 'branchId'] as const) {
    const v = p[k];
    if (v) q[k] = v;
  }
  return q;
}

export function useProfitLoss(p: PLParams) {
  return useQuery({
    queryKey: ['profit-loss', query(p)],
    queryFn: () => api<ProfitLoss>('GET', '/api/v1/reports/profit-loss', { query: query(p) }),
  });
}

export async function downloadProfitLoss(p: PLParams, format: 'csv' | 'pdf'): Promise<Uint8Array> {
  const params = new URLSearchParams({ ...query(p), format });
  const res = await fetch(`${API_URL}/api/v1/reports/profit-loss/export?${params.toString()}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  if (!res.ok) throw new Error('Could not export profit and loss');
  return new Uint8Array(await res.arrayBuffer());
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthName(isoMonth: string) {
  const [y, m] = isoMonth.split('-').map(Number);
  return `${MONTHS[m! - 1]} ${y}`;
}

export function periodLabel(r: Pick<ProfitLoss, 'period' | 'from' | 'to'>) {
  if (r.period === 'DAILY') return formatIsoDate(r.from);
  if (r.period === 'MONTHLY') return monthName(r.from.slice(0, 7));
  if (r.period === 'YEARLY') return r.from.slice(0, 4);
  return `${formatShortDate(r.from)} – ${formatShortDate(r.to)}`;
}
