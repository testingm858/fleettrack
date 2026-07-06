import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ALERT_TYPES, type NotificationChannel, type NotificationPreferences } from "@fleettrack/shared-types";
import { getPreferences, updatePreferences } from "../../lib/api";
import { ALERT_TYPE_CONFIG } from "../../lib/alertTypes";
import { colors } from "../../theme/colors";

const CHANNELS: NotificationChannel[] = ["push", "sms", "email"];

export function NotificationsSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    getPreferences().then((p) => setPrefs(p.notifications));
  }, []);

  async function toggle(type: keyof NotificationPreferences, channel: NotificationChannel) {
    if (!prefs) return;
    const next = { ...prefs, [type]: { ...prefs[type], [channel]: !prefs[type][channel] } };
    setPrefs(next);
    await updatePreferences({ notifications: next });
  }

  if (!prefs) return <Text style={styles.message}>Loading preferences…</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Notification Preferences</Text>
      <Text style={styles.subtitle}>Push is wired to delivery; SMS/email are saved but not yet connected.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.typeCell, styles.headerText]}>Alert type</Text>
            {CHANNELS.map((c) => (
              <Text key={c} style={[styles.cell, styles.headerText]}>
                {c}
              </Text>
            ))}
          </View>
          {ALERT_TYPES.map((type) => (
            <View key={type} style={styles.row}>
              <Text style={[styles.cell, styles.typeCell, styles.typeText]}>{ALERT_TYPE_CONFIG[type].label}</Text>
              {CHANNELS.map((channel) => (
                <TouchableOpacity key={channel} style={styles.cell} onPress={() => toggle(type, channel)}>
                  <Ionicons
                    name={prefs[type][channel] ? "checkbox" : "square-outline"}
                    size={18}
                    color={prefs[type][channel] ? colors.primary : colors.muted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, marginBottom: 10 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 6 },
  headerText: { color: colors.muted, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  cell: { width: 70, alignItems: "center" },
  typeCell: { width: 160, alignItems: "flex-start" },
  typeText: { color: colors.foreground, fontSize: 13 },
  message: { color: colors.muted, textAlign: "center", marginTop: 16 },
});
