"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "@/lib/axios";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  refresh: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await api.get("/user");
      const nextUser: AuthUser = {
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        roles: res.data.roles ?? [],
        permissions: res.data.permissions ?? [],
      };
      setUser(nextUser);
      return nextUser;
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // `refresh` is also exposed for imperative re-fetching (e.g. right after
    // login), so it can't be inlined as a plain .then()-only effect body —
    // its setState calls are still correctly gated behind the token check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // Token may already be invalid server-side — clearing local state below
      // is what actually signs the user out on this device either way.
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: hasRole("admin"),
        hasRole,
        hasPermission,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
