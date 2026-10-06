import { requireSupabase } from '../../lib/supabaseClient';

export function listQuestions(testId) {
  let query = requireSupabase().from('questions').select('*').order('created_at', { ascending: true });
  if (testId) query = query.eq('test_id', testId);
  return query;
}

export function createQuestion(question) {
  return requireSupabase().from('questions').insert(question).select().single();
}

export function updateQuestion(id, changes) {
  return requireSupabase().from('questions').update(changes).eq('id', id).select().single();
}
