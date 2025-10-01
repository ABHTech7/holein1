// UK Timezone utilities for consistent date handling

const UK_TIMEZONE = 'Europe/London';

/**
 * Get current date/time in UK timezone
 */
export function getUKNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: UK_TIMEZONE }));
}

/**
 * Get date in UK timezone from any date
 */
export function toUKDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.toLocaleString('en-US', { timeZone: UK_TIMEZONE }));
}

/**
 * Format date for UK timezone display
 */
export function formatUKDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: UK_TIMEZONE
  }).format(d);
}

/**
 * Get start and end of month in UK timezone
 * Returns ISO date strings (YYYY-MM-DD)
 */
export function getUKMonthBoundaries(year: number, month: number): { start: string; end: string } {
  // Create dates in UK timezone
  const startDate = new Date(
    new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`).toLocaleString('en-US', { timeZone: UK_TIMEZONE })
  );
  
  // Last day of month
  const endDate = new Date(
    new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`).toLocaleString('en-US', { timeZone: UK_TIMEZONE })
  );
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * Get current month in UK timezone
 */
export function getUKCurrentMonth(): { year: number; month: number } {
  const ukNow = getUKNow();
  return {
    year: ukNow.getFullYear(),
    month: ukNow.getMonth() + 1 // 1-indexed
  };
}

/**
 * Get previous month in UK timezone
 */
export function getUKPreviousMonth(): { year: number; month: number } {
  const ukNow = getUKNow();
  const year = ukNow.getMonth() === 0 ? ukNow.getFullYear() - 1 : ukNow.getFullYear();
  const month = ukNow.getMonth() === 0 ? 12 : ukNow.getMonth();
  return { year, month };
}

/**
 * Get start of current month in UK timezone
 * Use this for client-side MTD filtering when RPC isn't available
 */
export function getUKMonthStart(): Date {
  const ukNow = getUKNow();
  return new Date(
    new Date(`${ukNow.getFullYear()}-${String(ukNow.getMonth() + 1).padStart(2, '0')}-01T00:00:00`)
      .toLocaleString('en-US', { timeZone: UK_TIMEZONE })
  );
}

/**
 * Get start of current year in UK timezone
 * Use this for client-side YTD filtering when RPC isn't available
 */
export function getUKYearStart(): Date {
  const ukNow = getUKNow();
  return new Date(
    new Date(`${ukNow.getFullYear()}-01-01T00:00:00`)
      .toLocaleString('en-US', { timeZone: UK_TIMEZONE })
  );
}
