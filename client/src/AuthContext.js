// src/AuthContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  getStoredUser,
  refreshToken,
  clearAuth,
  isTokenExpired,
} from "./utils/auth";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

useEffect(() => {
  (async () => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      // keep LS convenience keys in sync for UI that still reads them
      localStorage.setItem("userEmail", storedUser.email || "");
      localStorage.setItem("userRole", storedUser.role || "");
      setLoading(false);
      return;
    }
    if (isTokenExpired()) {
      const refreshed = await refreshToken();
      if (refreshed) {
        setUser(refreshed);
        localStorage.setItem("userEmail", refreshed.email || "");
        localStorage.setItem("userRole", refreshed.role || "");
      } else {
        clearAuth();
      }
    }
    setLoading(false);
  })();
}, []);

 const login = useCallback((userData, accessToken, refreshTok) => {
  if (accessToken) localStorage.setItem("token", accessToken);
  if (refreshTok) localStorage.setItem("refreshToken", refreshTok);
  if (userData) {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("userEmail", userData.email || "");
    localStorage.setItem("userRole", userData.role || "");
  }
  setUser(userData ?? null);
}, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, login, logout, loading }),
    [user, loading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
