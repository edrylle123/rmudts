// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredUser, refreshToken, clearAuth, isTokenExpired } from './utils/auth';
import { useNavigate } from "react-router-dom";
const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
        const navigate = useNavigate(); // ✅

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        const storedUser = getStoredUser();
        
        if (storedUser) {
            setUser(storedUser);
        } else if (isTokenExpired()) {
            // Try to refresh the token
            const refreshedUser = await refreshToken();
            if (refreshedUser) {
                setUser(refreshedUser);
            } else {
                clearAuth();
            }
        }
        
        setLoading(false);
    };

    const login = (userData, token, refreshToken) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        if (refreshToken) {
            localStorage.setItem("refreshToken", refreshToken);
        }
        setUser(userData);
    };

   const logout = () => {
  clearAuth();
  setUser(null);
  navigate("/", { replace: true }); // ✅ replaces history
};

    const value = {
        user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
