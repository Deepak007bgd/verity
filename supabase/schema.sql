-- VERITY Supabase foundation. Run this in the Supabase SQL Editor after a
-- project is created. RLS is enabled now; application policies follow later.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  email text not null unique,
  role text not null check (role in ('admin', 'teacher', 'faculty', 'student')),
  status text not null default 'Active' check (status in ('Active', 'Disabled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  duration integer not null check (duration > 0),
  total_marks numeric(10, 2) not null default 0 check (total_marks >= 0),
  pass_percentage numeric(5, 2) not null default 40 check (pass_percentage between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'Draft' check (status in ('Draft', 'Published', 'Closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete set null,
  question_text text not null check (char_length(trim(question_text)) > 0),
  question_type text not null check (question_type in ('mcq', 'true_false', 'short_answer', 'subjective', 'numerical')),
  marks numeric(10, 2) not null default 1 check (marks > 0),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_answer text,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(10, 2) not null default 0,
  status text not null default 'In Progress' check (status in ('In Progress', 'Evaluating', 'Evaluated', 'Disqualified')),
  tab_switch_count integer not null default 0 check (tab_switch_count >= 0),
  disqualified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (test_id, student_id)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  student_answer text,
  marks_awarded numeric(10, 2),
  teacher_feedback text,
  evaluated_by uuid references public.profiles(id) on delete set null,
  evaluated_at timestamptz,
  unique (attempt_id, question_id)
);

create index if not exists tests_created_by_idx on public.tests(created_by);
create index if not exists questions_test_id_idx on public.questions(test_id);
create index if not exists attempts_student_id_idx on public.attempts(student_id);
create index if not exists attempts_test_id_idx on public.attempts(test_id);
create index if not exists answers_attempt_id_idx on public.answers(attempt_id);
create index if not exists answers_question_id_idx on public.answers(question_id);

alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;

-- Data API table privileges. These grants make future authenticated requests
-- eligible to reach the tables, but RLS still denies every row until explicit
-- role-aware policies are added. Anonymous and PUBLIC access stay revoked.
revoke all privileges on table public.profiles, public.tests, public.questions, public.attempts, public.answers from public;
revoke all privileges on table public.profiles, public.tests, public.questions, public.attempts, public.answers from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.tests to authenticated;
grant select, insert, update, delete on table public.questions to authenticated;
grant select, insert, update on table public.attempts to authenticated;
grant select, insert, update on table public.answers to authenticated;

-- service_role is for trusted server-side administration only. Never expose it
-- to the browser; it bypasses RLS in Supabase server environments.
grant all privileges on table public.profiles, public.tests, public.questions, public.attempts, public.answers to service_role;

-- No policies are created in this stage. With RLS enabled, application access
-- remains denied until role-aware policies are designed and reviewed.
