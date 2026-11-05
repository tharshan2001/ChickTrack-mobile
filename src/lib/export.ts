import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { downloadReport } from '@/features/reports-api';

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
