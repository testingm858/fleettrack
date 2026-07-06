import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountSettings() {
  const { user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    getHealth()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {user && (
          <div>
            <p className="text-sm text-foreground">{user.name}</p>
            <p className="text-xs text-muted">
              {user.email} · {user.role}
            </p>
          </div>
        )}
        <p className="text-xs text-muted">
          Backend connection:{" "}
          <span
            className={
              backendStatus === "online"
                ? "text-status-running"
                : backendStatus === "offline"
                  ? "text-status-stopped"
                  : "text-status-idle"
            }
          >
            {backendStatus}
          </span>
        </p>
        <Button variant="outline" size="sm" className="w-fit" onClick={logout}>
          Log out
        </Button>
      </CardContent>
    </Card>
  );
}
