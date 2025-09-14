// src/axios.js
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8081";

// Attach token to every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired token response
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      window.location.href = "/"; // force back to login
    }
    return Promise.reject(error);
  }
);

export default axios;
