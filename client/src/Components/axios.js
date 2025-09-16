// client/src/Components/axios.js
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8081";

// Attach token to every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // unified key
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
      // Clear auth and bounce to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axios;
