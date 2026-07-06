import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { VehiclesSettings } from "@/components/settings/VehiclesSettings";
import { DriversSettings } from "@/components/settings/DriversSettings";
import { GeofencesSettings } from "@/components/settings/GeofencesSettings";
import { ThresholdsSettings } from "@/components/settings/ThresholdsSettings";
import { UsersSettings } from "@/components/settings/UsersSettings";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";

type SettingsTab =
  | "vehicles"
  | "drivers"
  | "geofences"
  | "thresholds"
  | "users"
  | "notifications"
  | "preferences"
  | "account";

export function SettingsPage() {
  const { user } = useAuth();
  const canManageFleet = user?.role === "admin" || user?.role === "fleet_manager";
  const isAdmin = user?.role === "admin";

  const tabs: { value: SettingsTab; label: string }[] = [
    ...(canManageFleet
      ? ([
          { value: "vehicles", label: "Vehicles" },
          { value: "drivers", label: "Drivers" },
          { value: "geofences", label: "Geofences" },
          { value: "thresholds", label: "Thresholds" },
        ] as const)
      : []),
    ...(isAdmin ? ([{ value: "users", label: "Users" }] as const) : []),
    { value: "notifications", label: "Notifications" },
    { value: "preferences", label: "Preferences" },
    { value: "account", label: "Account" },
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>(tabs[0]?.value ?? "account");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "shrink-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-medium text-muted",
              activeTab === value && "border-primary text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "vehicles" && <VehiclesSettings />}
        {activeTab === "drivers" && <DriversSettings />}
        {activeTab === "geofences" && <GeofencesSettings />}
        {activeTab === "thresholds" && <ThresholdsSettings />}
        {activeTab === "users" && <UsersSettings />}
        {activeTab === "notifications" && <NotificationsSettings />}
        {activeTab === "preferences" && <PreferencesSettings />}
        {activeTab === "account" && <AccountSettings />}
      </div>
    </div>
  );
}
