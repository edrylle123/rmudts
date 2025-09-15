// auth.js
import { jwtDecode } from "jwt-decode";

export function getStoredUser() {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) return null;

    try {
        const decoded = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.warn("Token expired");
            // Don't immediately clear - let the refresh logic handle it
            return null;
        }
        return JSON.parse(userStr);
    } catch (err) {
        console.error("JWT decode error:", err);
        return null;
    }
}

export async function refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    try {
        const response = await fetch("http://localhost:8081/refresh-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("token", data.token);
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }
            return data.user;
        } else {
            // Refresh failed, clear everything
            clearAuth();
            return null;
        }
    } catch (error) {
        console.error("Token refresh failed:", error);
        clearAuth();
        return null;
    }
}

export function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
}

export function isTokenExpired() {
    const token = localStorage.getItem("token");
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        return decoded.exp && decoded.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}
