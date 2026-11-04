import { useState } from 'react';

import { DateField } from '@/components/date-field';
import { Segmented } from '@/components/pickers';
import { colomboDayStart, toIsoDate } from '@/lib/format';

/** "Starts: Now | Pick date". Returns a function giving the effectiveFrom instant to send. */
export function useStarts() {
  const [mode, setMode] = useState<'now' | 'date'>('now');
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const valid = mode === 'now' || /^\d{4}-\d{2}-\d{2}$/.test(date);
  return {
    mode,
    setMode,
    date,
    setDate,
    valid,
    effectiveFrom: () => (mode === 'now' ? new Date().toISOString() : colomboDayStart(date)),
  };
}

export function StartsField({ starts }: { starts: ReturnType<typeof useStarts> }) {
  return (
    <>
      <Segmented
        label="Starts"
        value={starts.mode}
        onChange={starts.setMode}
        options={[
          { value: 'now', label: 'Now' },
          { value: 'date', label: 'Pick date' },
        ]}
      />
      {starts.mode === 'date' ? <DateField label="Start date" value={starts.date} onChange={starts.setDate} /> : null}
    </>
  );
}
