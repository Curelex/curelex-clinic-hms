import { createContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getMe, login as loginApi, signup as signupApi } from "../services/authService";
import api from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const ssoToken = params.get("sso");

      if (ssoToken) {
        try {
          const { data } = await api.post("/auth/sso-exchange", { token: ssoToken });
          localStorage.setItem("ims_token", data.token);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error("SSO exchange failed:", error?.response?.data?.message || error.message);
        }
      }

      const token = localStorage.getItem("ims_token");
      if (!token) { setLoading(false); return; }

      try {
        const { user: currentUser } = await getMe();
        setUser(currentUser);
      } catch (error) {
        console.error("bootstrap getMe failed:", error?.response?.status, error?.message);
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