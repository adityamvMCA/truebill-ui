import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import apiClient from "../services/apiClient";

const SubscriptionContext = createContext({
  subscription: null,
  hasFeature: () => true,
  refresh: async () => {},
});

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(() => {
    try {
      const stored = localStorage.getItem("subscription");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const refresh = useCallback(async () => {
    try {
      const response = await apiClient.get("/auth/me");
      const nextSubscription = response?.data?.subscription ?? null;

      setSubscription(nextSubscription);
      localStorage.setItem(
        "subscription",
        JSON.stringify(nextSubscription)
      );

      return nextSubscription;
    } catch (error) {
      console.error("Subscription refresh failed:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      refresh();
    }
  }, [refresh]);

  const hasFeature = useCallback(
    (featureCode) => {
      if (!featureCode) return true;

      // Do not block while subscription information is loading/not configured.
      if (!subscription) return true;

      return subscription.features?.includes(
        String(featureCode).trim().toLowerCase()
      );
    },
    [subscription]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        setSubscription,
        hasFeature,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);