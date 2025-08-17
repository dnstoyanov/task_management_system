// src/core/services/user.service.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * USERS
 * Collection: /users/{uid}
 * Fields used: email (lowercased), emailLower (optional but recommended),
 *              displayName?, photoURL?
 */

const usersCol = collection(db, "users");

/** Get a single user profile by UID */
async function profile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get many user profiles by an array of UIDs (sequential to avoid IN size limits) */
async function profiles(uids = []) {
  const out = [];
  for (const uid of uids) {
    const p = await profile(uid);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Find a user by email (case-insensitive).
 * Tries `emailLower` first (recommended), falls back to `email`.
 */
async function byEmail(email) {
  const needle = (email || "").trim().toLowerCase();
  if (!needle) return null;

  // Preferred: emailLower exact match
  try {
    const qLower = query(usersCol, where("emailLower", "==", needle));
    const sLower = await getDocs(qLower);
    if (!sLower.empty) {
      const d = sLower.docs[0];
      return { id: d.id, ...d.data() };
    }
  } catch (_) {
    // ignore; we'll try the fallback
  }

  // Fallback: email (if your older docs only have `email`)
  const qEmail = query(usersCol, where("email", "==", needle));
  const sEmail = await getDocs(qEmail);
  if (!sEmail.empty) {
    const d = sEmail.docs[0];
    return { id: d.id, ...d.data() };
  }

  return null;
}

export const UserService = {
  profile,
  profiles,
  byEmail,
};
