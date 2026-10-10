import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import apiClient from "../services/apiClient";

const SubscriptionContext = createContext({
  subscription: null,
  hasFeature: () => true,
  refresh: async () => {},
});

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("subscription"));
    } catch {
      return null;
    }
  });

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      const sub = res?.data?.subscription ?? null;
      setSubscription(sub);
      localStorage.setItem("subscription", JSON.stringify(sub));
    } catch {
      /* keep last known state */
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) refresh();
  }, [refresh]);

  const hasFeature = useCallback(
    (code) => !code || !subscription || subscription.features?.includes(String(code).toLowerCase()),
    [subscription]
  );

  return (
    <SubscriptionContext.Provider value={{ subscription, hasFeature, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);