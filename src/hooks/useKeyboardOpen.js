import { useEffect, useState } from "react";

/*
  Detects when the on-screen keyboard is open.
  Works in the browser (visualViewport) and in Capacitor
  (Keyboard plugin window events, if the plugin is installed).

  Place at: src/hooks/useKeyboardOpen.js
*/

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "tel",
  "url",
  "number",
  "password",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

const isTextEntry = (element) => {
  if (!element) return false;

  const tag = element.tagName;

  if (tag === "TEXTAREA" || tag === "SELECT") return true;

  if (tag === "INPUT") {
    return TEXT_INPUT_TYPES.has(
      (element.getAttribute("type") || "text").toLowerCase(),
    );
  }

  return element.isContentEditable === true;
};

const KEYBOARD_MIN_SHRINK = 140;

export default function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;

    const currentHeight = () =>
      viewport?.height ?? window.innerHeight;

    let baseline = Math.max(
      window.innerHeight,
      viewport?.height ?? 0,
    );

    const check = () => {
      const height = currentHeight();

      if (height > baseline) baseline = height;

      const shrunk = baseline - height > KEYBOARD_MIN_SHRINK;

      setOpen(shrunk && isTextEntry(document.activeElement));
    };

    const resetBaseline = () => {
      baseline = Math.max(
        window.innerHeight,
        viewport?.height ?? 0,
      );

      check();
    };

    let orientationTimer = null;

    const handleOrientation = () => {
      window.clearTimeout(orientationTimer);
      orientationTimer = window.setTimeout(resetBaseline, 350);
    };

    let focusTimer = null;

    const handleFocusChange = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(check, 120);
    };

    const handleNativeShow = () => setOpen(true);
    const handleNativeHide = () => setOpen(false);

    viewport?.addEventListener("resize", check);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", handleOrientation);
    document.addEventListener("focusin", handleFocusChange);
    document.addEventListener("focusout", handleFocusChange);

    // Capacitor Keyboard plugin events (no-ops if plugin is absent)
    window.addEventListener("keyboardWillShow", handleNativeShow);
    window.addEventListener("keyboardDidShow", handleNativeShow);
    window.addEventListener("keyboardWillHide", handleNativeHide);
    window.addEventListener("keyboardDidHide", handleNativeHide);

    return () => {
      window.clearTimeout(orientationTimer);
      window.clearTimeout(focusTimer);

      viewport?.removeEventListener("resize", check);
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", handleOrientation);
      document.removeEventListener("focusin", handleFocusChange);
      document.removeEventListener("focusout", handleFocusChange);

      window.removeEventListener("keyboardWillShow", handleNativeShow);
      window.removeEventListener("keyboardDidShow", handleNativeShow);
      window.removeEventListener("keyboardWillHide", handleNativeHide);
      window.removeEventListener("keyboardDidHide", handleNativeHide);
    };
  }, []);

  return open;
}