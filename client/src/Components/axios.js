// client/src/Components/axios.js
import Axios from "axios";

const baseURL =
  process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";

const axios = Axios.create({
  baseURL,
  withCredentials: false, // not using cookies for auth
});

// Attach Authorization header for protected routes
axios.interceptors.request.use((config) => {
  const needsAuth =
    config.url &&
    !config.url.includes("/login") &&
    !config.url.includes("/signup") &&
    !config.url.includes("/refresh-token") &&
    !config.url.includes("/uploads/"); // static files

  if (needsAuth) {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Ensure absolute URL for direct file fetches if caller passed full path
  if (/^\/uploads\//.test(config.url)) {
    config.url = baseURL + config.url;
  }

  return config;
});

export default axios;
