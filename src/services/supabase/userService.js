import { requireSupabase } from '../../lib/supabaseClient';

export function getProfile(id) {
  return requireSupabase().from('profiles').select('*').eq('id', id).single();
}

export function listProfiles() {
  return requireSupabase().from('profiles').select('*').order('created_at', { ascending: true });
}

export function updateProfile(id, changes) {
  return requireSupabase().from('profiles').update(changes).eq('id', id).select().single();
}
