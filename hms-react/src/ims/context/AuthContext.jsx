import { createContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getMe, login as loginApi, signup as signupApi } from "../services/authService";
import { authApi } from "../services/api";

export const AuthContext = createContext(null);

// Module-level guard: survives StrictMode remount
let lastExchangedSsoToken = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Component-level guard: blocks concurrent in-flight calls
  const exchangeInFlight = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const ssoToken = params.get("sso");

      if (ssoToken) {
        // Strip URL immediately before any async work
        window.history.replaceState({}, document.title, window.location.pathname);

        // Block if same token already handled or currently in flight
        if (lastExchangedSsoToken === ssoToken || exchangeInFlight.current) {
          setLoading(false);
          return;
        }

        lastExchangedSsoToken = ssoToken;
        exchangeInFlight.current = true;

        try {
          const { data } = await authApi.post("/auth/sso-exchange", { token: ssoToken });
          localStorage.setItem("ims_token", data.token);
          setUser(data.user);
          setLoading(false);
          return;
        } catch (error) {
          const status = error?.response?.status;
          if (status === 401 && localStorage.getItem("ims_token")) {
            // Race lost — first call already saved the token, restore session
            try {
              const { user: currentUser } = await getMe();
              setUser(currentUser);
            } catch {
              localStorage.removeItem("ims_token");
            }
            setLoading(false);
            return;
          }
          // Genuine failure — reset guards for retry
          lastExchangedSsoToken = null;
          exchangeInFlight.current = false;
          console.error(
            "SSO exchange failed:",
            error?.response?.data?.message || error.message
          );
        }
      }

      // Normal JWT session restore
      const token = localStorage.getItem("ims_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await getMe();
        setUser(currentUser);
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem("ims_token");
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (payload) => {
    const data = await loginApi(payload);
    localStorage.setItem("ims_token", data.token);
    setUser(data.user);
    toast.success("Logged in");
  };

  const signup = async (payload) => {
    const data = await signupApi(payload);
    localStorage.setItem("ims_token", data.token);
    setUser(data.user);
    toast.success("Account created");
  };

  const logout = () => {
    localStorage.removeItem("ims_token");
    setUser(null);
    lastExchangedSsoToken = null;
    exchangeInFlight.current = false;
  };

  const hasPerm = (key) => {
    if (!user) return false;
    if (user.role?.toLowerCase() === "admin") return true;
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, hasPerm }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};