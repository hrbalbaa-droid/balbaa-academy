-- ============================================================================
-- 0002_courses_lessons_storage.sql
-- Course catalog, lessons, enrollments, lesson progress, and the course-videos
-- storage bucket. Run after 0001_profiles.sql.
--
-- Design notes:
-- * All catalog reads require an authenticated session.
-- * Only profiles with role = 'admin' can create/update/delete catalog rows
--   and upload/delete storage objects.
-- * Students can enroll themselves and write only their own progress.
-- * The storage bucket is private. Authenticated clients must create
--   short-lived signed URLs to play videos or show thumbnails.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Helper: is the given user an academy admin?
-- SECURITY DEFINER avoids recursive RLS checks on public.profiles.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- courses
-- ----------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  thumbnail_url text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.courses is 'Academy courses. Mirrors the prototype bag/course model.';

create index if not exists courses_created_by_idx on public.courses (created_by);
create index if not exists courses_created_at_idx on public.courses (created_at desc);

alter table public.courses enable row level security;

drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated"
on public.courses
for select
to authenticated
using (true);

drop policy if exists "courses_insert_admin" on public.courses;
create policy "courses_insert_admin"
on public.courses
for insert
to authenticated
with check (public.is_admin(auth.uid()) and created_by = auth.uid());

drop policy if exists "courses_update_admin" on public.courses;
create policy "courses_update_admin"
on public.courses
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "courses_delete_admin" on public.courses;
create policy "courses_delete_admin"
on public.courses
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- lessons
-- ----------------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  video_url text,
  duration integer not null default 0 check (duration >= 0),
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

comment on table public.lessons is 'Ordered lessons inside a course. Mirrors prototype lectures.';

create index if not exists lessons_course_order_idx on public.lessons (course_id, order_index);

alter table public.lessons enable row level security;

drop policy if exists "lessons_select_authenticated" on public.lessons;
create policy "lessons_select_authenticated"
on public.lessons
for select
to authenticated
using (true);

drop policy if exists "lessons_insert_admin" on public.lessons;
create policy "lessons_insert_admin"
on public.lessons
for insert
to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "lessons_update_admin" on public.lessons;
create policy "lessons_update_admin"
on public.lessons
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "lessons_delete_admin" on public.lessons;
create policy "lessons_delete_admin"
on public.lessons
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- enrollments
-- ----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

comment on table public.enrollments is 'Course enrollments for students.';

create index if not exists enrollments_course_idx on public.enrollments (course_id);
create index if not exists enrollments_student_idx on public.enrollments (student_id);

alter table public.enrollments enable row level security;

drop policy if exists "enrollments_select_own_or_admin" on public.enrollments;
create policy "enrollments_select_own_or_admin"
on public.enrollments
for select
to authenticated
using (student_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "enrollments_insert_own_or_admin" on public.enrollments;
create policy "enrollments_insert_own_or_admin"
on public.enrollments
for insert
to authenticated
with check (student_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "enrollments_delete_own_or_admin" on public.enrollments;
create policy "enrollments_delete_own_or_admin"
on public.enrollments
for delete
to authenticated
using (student_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- lesson_progress
-- ----------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

comment on table public.lesson_progress is 'Per-student lesson completion. Replaces localStorage progress.';

create index if not exists lesson_progress_student_course_idx
  on public.lesson_progress (student_id, course_id);

-- Ensure progress rows cannot mix a lesson with the wrong course and keep
-- completion timestamps consistent.
create or replace function public.validate_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.lessons
    where id = new.lesson_id
      and course_id = new.course_id
  ) then
    raise exception 'lesson % does not belong to course %', new.lesson_id, new.course_id;
  end if;

  if new.completed then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_lesson_progress on public.lesson_progress;
create trigger validate_lesson_progress
before insert or update on public.lesson_progress
for each row execute function public.validate_lesson_progress();

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_select_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_select_own_or_admin"
on public.lesson_progress
for select
to authenticated
using (student_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "lesson_progress_insert_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_insert_own_or_admin"
on public.lesson_progress
for insert
to authenticated
with check (student_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "lesson_progress_update_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_update_own_or_admin"
on public.lesson_progress
for update
to authenticated
using (student_id = auth.uid() or public.is_admin(auth.uid()))
with check (student_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "lesson_progress_delete_own_or_admin" on public.lesson_progress;
create policy "lesson_progress_delete_own_or_admin"
on public.lesson_progress
for delete
to authenticated
using (student_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Storage: course-videos bucket
-- 50 MB per object. The client validates thumbnails to 5 MB, while the bucket
-- allows images and videos because both live in the same requested bucket.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-videos',
  'course-videos',
  false,
  52428800,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_videos_select_authenticated" on storage.objects;
create policy "course_videos_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'course-videos');

drop policy if exists "course_videos_insert_admin" on storage.objects;
create policy "course_videos_insert_admin"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'course-videos' and public.is_admin(auth.uid()));

drop policy if exists "course_videos_update_admin" on storage.objects;
create policy "course_videos_update_admin"
on storage.objects
for update
to authenticated
using (bucket_id = 'course-videos' and public.is_admin(auth.uid()))
with check (bucket_id = 'course-videos' and public.is_admin(auth.uid()));

drop policy if exists "course_videos_delete_admin" on storage.objects;
create policy "course_videos_delete_admin"
on storage.objects
for delete
to authenticated
using (bucket_id = 'course-videos' and public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Table grants for the authenticated role (RLS still filters every row).
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.enrollments to authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
