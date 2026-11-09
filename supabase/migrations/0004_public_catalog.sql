-- Public visitors may browse course details and published lesson titles.
-- Course media remains private; only authenticated users can create signed URLs.

drop policy if exists "courses_select_public" on public.courses;
create policy "courses_select_public"
on public.courses
for select
to anon
using (true);

drop policy if exists "lessons_select_public" on public.lessons;
create policy "lessons_select_public"
on public.lessons
for select
to anon
using (coalesce(metadata ->> 'status', 'published') = 'published');

revoke select on public.courses from anon;
grant select (id, title, description, thumbnail_url, created_at, metadata)
on public.courses to anon;

revoke select on public.lessons from anon;
grant select (id, course_id, title, duration, order_index, created_at)
on public.lessons to anon;
