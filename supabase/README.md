# Supabase setup — Steps 1–6

## 1. Create the project

1. Create a project at [database.new](https://database.new).
2. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key (or the newer `publishable` key)

## 2. Environment variables

Copy `.env.example` to `.env` in the project root:

```sh
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-KEY
VITE_SUPABASE_COURSE_BUCKET=course-videos
```

`VITE_SUPABASE_PUBLISHABLE_KEY` is also accepted instead of `VITE_SUPABASE_ANON_KEY`.
Restart `npm run dev` after changing `.env`.

> Without these variables the app stays in **demo mode**: login/signup screens work with the
> “دخول كمدير / دخول كطالب” quick-access buttons and the existing local prototype data.

## 3. Apply the profiles migration

Open **SQL Editor** in the Supabase dashboard and run:

```text
supabase/migrations/0001_profiles.sql
```

This creates:

- `public.user_role` enum (`admin`, `student`)
- `public.profiles` table
- a trigger that creates a profile for every new auth user (always `student`)
- RLS policies and a trigger that blocks self-promotion to `admin`

## 4. Apply the course and storage migration

Run the second migration in the same SQL Editor:

```text
supabase/migrations/0002_courses_lessons_storage.sql
```

This creates:

- `public.courses` (`title`, `description`, `thumbnail_url`, `created_by`, `created_at`, `metadata`)
- `public.lessons` (`course_id`, `title`, `video_url`, `duration`, `order_index`, `metadata`)
- `public.enrollments` (unique student/course pair)
- `public.lesson_progress` (unique student/lesson pair + completion timestamps)
- `public.is_admin()` helper used by RLS
- Row Level Security for every table:
  - authenticated users can read the full catalog and lesson data; migration `0004` adds
    anonymous access to public course fields and published lesson titles/durations
  - only admins can create/update/delete courses, lessons, and storage objects
  - students can enroll themselves and write only their own progress
- the private `course-videos` storage bucket with a **50 MB** file limit

## 5. Make the bucket private and add UI metadata

Run the third migration:

```text
supabase/migrations/0003_private_course_assets.sql
```

It sets `course-videos` to **private** and adds the `metadata` JSONB columns used for the
prototype course/lesson fields. The app signs video and thumbnail URLs for six hours at load
time and plays storage videos in a native `<video>` element; external YouTube links still use
the embedded player.

> If you already ran `0002` with a public bucket, run `0003` (or execute
> `update storage.buckets set public = false where id = 'course-videos';`). Existing public
> object URLs stop working, while authenticated signed URLs continue to work. Verify with:
>
> ```sql
> select id, public from storage.buckets where id = 'course-videos';
> ```

## 6. Enable public catalog browsing

Run the fourth migration:

```text
supabase/migrations/0004_public_catalog.sql
```

It permits anonymous reads of public course fields and published lesson titles/durations only.
Lesson metadata and video URLs remain unavailable to anonymous queries. Draft and archived lessons
remain hidden. The `course-videos` bucket remains private; anonymous users cannot create signed
video URLs.

## 7. Configure Auth

In **Authentication → Providers → Email**:

- Enable Email provider.
- For a quick internal launch, turn **Confirm email** off.
- If you keep confirmation on, add your deployed URL under **URL Configuration → Redirect URLs**
  (for example `https://your-domain.com/login`).

## 8. Create the first admin

1. Sign up normally from `/signup`.
2. In **SQL Editor**, promote the account:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@your-domain.com');
```

3. Sign out and sign back in. The Admin-only routes and upload actions are now visible.

## What is enforced where

| Layer                 | Purpose                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| TanStack `beforeLoad` | Protects the course player and redirects unauthenticated visitors from admin routes. |
| `permissions.ts`      | Hides admin-only UI actions.                                                            |
| Supabase RLS          | The real security boundary; never rely on the UI alone.                                 |

Step 4 is wired: in Supabase mode the course catalog is loaded with TanStack Query through the
online provider, and edits are written back to `courses`/`lessons`. Visitors can browse the
homepage, course details, and published lesson titles without an account; watching lessons and
enrolling requires login.

Step 5 is wired into the existing editors:

- **Course cover** (`BagDialog`): admins can upload PNG/JPG/WebP/GIF thumbnails up to **5 MB**.
- **Lesson video** (`LectureForm`): admins can upload MP4/WebM/MOV/M4V videos up to **50 MB**,
  preview them with a signed URL, replace them, or remove them. An external YouTube/link URL can
  still be used instead.
- Replaced files are deleted from Storage after the database save succeeds. An upload that is
  canceled or never saved is cleaned up without touching the currently saved file.

Step 6 adds the learning experience on top of those tables:

- **Enrollment**: students browse the course catalog, then enroll from the course page or from
  the lesson access gate. Enrollments are inserted into `public.enrollments`.
- **Course player**: `/learn/$bagId` requires a login and shows lesson video/content, a level-by-level outline,
  per-lesson completion controls, previous/next navigation, and the course progress bar. The
  optional `?lesson=<lesson-id>` search parameter selects a lesson.
- **Lesson completion**: students can mark a lesson complete/incomplete from the player or the
  lesson page. Each change is upserted into `public.lesson_progress`; the database trigger keeps
  `completed_at` and `updated_at` consistent.
- **Student views**: the dashboard shows enrolled courses and overall progress, the course list
  shows enrollment/progress status, and the lecture library is limited to enrolled courses.
- **Demo mode** keeps working without Supabase. Demo enrollments/progress are stored in
  `localStorage` under `balbaa-academy:learning:<user-id>` and are cleared by the demo reset.

No additional migration is required for Step 6: `0002` already allows a student to insert their
own enrollment and create/update their own progress rows.

> The private storage bucket requires authentication for signed media URLs. The current storage
> policy allows any authenticated user to sign course assets; add enrollment-based RLS policies
> for lesson metadata and storage objects if videos must also be blocked before enrollment.
