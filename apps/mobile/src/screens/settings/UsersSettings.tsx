import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { User, UserRole } from "@fleettrack/shared-types";
import { createUser, deleteUser, getUsers, updateUser } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors } from "../../theme/colors";

const ROLES: UserRole[] = ["admin", "fleet_manager", "driver", "viewer"];

export function UsersSettings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getUsers().then(setUsers);
  }

  useEffect(refresh, []);

  async function handleCreate() {
    setError(null);
    try {
      await createUser({ name, email, password, role });
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("viewer");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Users & Roles</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={16} color={colors.foreground} />
          <Text style={styles.addButtonText}>Add user</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.card}>
          <Text style={styles.title}>New user</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 chars)"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.row}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleCreate}>
              <Text style={styles.saveText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {users.map((u) => (
        <View key={u.id} style={styles.userCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{u.name}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
          </View>
          <View style={styles.row}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                disabled={u.id === currentUser?.id}
                style={[styles.roleChip, u.role === r && styles.chipActive]}
                onPress={() => updateUser(u.id, { role: r }).then(refresh)}
              >
                <Text style={[styles.chipText, u.role === r && styles.chipTextActive]}>{r.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity disabled={u.id === currentUser?.id} onPress={() => deleteUser(u.id).then(refresh)}>
              <Ionicons name="trash" size={16} color={u.id === currentUser?.id ? colors.border : colors.statusStopped} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  addButtonText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  title: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  input: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 10, color: colors.foreground },
  row: { flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  roleChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 10 },
  chipTextActive: { color: colors.primary },
  error: { color: colors.statusStopped, fontSize: 11 },
  formActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelButton: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8 },
  cancelText: { color: colors.foreground, fontSize: 12 },
  saveButton: { flex: 1, alignItems: "center", backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8 },
  saveText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  userName: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  userEmail: { color: colors.muted, fontSize: 11 },
});
