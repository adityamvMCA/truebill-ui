/**
 * Trial / Subscription Expiration & Snooze Management Utility
 */

export const TRIAL_EXPIRED_EVENT = "trustiq:trial-expired";
export const TRIAL_EXPIRED_SNOOZE_KEY = "trial_expired_snooze_until";

// 2 Days in Milliseconds: 2 * 24 * 60 * 60 * 1000 = 172,800,000 ms
export const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Checks whether the current tenant's trial or subscription is expired.
 * @param {object|null} subscription - The subscription object from SubscriptionContext or localStorage
 * @returns {boolean}
 */
export const isSubscriptionOrTrialExpired = (subscription) => {
  // Allow manual toggle for testing in browser console or settings: localStorage.setItem("force_trial_expired", "true")
  if (
    localStorage.getItem("force_trial_expired") === "true" ||
    sessionStorage.getItem("force_trial_expired") === "true"
  ) {
    return true;
  }

  // If no subscription object is loaded yet, fall back to localStorage
  let sub = subscription;
  if (!sub) {
    try {
      sub = JSON.parse(localStorage.getItem("subscription") || "null");
    } catch {
      sub = null;
    }
  }

  // Developer / support users acting as platform admin can be exempt unless force tested
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user && ["developer", "support"].includes(user.platformRole) && !sessionStorage.getItem("selectedTenantId")) {
      return false;
    }
  } catch {
    // ignore
  }

  if (!sub) return false;

  // Explicitly marked invalid or expired
  if (sub.valid === false) {
    return true;
  }

  if (sub.status === "expired") {
    return true;
  }

  if (sub.reason === "SUBSCRIPTION_EXPIRED") {
    return true;
  }

  // If daysLeft is explicitly 0
  if (typeof sub.daysLeft === "number" && sub.daysLeft <= 0) {
    return true;
  }

  // If subscription end date has passed
  if (sub.subscriptionEnd) {
    const endTime = new Date(sub.subscriptionEnd).getTime();
    if (!Number.isNaN(endTime) && endTime <= Date.now()) {
      return true;
    }
  }

  return false;
};

/**
 * Checks whether the trial expired ad popup is currently snoozed.
 * (User clicked close button within the last 2 days / 48 hours)
 */
export const isAdSnoozed = () => {
  try {
    const snoozedUntil = Number(localStorage.getItem(TRIAL_EXPIRED_SNOOZE_KEY) || 0);
    return Number.isFinite(snoozedUntil) && snoozedUntil > Date.now();
  } catch {
    return false;
  }
};

/**
 * Snoozes the automatic trial expired ad modal for 2 days (48 hours).
 */
export const snoozeAdForTwoDays = () => {
  const snoozeUntil = Date.now() + TWO_DAYS_MS;
  try {
    localStorage.setItem(TRIAL_EXPIRED_SNOOZE_KEY, String(snoozeUntil));
  } catch (err) {
    console.error("Failed to save trial expired snooze:", err);
  }
  return snoozeUntil;
};

/**
 * Clears the snooze (e.g. after successful renewal or upgrade)
 */
export const clearAdSnooze = () => {
  try {
    localStorage.removeItem(TRIAL_EXPIRED_SNOOZE_KEY);
  } catch {
    // ignore
  }
};

/**
 * Dispatches an event to trigger the Trial Expired Ad modal.
 * @param {object} detail - Optional payload { force: boolean, reason: string }
 */
export const triggerTrialExpiredModal = (detail = {}) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIAL_EXPIRED_EVENT, { detail }));
  }
};

/**
 * Returns false if record creation is blocked due to expired trial/subscription.
 * If blocked and triggerModal is true, immediately triggers the Trial Expired modal!
 */
export const assertCanCreateRecord = (subscription, triggerModal = true) => {
  const expired = isSubscriptionOrTrialExpired(subscription);
  if (expired) {
    if (triggerModal) {
      triggerTrialExpiredModal({
        force: true,
        reason: "create_blocked",
      });
    }
    return false;
  }
  return true;
};
