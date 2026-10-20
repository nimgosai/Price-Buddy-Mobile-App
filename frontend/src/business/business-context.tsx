import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiRequest } from "@/src/api/client";
import { useAuth } from "@/src/auth/auth-context";
import { storage } from "@/src/utils/storage";

export type Business = {
  id: string;
  company_name: string;
  business_type?: string;
  trading_name?: string | null;
  is_primary?: boolean;
  site_count?: number;
  contract_count?: number;
};

const ACTIVE_BIZ_KEY = "uch_active_business_id";
export const ALL_BUSINESSES = "__all__";

type BusinessState = {
  businesses: Business[];
  activeBizId: string; // ALL_BUSINESSES or a business id
  activeBusiness: Business | null;
  ready: boolean;
  switchBusiness: (id: string) => void;
  refreshBusinesses: () => Promise<Business[]>;
  /** "?business_id=<id>" when a specific business is active, else "" */
  bizQuery: () => string;
};

const BusinessContext = createContext<BusinessState | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBizId, setActiveBizId] = useState<string>(ALL_BUSINESSES);
  const [ready, setReady] = useState(false);

  const refreshBusinesses = useCallback(async (): Promise<Business[]> => {
    try {
      const res = await apiRequest<Business[]>("/businesses");
      const list = Array.isArray(res) ? res : [];
      setBusinesses(list);
      return list;
    } catch {
      setBusinesses([]);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setActiveBizId(ALL_BUSINESSES);
      setReady(false);
      return;
    }
    (async () => {
      // Remember the last business viewed, per user (falls back to the legacy shared key).
      const userKey = `${ACTIVE_BIZ_KEY}:${user.id || user.email || "me"}`;
      const saved =
        (await storage.getItem<string>(userKey, "")) ||
        (await storage.getItem<string>(ACTIVE_BIZ_KEY, ALL_BUSINESSES));
      const list = await refreshBusinesses();
      // Only restore a business that still exists for this user.
      const valid = saved && saved !== ALL_BUSINESSES && list.some((b) => b.id === saved);
      setActiveBizId(valid ? saved : ALL_BUSINESSES);
      setReady(true);
    })();
  }, [user, refreshBusinesses]);

  const switchBusiness = useCallback((id: string) => {
    setActiveBizId(id);
    storage.setItem(ACTIVE_BIZ_KEY, id).catch(() => {});
    if (user) storage.setItem(`${ACTIVE_BIZ_KEY}:${user.id || user.email || "me"}`, id).catch(() => {});
  }, [user]);

  const activeBusiness =
    activeBizId === ALL_BUSINESSES ? null : businesses.find((b) => b.id === activeBizId) || null;

  const bizQuery = useCallback(
    () => (activeBizId && activeBizId !== ALL_BUSINESSES ? `?business_id=${activeBizId}` : ""),
    [activeBizId],
  );

  return (
    <BusinessContext.Provider
      value={{ businesses, activeBizId, activeBusiness, ready, switchBusiness, refreshBusinesses, bizQuery }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessState {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
