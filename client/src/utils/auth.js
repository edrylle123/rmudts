import { jwtDecode } from "jwt-decode";

export function getStoredUser() {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) return null;

    try {
        const decoded = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.warn("Token expired");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            return null;
        }
        return JSON.parse(userStr);
    } catch (err) {
        console.error("JWT decode error:", err);
        return null;
    }
}
