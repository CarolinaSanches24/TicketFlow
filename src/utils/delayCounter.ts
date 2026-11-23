// Utility to calculate days in delay/open from the moment of opening (opened_at or created_at)

export function calculateDaysElapsed(openedAt?: string | null, createdAt?: string | null): number {
  const dateStr = openedAt || createdAt;
  if (!dateStr) return 0;

  // Handle YYYY-MM-DD or full ISO strings
  const d = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
  if (isNaN(d.getTime())) return 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfOpened = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffTime = startOfToday - startOfOpened;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isItemClosed(status?: string | null): boolean {
  if (!status) return false;
  const upper = status.toUpperCase();
  return ['RESOLVED', 'FINISHED', 'CANCELED', 'CONVERTED_TO_DEBT', 'CONVERTED_TO_IMPROVEMENT'].includes(upper);
}

export interface DelayStatusInfo {
  days: number;
  label: string;
  badgeClass: string;
  isDelayed: boolean;
  isCritical: boolean;
}

export function getDelayStatus(openedAt?: string | null, createdAt?: string | null, status?: string | null): DelayStatusInfo {
  const days = calculateDaysElapsed(openedAt, createdAt);
  const closed = isItemClosed(status);

  if (closed) {
    return {
      days,
      label: 'Resolvido',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      isDelayed: false,
      isCritical: false,
    };
  }

  if (days === 0) {
    return {
      days: 0,
      label: 'Hoje (0d)',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isDelayed: false,
      isCritical: false,
    };
  }

  if (days <= 5) {
    return {
      days,
      label: `${days} ${days === 1 ? 'dia' : 'dias'}`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      isDelayed: false,
      isCritical: false,
    };
  }

  if (days <= 15) {
    return {
      days,
      label: `${days} dias em atraso`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
      isDelayed: true,
      isCritical: false,
    };
  }

  return {
    days,
    label: `${days} dias em atraso`,
    badgeClass: 'bg-red-50 text-red-700 border-red-300 font-bold',
    isDelayed: true,
    isCritical: true,
  };
}

export interface DelayMetrics {
  total: number;
  openCount: number;
  resolvedCount: number;
  delayedCount: number;
  criticalDelayedCount: number;
  avgDelayDays: number;
  maxDelayDays: number;
}

export function getDelayMetrics(items: any[]): DelayMetrics {
  let openCount = 0;
  let resolvedCount = 0;
  let delayedCount = 0;
  let criticalDelayedCount = 0;
  let totalOpenDays = 0;
  let maxDelayDays = 0;

  items.forEach((item) => {
    const closed = isItemClosed(item.status);
    if (closed) {
      resolvedCount++;
    } else {
      openCount++;
      const days = calculateDaysElapsed(item.opened_at, item.created_at);
      totalOpenDays += days;
      if (days > 0) {
        delayedCount++;
      }
      if (days > 15) {
        criticalDelayedCount++;
      }
      if (days > maxDelayDays) {
        maxDelayDays = days;
      }
    }
  });

  const avgDelayDays = openCount > 0 ? Number((totalOpenDays / openCount).toFixed(1)) : 0;

  return {
    total: items.length,
    openCount,
    resolvedCount,
    delayedCount,
    criticalDelayedCount,
    avgDelayDays,
    maxDelayDays,
  };
}
