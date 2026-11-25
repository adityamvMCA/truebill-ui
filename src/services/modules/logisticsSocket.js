import { io } from "socket.io-client";

const getApiOrigin = () => {
  const base =
    import.meta.env.VITE_BACKEND_ORIGIN ||
    import.meta.env.VITE_API_BASE_URL ||
    window.location.origin;
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

/**
 * Creates a socket connection to /logistics namespace
 */
export const createLogisticsSocket = () => {
  return io(`${getApiOrigin()}/logistics`, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
};

export default createLogisticsSocket;
