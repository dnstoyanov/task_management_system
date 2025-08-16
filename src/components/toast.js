// src/components/toast.js
import { toast } from "react-toastify";

const defaults = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

export const notify = {
  success: (msg, opts) => toast.success(msg, { ...defaults, ...opts }),
  error:   (msg, opts) => toast.error(msg,   { ...defaults, ...opts }),
  info:    (msg, opts) => toast.info(msg,    { ...defaults, ...opts }),
};

/** Centralized Firestore error messaging */
export function handleFirestoreError(e, fallback = "Something went wrong.") {
  const code = e?.code || "";
  const msg  = e?.message || "";

  if (code === "permission-denied" || /insufficient permissions/i.test(msg)) {
    notify.error("You don’t have permission to perform this action.");
    if (process.env.NODE_ENV !== "production") console.warn(e);
    return;
  }
  if (code === "unauthenticated") {
    notify.error("Please sign in to continue.");
    return;
  }
  if (code === "failed-precondition") {
    notify.error("Action can’t be completed due to a precondition.");
    return;
  }
  if (code === "not-found") {
    notify.error("The requested item was not found.");
    return;
  }
  if (code === "aborted" || code === "deadline-exceeded" || code === "unavailable") {
    notify.error("Network or server issue. Please try again.");
    return;
  }

  notify.error(fallback);
  if (process.env.NODE_ENV !== "production") console.error(e);
}

/** Optional wrapper to reduce try/catch noise */
export async function guarded(fn, successMsg) {
  try {
    const res = await fn();
    if (successMsg) notify.success(successMsg);
    return res;
  } catch (e) {
    handleFirestoreError(e);
    throw e;
  }
}
