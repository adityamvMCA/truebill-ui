import { useEffect, useRef } from "react";

/**
 * USB / Bluetooth scanners that behave like a keyboard.
 * A burst of fast keystrokes ended by Enter (or a configured suffix such as Tab) = one barcode.
 * Works anywhere on the page without focusing an input; ignores normal human typing.
 */
export default function useKeyboardWedge(onScan, {
  enabled = true, suffixKeys = ["Enter"], minLength = 4, maxGapMs = 60, dedupeMs = 800,
} = {}) {
  const buf = useRef({ text: "", at: 0 });
  const last = useRef({ code: "", at: 0 });
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typingField = (tag === "input" || tag === "textarea") && !e.target.dataset.wedge;
      const now = Date.now();

      if (suffixKeys.includes(e.key)) {
        const code = buf.current.text;
        buf.current = { text: "", at: 0 };
        if (code.length >= minLength) {
          e.preventDefault();
          if (last.current.code === code && now - last.current.at < dedupeMs) return;
          last.current = { code, at: now };
          cb.current(code);
        }
        return;
      }
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      if (now - buf.current.at > maxGapMs) buf.current.text = ""; // slow = human typing
      buf.current = { text: buf.current.text + e.key, at: now };
      if (typingField && buf.current.text.length < 2) return;
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled, suffixKeys.join("|"), minLength, maxGapMs, dedupeMs]);
}
