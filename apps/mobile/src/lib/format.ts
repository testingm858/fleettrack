export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.round(diffHour / 24)}d ago`;
}

export function batteryColor(pct: number, colors: { statusStopped: string; statusIdle: string; statusRunning: string }): string {
  if (pct < 20) return colors.statusStopped;
  if (pct < 50) return colors.statusIdle;
  return colors.statusRunning;
}
