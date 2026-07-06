import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { User, UserRole } from "@fleettrack/shared-types";
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  async function handleRoleChange(id: string, newRole: UserRole) {
    await updateUser(id, { role: newRole });
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteUser(id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Users & Roles</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New user</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              placeholder="Password (min 8 characters)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-status-stopped">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreate}>
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <Card key={u.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm text-foreground">{u.name}</p>
              <p className="text-xs text-muted">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                disabled={u.id === currentUser?.id}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDelete(u.id)}
                disabled={u.id === currentUser?.id}
                className="p-1.5 text-muted hover:text-status-stopped disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
