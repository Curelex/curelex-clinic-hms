import { createContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getMe, login as loginApi, signup as signupApi } from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("ims_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: currentUser, activePlan: plan } = await getMe();
        setUser(currentUser);
        setActivePlan(plan);
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
    setActivePlan(data.activePlan || null);
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
    setActivePlan(null);
  };

  const hasPerm = (key) => {
    if (!user) return false;
    if (user.role?.toLowerCase() === "admin") return true;
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  const value = useMemo(
    () => ({ user, activePlan, loading, login, signup, logout, hasPerm }),
    [user, activePlan, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};