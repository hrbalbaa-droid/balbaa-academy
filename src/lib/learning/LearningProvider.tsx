import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  enrollInCourse,
  fetchMyEnrollments,
  fetchMyLessonProgress,
  setLessonCompleted,
  unenrollFromCourse,
} from "@/lib/supabase/progress";
import type { Enrollment, LessonProgress } from "@/lib/supabase/types";
import {
  type CourseEnrollment,
  type LearningContextValue,
  type LessonCompletion,
  type ProgressResult,
} from "./context";

const EMPTY: LearningSnapshot = { enrollments: [], progress: [] };
const DEMO_KEY_PREFIX = "balbaa-academy:learning:";

interface LearningSnapshot {
  enrollments: CourseEnrollment[];
  progress: LessonCompletion[];
}

function demoKey(userId: string) {
  return `${DEMO_KEY_PREFIX}${userId}`;
}

function readDemoSnapshot(userId: string): LearningSnapshot {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(demoKey(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LearningSnapshot>;
    const enrollments: CourseEnrollment[] = Array.isArray(parsed.enrollments)
      ? parsed.enrollments
          .filter(
            (item): item is CourseEnrollment =>
              !!item && typeof item.courseId === "string" && typeof item.enrolledAt === "string",
          )
          .map((item) => ({ courseId: item.courseId, enrolledAt: item.enrolledAt }))
      : [];
    const progress: LessonCompletion[] = Array.isArray(parsed.progress)
      ? parsed.progress
          .filter(
            (item): item is LessonCompletion =>
              !!item &&
              typeof item.lessonId === "string" &&
              typeof item.courseId === "string" &&
              typeof item.completed === "boolean" &&
              typeof item.updatedAt === "string",
          )
          .map((item) => ({
            lessonId: item.lessonId,
            courseId: item.courseId,
            completed: item.completed,
            completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
            updatedAt: item.updatedAt,
          }))
      : [];
    return { enrollments, progress };
  } catch (error) {
    console.error("Could not read local learning progress", error);
    return EMPTY;
  }
}

function writeDemoSnapshot(userId: string, snapshot: LearningSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(demoKey(userId), JSON.stringify(snapshot));
}

function mapEnrollment(row: Enrollment): CourseEnrollment {
  return { courseId: row.course_id, enrolledAt: row.enrolled_at };
}

function mapProgress(row: LessonProgress): LessonCompletion {
  return {
    lessonId: row.lesson_id,
    courseId: row.course_id,
    completed: row.completed,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

async function loadSnapshot(userId: string): Promise<LearningSnapshot> {
  if (!isSupabaseConfigured) return readDemoSnapshot(userId);
  const [enrollments, progress] = await Promise.all([
    fetchMyEnrollments(),
    fetchMyLessonProgress(),
  ]);
  return {
    enrollments: enrollments.map(mapEnrollment),
    progress: progress.map(mapProgress),
  };
}

function learningErrorMessage(error: unknown): string {
  if (error instanceof Error && /[\u0600-\u06FF]/.test(error.message)) return error.message;
  return "تعذر تحميل التسجيلات وتقدمك في الحقائب. حاول مرة أخرى.";
}

const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const userId = identity?.id ?? null;
  const queryKey = useMemo(() => ["learning", userId ?? "anonymous"] as const, [userId]);

  const query = useQuery({
    queryKey,
    queryFn: () => loadSnapshot(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) console.error("Learning data load failed", query.error);
  }, [query.error]);

  const snapshot = query.data ?? EMPTY;
  const loading = Boolean(userId) && query.isPending;
  const error = query.error ? learningErrorMessage(query.error) : null;

  const enrolledCourseIds = useMemo(
    () => new Set(snapshot.enrollments.map((item) => item.courseId)),
    [snapshot.enrollments],
  );
  const completedLessonIds = useMemo(
    () => new Set(snapshot.progress.filter((item) => item.completed).map((item) => item.lessonId)),
    [snapshot.progress],
  );

  const isEnrolled = useCallback(
    (courseId: string) => enrolledCourseIds.has(courseId),
    [enrolledCourseIds],
  );
  const isLessonCompleted = useCallback(
    (lessonId: string) => completedLessonIds.has(lessonId),
    [completedLessonIds],
  );
  const refetch = query.refetch;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  const progressForLessons = useCallback(
    (lessonIds: string[]): ProgressResult => {
      const completed = lessonIds.filter((id) => completedLessonIds.has(id)).length;
      const total = lessonIds.length;
      return {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    },
    [completedLessonIds],
  );

  const updateSnapshot = useCallback(
    (next: LearningSnapshot) => {
      if (userId && !isSupabaseConfigured) writeDemoSnapshot(userId, next);
      queryClient.setQueryData(queryKey, next);
    },
    [queryClient, queryKey, userId],
  );

  const enroll = useCallback(
    async (courseId: string) => {
      if (!userId) return false;
      const current = queryClient.getQueryData<LearningSnapshot>(queryKey) ?? EMPTY;
      if (current.enrollments.some((item) => item.courseId === courseId)) return true;

      try {
        let enrolledAt = new Date().toISOString();
        if (isSupabaseConfigured) {
          const row = await enrollInCourse(courseId);
          enrolledAt = row.enrolled_at;
        }
        updateSnapshot({
          ...current,
          enrollments: [...current.enrollments, { courseId, enrolledAt }],
        });
        return true;
      } catch (error) {
        console.error("Course enrollment failed", error);
        toast.error(
          error instanceof Error && /[\u0600-\u06FF]/.test(error.message)
            ? error.message
            : "تعذر التسجيل في الحقيبة. حاول مرة أخرى.",
        );
        return false;
      }
    },
    [queryClient, queryKey, updateSnapshot, userId],
  );

  const unenroll = useCallback(
    async (courseId: string) => {
      if (!userId) return false;
      const current = queryClient.getQueryData<LearningSnapshot>(queryKey) ?? EMPTY;
      try {
        if (isSupabaseConfigured) await unenrollFromCourse(courseId);
        updateSnapshot({
          ...current,
          enrollments: current.enrollments.filter((item) => item.courseId !== courseId),
        });
        return true;
      } catch (error) {
        console.error("Course unenrollment failed", error);
        toast.error(
          error instanceof Error && /[\u0600-\u06FF]/.test(error.message)
            ? error.message
            : "تعذر إلغاء التسجيل. حاول مرة أخرى.",
        );
        return false;
      }
    },
    [queryClient, queryKey, updateSnapshot, userId],
  );

  const setCompleted = useCallback(
    async (input: { courseId: string; lessonId: string; completed: boolean }) => {
      if (!userId) return false;
      const current = queryClient.getQueryData<LearningSnapshot>(queryKey) ?? EMPTY;
      try {
        let completion: LessonCompletion;
        if (isSupabaseConfigured) {
          const row = await setLessonCompleted(input);
          completion = mapProgress(row);
        } else {
          const now = new Date().toISOString();
          completion = {
            lessonId: input.lessonId,
            courseId: input.courseId,
            completed: input.completed,
            completedAt: input.completed ? now : null,
            updatedAt: now,
          };
        }
        updateSnapshot({
          ...current,
          progress: [
            ...current.progress.filter((item) => item.lessonId !== input.lessonId),
            completion,
          ],
        });
        return true;
      } catch (error) {
        console.error("Saving lesson progress failed", error);
        toast.error(
          error instanceof Error && /[\u0600-\u06FF]/.test(error.message)
            ? error.message
            : "تعذر حفظ تقدمك في الدرس. حاول مرة أخرى.",
        );
        return false;
      }
    },
    [queryClient, queryKey, updateSnapshot, userId],
  );

  const value = useMemo<LearningContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      error,
      enrollments: snapshot.enrollments,
      progress: snapshot.progress,
      enrolledCourseIds,
      completedLessonIds,
      isEnrolled,
      isLessonCompleted,
      progressForLessons,
      enroll,
      unenroll,
      setCompleted,
      refresh,
    }),
    [
      completedLessonIds,
      enroll,
      enrolledCourseIds,
      error,
      isEnrolled,
      isLessonCompleted,
      loading,
      progressForLessons,
      refresh,
      setCompleted,
      snapshot.enrollments,
      snapshot.progress,
      unenroll,
    ],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning(): LearningContextValue {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearning must be used inside LearningProvider");
  return context;
}