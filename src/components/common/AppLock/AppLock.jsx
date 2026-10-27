import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const LOCK_AFTER_MS = 60 * 1000; // lock only if the app was away longer than this

let skipNextLock = false;
/** Call right before opening a file picker / camera / share sheet. */
export const suppressNextLock = () => {
  skipNextLock = true;
  setTimeout(() => {
    skipNextLock = false;
  }, 120000); // safety reset
};

/**
 * enabled: whether the user turned on fingerprint lock
 * authenticate: async () => boolean  -> plug in YOUR existing biometric call
 */
export default function AppLock({ children, enabled, authenticate }) {
  const [locked, setLocked] = useState(false);
  const hiddenAt = useRef(null);
  const authenticating = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const ok = await authenticate();
      if (ok) setLocked(false);
    } catch (e) {
      /* stay locked, user can tap Unlock */
    } finally {
      setTimeout(() => {
        authenticating.current = false;
      }, 600);
    }
  }, [authenticate]);

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return undefined;

    const sub = CapApp.addListener("appStateChange", ({ isActive }) => {
      // the biometric prompt itself pauses/resumes the app: ignore that
      if (authenticating.current) return;

      if (!isActive) {
        hiddenAt.current = Date.now();
        return;
      }

      const away = Date.now() - (hiddenAt.current ?? Date.now());
      hiddenAt.current = null;

      if (skipNextLock) {
        skipNextLock = false;
        return;
      }
      if (away >= LOCK_AFTER_MS) setLocked(true);
    });

    return () => {
      sub.then((h) => h.remove());
    };
  }, [enabled]);

  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  return (
    <>
      {/* ALWAYS rendered, never unmounted, so forms keep their state */}
      {children}

      {locked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <h3 style={{ margin: 0 }}>App locked</h3>
          <button
            type="button"
            onClick={unlock}
            style={{ padding: "10px 20px" }}
          >
            Unlock with fingerprint
          </button>
        </div>
      )}
    </>
  );
}
