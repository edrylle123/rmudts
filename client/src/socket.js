// socket.js
import { io } from "socket.io-client";
const API_BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";
export const socket = io("http://localhost:8081", {
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  timeout: 10000,
});
