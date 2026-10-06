import { requireSupabase } from '../../lib/supabaseClient';

export function listAttempts() {
  return requireSupabase().from('attempts').select('*').order('created_at', { ascending: false });
}

export function createAttempt(attempt) {
  return requireSupabase().from('attempts').insert(attempt).select().single();
}

export function updateAttempt(id, changes) {
  return requireSupabase().from('attempts').update(changes).eq('id', id).select().single();
}

export function upsertAnswer(answer) {
  return requireSupabase()
    .from('answers')
    .upsert(answer, { onConflict: 'attempt_id,question_id' })
    .select()
    .single();
}
