import { cn } from "@/lib/utils";

export type SubTab = "live" | "analytics" | "report" | "history" | "alerts";

const TABS: { value: SubTab; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "analytics", label: "Analytics" },
  { value: "report", label: "Report" },
  { value: "history", label: "History" },
  { value: "alerts", label: "Alerts" },
];

export function VehicleSubTabs({ active, onChange }: { active: SubTab; onChange: (tab: SubTab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2">
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "shrink-0 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted",
            active === value && "border-primary text-primary",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
