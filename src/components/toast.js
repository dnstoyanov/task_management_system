import { toast } from "react-toastify";

const defaultOpts = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

export const notify = {
  success: (msg, opts) => toast.success(msg, { ...defaultOpts, ...opts }),
  error:   (msg, opts) => toast.error(msg,   { ...defaultOpts, ...opts }),
  info:    (msg, opts) => toast.info(msg,    { ...defaultOpts, ...opts }),
};

/**
 * Call this in every catch() for Firestore calls.
 * It interprets common Firestore errors and shows a consistent toast.
 */
export function handleFirestoreError(e, fallback = "Something went wrong.") {
  const code = e?.code || "";
  const msg  = e?.message || "";

  if (code === "permission-denied" || /insufficient permissions/i.test(msg)) {
    notify.error("You don’t have permission to perform this action.");
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

/**
 * Optional helper to wrap async service calls.
 * Usage: await guarded(() => update(...), "Saved");
 */
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
