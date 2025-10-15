// // client/src/Components/axios.js
// import Axios from "axios";

// const baseURL =
//   process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";

// const axios = Axios.create({
//   baseURL: "http://localhost:8081",
//   withCredentials: false, // not using cookies for auth
// });

// // Attach Authorization header for protected routes
// axios.interceptors.request.use((config) => {
//   const needsAuth =
//     config.url &&
//     !config.url.includes("/login") &&
//     !config.url.includes("/signup") &&
//     !config.url.includes("/refresh-token") &&
//     !config.url.includes("/uploads/"); // static files

//   if (needsAuth) {
//     const token = localStorage.getItem("token");
//     if (token) {
//       config.headers = config.headers || {};
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//   }

//   // Ensure absolute URL for direct file fetches if caller passed full path
//   if (/^\/uploads\//.test(config.url)) {
//     config.url = baseURL + config.url;
//   }

//   return config;
// });

// export default axios;
// client/src/Components/axios.js
import Axios from "axios";

const baseURL =
  process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";

const axios = Axios.create({
  baseURL: "http://localhost:8081",
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

// Global error handling (e.g., token expiry, unauthorized)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Request Error:", error);
    if (error.response?.status === 401) {
      // Handle token expiration or unauthorized access
      localStorage.removeItem("token");
      window.location.reload(); // Optionally redirect to login page
    }
    return Promise.reject(error);
  }
);

export default axios;
