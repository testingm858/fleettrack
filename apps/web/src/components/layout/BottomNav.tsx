import { NavLink } from "react-router-dom";
import { List, Map, LayoutDashboard, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/status", label: "Status", icon: List },
  { to: "/map", label: "Map", icon: Map },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs text-muted transition-colors",
                  isActive && "text-primary",
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
