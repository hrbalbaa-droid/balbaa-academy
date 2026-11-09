-- ============================================================================
-- 0003_private_course_assets.sql
-- Run after 0002_courses_lessons_storage.sql.
--
-- * Makes the course-videos bucket private. Videos and thumbnails are read
--   through short-lived signed URLs created for authenticated users.
-- * Adds a flexible metadata document to courses/lessons for the prototype UI
--   fields that do not need dedicated columns (levels, objectives, sections,
--   review state, quiz, KPI links, etc.).
-- ============================================================================

-- Private bucket: public object URLs stop working immediately. The existing
-- authenticated SELECT policy on storage.objects still allows signed URLs to
-- be generated for logged-in users.
update storage.buckets
set public = false
where id = 'course-videos';

alter table public.courses
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.lessons
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.courses.metadata is
  'Prototype course fields (number, audience, objectives, levels, cover preset, priority, KPIs, etc.).';

comment on column public.lessons.metadata is
  'Prototype lesson fields (level, sections, objectives, review, quiz, attachments, etc.).';
