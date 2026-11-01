
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

import {
  RATE_LIMIT_EVENT,
  getServerNow,
  isServerClockSynced,
} from "../../../utils/rateLimit";

import "./RateLimitModal.css";

const formatWait = (seconds) => {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
};

function RateLimitModal() {
  const [until, setUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [clockSynced, setClockSynced] = useState(false);

  const buttonRef = useRef(null);

  const open = until > 0;

  /**
   * Handle backend rate-limit event.
   */
  useEffect(() => {
    const handleRateLimited = (event) => {
      const seconds = Number(event.detail?.seconds) || 30;

      const now = getServerNow();
      const nextUntil = now + seconds * 1000;

      setUntil((current) => Math.max(current, nextUntil));

      setAcknowledged(false);
      setClockSynced(isServerClockSynced());
    };

    window.addEventListener(
      RATE_LIMIT_EVENT,
      handleRateLimited,
    );

    return () => {
      window.removeEventListener(
        RATE_LIMIT_EVENT,
        handleRateLimited,
      );
    };
  }, []);

  /**
   * Countdown using backend-synchronized time.
   */
  useEffect(() => {
    if (!open) return undefined;

    const tick = () => {
      const left = Math.ceil(
        (until - getServerNow()) / 1000,
      );

      if (left <= 0) {
        setUntil(0);
        setRemaining(0);
        setAcknowledged(false);
        return;
      }

      setRemaining(left);
    };

    tick();

    const timer = window.setInterval(tick, 500);

    return () => window.clearInterval(timer);
  }, [open, until]);

  /**
   * Keep focus accessible when modal opens.
   */
  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(() => {
      buttonRef.current?.focus({
        preventScroll: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  /**
   * OK only acknowledges the warning.
   * It never closes the modal or stops the timer.
   */
  const handleAcknowledge = useCallback(() => {
    setAcknowledged(true);
  }, []);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="rlm-overlay" role="presentation">
      <div
        className="rlm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rlm-title"
        aria-describedby="rlm-message"
      >
        <div className="rlm-icon" aria-hidden="true">
          <Clock size={24} />
        </div>

        <h2 id="rlm-title" className="rlm-title">
          Too many requests
        </h2>

        <p id="rlm-message" className="rlm-message">
          You are sending requests too quickly.
          Please wait until the countdown finishes
          before trying again.
        </p>

        <div className="rlm-timer" role="timer" aria-live="polite">
          <span>Try again in </span>

          <strong>
            {formatWait(remaining)}
          </strong>
        </div>

        <div className="rlm-clock-status">
          <span className="rlm-status-dot" />

          {clockSynced
            ? "Time synchronized with server"
            : "Using local clock until server time is available"}
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="rlm-button"
          onClick={handleAcknowledge}
          disabled={acknowledged}
        >
          {acknowledged ? "Please wait..." : "OK"}
        </button>

        <p className="rlm-footer">
          This window will close automatically when
          the waiting period is over.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export default RateLimitModal;
