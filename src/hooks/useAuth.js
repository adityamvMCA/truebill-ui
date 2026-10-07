import { useEffect, useState } from "react";
import api from "../services/api";

function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const response = await api.auth.me();

        const result = response.data;

        if (result?.success && result?.user) {
          setUser(result.user);

          localStorage.setItem(
            "user",
            JSON.stringify(result.user)
          );

          if (result.tenant) {
            localStorage.setItem(
              "tenant",
              JSON.stringify(result.tenant)
            );
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: Boolean(
      localStorage.getItem("token")
    ),
  };
}

export default useAuth;