import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import { colors } from "../theme/colors";
import { VehiclesSettings } from "./settings/VehiclesSettings";
import { DriversSettings } from "./settings/DriversSettings";
import { GeofencesSettings } from "./settings/GeofencesSettings";
import { ThresholdsSettings } from "./settings/ThresholdsSettings";
import { UsersSettings } from "./settings/UsersSettings";
import { NotificationsSettings } from "./settings/NotificationsSettings";
import { PreferencesSettings } from "./settings/PreferencesSettings";
import { AccountSettings } from "./settings/AccountSettings";

type SettingsTab = "vehicles" | "drivers" | "geofences" | "thresholds" | "users" | "notifications" | "preferences" | "account";

export function SettingsScreen() {
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
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {tabs.map(({ value, label }) => (
          <TouchableOpacity key={value} onPress={() => setActiveTab(value)} style={styles.tabButton}>
            <Text style={[styles.tabText, activeTab === value && styles.tabTextActive]}>{label}</Text>
            {activeTab === value && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "vehicles" && <VehiclesSettings />}
        {activeTab === "drivers" && <DriversSettings />}
        {activeTab === "geofences" && <GeofencesSettings />}
        {activeTab === "thresholds" && <ThresholdsSettings />}
        {activeTab === "users" && <UsersSettings />}
        {activeTab === "notifications" && <NotificationsSettings />}
        {activeTab === "preferences" && <PreferencesSettings />}
        {activeTab === "account" && <AccountSettings />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabButton: { paddingHorizontal: 10, paddingVertical: 12, alignItems: "center" },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  tabTextActive: { color: colors.primary },
  tabIndicator: { height: 2, backgroundColor: colors.primary, width: "100%", marginTop: 6, borderRadius: 1 },
  content: { padding: 16, gap: 12 },
});
