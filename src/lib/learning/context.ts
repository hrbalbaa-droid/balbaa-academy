import { createContext, useContext } from "react";

export interface CourseEnrollment {
  courseId: string;
  enrolledAt: string;
}

export interface LessonCompletion {
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
}

export interface ProgressResult {
  completed: number;
  total: number;
  percent: number;
}

export interface LearningContextValue {
  configured: boolean;
  loading: boolean;
  error: string | null;
  enrollments: CourseEnrollment[];
  progress: LessonCompletion[];
  enrolledCourseIds: Set<string>;
  completedLessonIds: Set<string>;
  isEnrolled: (courseId: string) => boolean;
  isLessonCompleted: (lessonId: string) => boolean;
  progressForLessons: (lessonIds: string[]) => ProgressResult;
  enroll: (courseId: string) => Promise<boolean>;
  unenroll: (courseId: string) => Promise<boolean>;
  setCompleted: (input: {
    courseId: string;
    lessonId: string;
    completed: boolean;
  }) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const LearningContext = createContext<LearningContextValue | null>(null);

export function useLearning(): LearningContextValue {
  const context = useContext(LearningContext);
  if (!context) throw new Error("useLearning must be used inside LearningProvider");
  return context;
}
