import { peekIdentity } from "@/lib/auth/identity";
import { requireSupabase } from "./client";
import type { Enrollment, LessonProgress } from "./types";

async function currentUserId(): Promise<string> {
  const cached = peekIdentity();
  if (cached?.id) return cached.id;

  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("يلزم تسجيل الدخول لعرض تقدمك.");
  return data.user.id;
}

/** Enrollments for the signed-in student (admins still read their own rows). */
export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  const client = requireSupabase();
  const studentId = await currentUserId();
  const { data, error } = await client
    .from("enrollments")
    .select("*")
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Adds the signed-in student to a course (idempotent). */
export async function enrollInCourse(courseId: string): Promise<Enrollment> {
  const client = requireSupabase();
  const studentId = await currentUserId();

  const existing = await client
    .from("enrollments")
    .select("*")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;

  const { data, error } = await client
    .from("enrollments")
    .insert({ student_id: studentId, course_id: courseId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function unenrollFromCourse(courseId: string): Promise<void> {
  const client = requireSupabase();
  const studentId = await currentUserId();
  const { error } = await client
    .from("enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("course_id", courseId);
  if (error) throw new Error(error.message);
}

/** All progress rows for the signed-in student, optionally for one course. */
export async function fetchMyLessonProgress(courseId?: string): Promise<LessonProgress[]> {
  const client = requireSupabase();
  const studentId = await currentUserId();
  let query = client.from("lesson_progress").select("*").eq("student_id", studentId);
  if (courseId) query = query.eq("course_id", courseId);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Marks a lesson complete/incomplete in the database. */
export async function setLessonCompleted(input: {
  lessonId: string;
  courseId: string;
  completed: boolean;
}): Promise<LessonProgress> {
  const client = requireSupabase();
  const studentId = await currentUserId();
  const { data, error } = await client
    .from("lesson_progress")
    .upsert(
      {
        student_id: studentId,
        lesson_id: input.lessonId,
        course_id: input.courseId,
        completed: input.completed,
      },
      { onConflict: "student_id,lesson_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
