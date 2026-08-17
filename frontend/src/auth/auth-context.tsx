import { createContext, useContext, useEffect, useState, useCallback } from "react";

import { apiRequest, TOKEN_KEY } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string;
  is_admin: boolean;
  email_notifications_enabled?: boolean;
  push_notifications_enabled?: boolean;
  business_type?: string;
  trading_name?: string | null;
};

type AuthState = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    full_name?: string;
    company_name?: string;
    business_type?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    const me = await apiRequest<User>("/me", { auth: true });
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    (async () => {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      if (token) {
        try {
          await loadMe();
        } catch {
          await storage.secureRemove(TOKEN_KEY);
          setUser(null);
        }
      }
      setReady(true);
    })();
  }, [loadMe]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await apiRequest<{ token: string; user: User }>("/login", {
        method: "POST",
        auth: false,
        body: { email: email.trim().toLowerCase(), password },
      });
      await storage.secureSet(TOKEN_KEY, data.token);
      // Pull the full profile so downstream screens have complete data.
      try {
        await loadMe();
      } catch {
        setUser(data.user);
      }
    },
    [loadMe],
  );

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      full_name?: string;
      company_name?: string;
      business_type?: string;
    }) => {
      const data = await apiRequest<{ token: string; user: User }>("/register", {
        method: "POST",
        auth: false,
        body: { ...payload, email: payload.email.trim().toLowerCase() },
      });
      await storage.secureSet(TOKEN_KEY, data.token);
      try {
        await loadMe();
      } catch {
        setUser(data.user);
      }
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
