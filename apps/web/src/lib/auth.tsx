import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@fleettrack/shared-types";
import { login as apiLogin } from "./api";
import { getAuth, setAuth, subscribeAuth } from "./tokenStore";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getAuth()?.user ?? null);

  useEffect(() => subscribeAuth((auth) => setUser(auth?.user ?? null)), []);

  async function login(email: string, password: string) {
    const response = await apiLogin({ email, password });
    setAuth(response);
  }

  function logout() {
    setAuth(null);
  }

  return <AuthContext.Provider value={{ user, isLoading: false, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
