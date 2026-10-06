import { requireSupabase } from '../../lib/supabaseClient';

export function listTests() {
  return requireSupabase().from('tests').select('*').order('created_at', { ascending: false });
}

export function getTest(id) {
  return requireSupabase().from('tests').select('*').eq('id', id).single();
}

export function createTest(test) {
  return requireSupabase().from('tests').insert(test).select().single();
}

export function updateTest(id, changes) {
  return requireSupabase().from('tests').update(changes).eq('id', id).select().single();
}
