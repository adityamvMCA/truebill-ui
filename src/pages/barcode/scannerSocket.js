import { io } from "socket.io-client";

const apiOrigin = () => {
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  try { return new URL(base, window.location.origin).origin; } catch { return window.location.origin; }
};

/** ADAPT getToken to your auth storage. */
export const getToken = () => localStorage.getItem("token") || localStorage.getItem("accessToken");

export const createScannerSocket = () =>
  io(`${apiOrigin()}/scanner`, {
    auth: { token: getToken() },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelayMax: 5000,
  });

/** Promise wrapper with timeout so a dead connection never hangs the UI or loses a scan. */
export const emitAck = (socket, event, payload, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error("offline"));
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) return reject(new Error("timeout"));
      if (res && res.ok === false) return reject(Object.assign(new Error(res.message || "failed"), { server: true }));
      return resolve(res);
    });
  });
