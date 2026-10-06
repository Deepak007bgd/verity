import { requireSupabase } from '../../lib/supabaseClient';

export function signInWithPassword(email, password) {
  return requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
}

export function signOut() {
  return requireSupabase().auth.signOut();
}

export function getCurrentSession() {
  return requireSupabase().auth.getSession();
}

export function onAuthStateChange(callback) {
  return requireSupabase().auth.onAuthStateChange(callback);
}
