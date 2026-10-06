const USERS_STORAGE_KEY = 'verity_users_v1';

/**
 * Temporary persistence for the existing demo experience. This remains the
 * runtime fallback until a Supabase project is configured and the feature
 * migrations are completed in later stages.
 */
export function loadDemoUsers(seedUsers) {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    // Ignore unavailable or invalid browser storage and use the seed data.
  }
  return seedUsers;
}

export function saveDemoUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (_) {
    // Demo persistence is optional, so storage failures must not block the UI.
  }
}
