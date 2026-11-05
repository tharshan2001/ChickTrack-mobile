import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { downloadReport } from '@/features/reports-api';
import { downloadProfitLoss, type PLParams } from '@/features/profit-loss-api';

/** Saves an exported report to the cache and opens the share sheet. */
export async function exportReport(name: string, format: 'csv' | 'pdf', range: { from: string; to: string }) {
  const bytes = await downloadReport(name, format, range);
  const file = new File(Paths.cache, `${name}-${range.from}-to-${range.to}.${format}`);
  await file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: `${name} report`,
      mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
      UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
    });
  }
}

export async function exportProfitLoss(params: PLParams, format: 'csv' | 'pdf', range: { from: string; to: string }) {
  const bytes = await downloadProfitLoss(params, format);
  const file = new File(Paths.cache, `profit-loss-${range.from}-to-${range.to}.${format}`);
  await file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Profit and loss',
      mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
      UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
    });
  }
}
