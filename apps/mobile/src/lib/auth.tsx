import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@fleettrack/shared-types";
import { login as apiLogin } from "./api";
import { getAuth, loadAuth, setAuth, subscribeAuth } from "./tokenStore";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getAuth()?.user ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAuth().then((auth) => {
      if (!cancelled) {
        setUser(auth?.user ?? null);
        setIsLoading(false);
      }
    });
    const unsubscribe = subscribeAuth((auth) => setUser(auth?.user ?? null));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await apiLogin({ email, password });
    setAuth(response);
  }

  function logout() {
    setAuth(null);
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
