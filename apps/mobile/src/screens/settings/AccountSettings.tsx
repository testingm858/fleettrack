import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getHealth } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors } from "../../theme/colors";

export function AccountSettings() {
  const { user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    getHealth()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const statusColor =
    backendStatus === "online" ? colors.statusRunning : backendStatus === "offline" ? colors.statusStopped : colors.statusIdle;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Account</Text>
      {user && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>
            {user.email} · {user.role}
          </Text>
        </View>
      )}
      <Text style={[styles.meta, { marginTop: 8 }]}>
        Backend connection: <Text style={{ color: statusColor }}>{backendStatus}</Text>
      </Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  name: { color: colors.foreground, fontSize: 13 },
  meta: { color: colors.muted, fontSize: 12 },
  logoutButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoutText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
});
