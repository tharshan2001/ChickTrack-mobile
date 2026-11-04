import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, ApiError, type Page } from '@/api/client';
import type { DailyPrice, DailyPriceInput, MarginRule, MarginRuleInput } from '@/api/types';

const PRICES = '/api/v1/daily-prices';
const MARGINS = '/api/v1/company-margin-rules';

export const priceKeys = {
  current: (productId: string, branchId: string | null) => ['daily-prices', 'current', productId, branchId] as const,
  margins: (productId: string) => ['margin-rules', productId] as const,
};

/** Price in force now; null when none has been set (the API answers 404). */
async function fetchCurrent(productId: string, branchId: string | null): Promise<DailyPrice | null> {
  try {
    return await api<DailyPrice>('GET', `${PRICES}/current`, {
      query: { chickenTypeId: productId, branchId: branchId ?? undefined },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

const currentQuery = (productId: string, branchId: string | null) => ({
  queryKey: priceKeys.current(productId, branchId),
  queryFn: () => fetchCurrent(productId, branchId),
});

/** For one-off reads outside render (e.g. prefilling a form), shared with the query cache. */
export const currentPriceQuery = currentQuery;

export function useCurrentPrice(productId: string | null, branchId: string | null) {
  return useQuery({ ...currentQuery(productId ?? '', branchId), enabled: !!productId });
}

/**
 * Current prices for every product: the company-wide price (buying) and the
 * price in force at each branch (selling). A branch without its own price uses
 * the company-wide one, which is what the backend charges, so that is shown.
 */
export function useCurrentPriceGrid(productIds: string[], branchIds: string[]) {
  const pairs = productIds.flatMap((p) => [null, ...branchIds].map((b) => [p, b] as const));
  const results = useQueries({ queries: pairs.map(([p, b]) => currentQuery(p, b)) });
  const get = (p: string, b: string | null) => {
    const i = pairs.findIndex(([pp, bb]) => pp === p && bb === b);
    return i < 0 ? undefined : results[i];
  };
  return {
    get,
    isPending: results.some((r) => r.isPending),
    error: results.find((r) => r.error)?.error ?? null,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

/** Company-wide margin in force now for a product, from its rule history. */
export function currentMargin(rules: MarginRule[] | undefined, branchId: string | null = null): MarginRule | null {
  const now = Date.now();
  return (
    (rules ?? [])
      .filter((r) => r.branchId === branchId && Date.parse(r.effectiveFrom) <= now)
      .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0] ?? null
  );
}

const marginsQuery = (productId: string) => ({
  queryKey: priceKeys.margins(productId),
  queryFn: () =>
    api<Page<MarginRule>>('GET', MARGINS, { query: { chickenTypeId: productId, size: 200, sort: 'effectiveFrom,desc' } }).then(
      (p) => p.content,
    ),
});

export function useMarginRules(productId: string | null) {
  return useQuery({ ...marginsQuery(productId ?? ''), enabled: !!productId });
}

export function useMarginRulesFor(productIds: string[]) {
  const results = useQueries({ queries: productIds.map(marginsQuery) });
  return (productId: string) => results[productIds.indexOf(productId)];
}

export function useSetPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: DailyPriceInput; key: string }) =>
      api<DailyPrice>('POST', PRICES, { body: input, idempotencyKey: key }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-prices'] }),
  });
}

export function useSetMargin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: MarginRuleInput; key: string }) =>
      api<MarginRule>('POST', MARGINS, { body: input, idempotencyKey: key }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['margin-rules'] }),
  });
}
