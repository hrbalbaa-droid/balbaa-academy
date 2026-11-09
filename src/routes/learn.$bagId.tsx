import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Loader2,
  PlayCircle,
  User,
} from "lucide-react";

import { useData } from "@/lib/store";
import { requireIdentity } from "@/lib/auth/guards";
import { useLearning } from "@/lib/learning/LearningProvider";
import { canEditBag } from "@/lib/permissions";
import { fmtDuration, youtubeEmbed } from "@/lib/format";
import { PageHeader } from "@/components/common";
import { CourseEnrollCard } from "@/components/learning/CourseEnrollCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Bag, Lecture } from "@/lib/types";

type PlayerSearch = { lesson?: string };

export const Route = createFileRoute("/learn/$bagId")({
  beforeLoad: async ({ location }) => {
    await requireIdentity(location.href);
  },
  validateSearch: (s: Record<string, unknown>): PlayerSearch =>
    typeof s["lesson"] === "string" && s["lesson"] ? { lesson: s["lesson"] } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "مشغل الحقيبة | أكاديمية صيدليات بلبع" },
      { name: "description", content: "مشاهدة محاضرات الحقيبة ومتابعة تقدمك فيها." },
      { property: "og:title", content: "مشغل الحقيبة – أكاديمية بلبع" },
      { property: "og:description", content: "شاهد الدروس، أكملها، وتابع تقدمك." },
    ],
  }),
  component: CoursePlayerPage,
});

function CoursePlayerPage() {
  const { bagId } = Route.useParams();
  const { lesson: lessonParam } = Route.useSearch();
  const { data, user } = useData();
  const learning = useLearning();
  const navigate = useNavigate();
  const [enrolling, setEnrolling] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);

  const isStudent = user.role === "trainee";
  const bag = data.bags.find((item) => item.id === bagId);

  const lessons = useMemo(() => {
    if (!bag) return [];
    const levelOrder = new Map(bag.levels.map((level, index) => [level.id, index]));
    return data.lectures
      .filter(
        (lecture) => lecture.bagId === bag.id && (!isStudent || lecture.status === "published"),
      )
      .sort(
        (a, b) =>
          (levelOrder.get(a.levelId) ?? 99) - (levelOrder.get(b.levelId) ?? 99) ||
          a.order - b.order,
      );
  }, [bag, data.lectures, isStudent]);

  const current = useMemo(() => {
    const requested = lessonParam ? lessons.find((lecture) => lecture.id === lessonParam) : null;
    if (requested) return requested;
    return (
      lessons.find((lecture) => !learning.completedLessonIds.has(lecture.id)) ?? lessons[0] ?? null
    );
  }, [lessonParam, lessons, learning.completedLessonIds]);

  const currentIndex = current ? lessons.findIndex((lecture) => lecture.id === current.id) : -1;
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const progress = learning.progressForLessons(lessons.map((lecture) => lecture.id));
  const isCurrentComplete = current ? learning.completedLessonIds.has(current.id) : false;
  const learningReady = !isStudent || !learning.loading;

  useEffect(() => {
    if (learningReady && current && !lessonParam) {
      void navigate({
        to: "/learn/$bagId",
        params: { bagId },
        search: { lesson: current.id },
        replace: true,
      });
    }
  }, [bagId, current, learningReady, lessonParam, navigate]);

  if (!bag) {
    return (
      <div className="surface p-10 text-center">
        <p className="font-bold">هذه الحقيبة غير موجودة.</p>
        <Button asChild className="mt-4">
          <Link to="/bags">العودة للحقائب</Link>
        </Button>
      </div>
    );
  }

  if (isStudent && learning.loading) {
    return (
      <div>
        <PlayerHeader bag={bag} canEdit={canEditBag(user, bag.id)} />
        <div className="surface flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand-green" />
          جارٍ تحميل تقدمك في الحقيبة…
        </div>
      </div>
    );
  }

  if (isStudent && learning.error && !learning.isEnrolled(bag.id)) {
    return (
      <div>
        <PlayerHeader bag={bag} canEdit={canEditBag(user, bag.id)} />
        <div className="surface p-8 text-center">
          <p className="font-bold text-brand-red">تعذر تحميل حالة التسجيل</p>
          <p className="mt-2 text-sm text-muted-foreground">{learning.error}</p>
          <Button className="mt-4" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (isStudent && learningReady && !learning.isEnrolled(bag.id)) {
    return (
      <div>
        <PlayerHeader bag={bag} canEdit={canEditBag(user, bag.id)} />
        <CourseEnrollCard
          course={bag}
          busy={enrolling}
          onEnroll={async () => {
            setEnrolling(true);
            const ok = await learning.enroll(bag.id);
            setEnrolling(false);
            if (ok) toast.success("تم التسجيل في الحقيبة. يمكنك البدء الآن.");
          }}
        />
      </div>
    );
  }

  const toggleLesson = async (lecture: Lecture) => {
    setMarking(lecture.id);
    const completed = !learning.completedLessonIds.has(lecture.id);
    const ok = await learning.setCompleted({
      courseId: bag.id,
      lessonId: lecture.id,
      completed,
    });
    setMarking(null);
    if (ok) {
      toast.success(completed ? "تم إكمال الدرس" : "تم إلغاء إكمال الدرس");
    }
  };

  const embed = current?.videoUrl ? youtubeEmbed(current.videoUrl) : null;
  const directVideo =
    Boolean(current?.videoUrl) &&
    (Boolean(current?.videoPath) ||
      /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(current?.videoUrl ?? "") ||
      (current?.videoUrl ?? "").includes("/storage/v1/object/sign/"));

  return (
    <div>
      <PlayerHeader bag={bag} canEdit={canEditBag(user, bag.id)} />

      {learning.error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <span>{learning.error}</span>
          <Button variant="outline" size="sm" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="surface overflow-hidden">
            {embed ? (
              <iframe
                src={embed}
                title="فيديو الدرس"
                className="aspect-video w-full"
                allowFullScreen
              />
            ) : directVideo && current ? (
              <video
                src={current.videoUrl}
                controls
                preload="metadata"
                playsInline
                className="aspect-video w-full bg-black"
              />
            ) : current?.videoUrl ? (
              <a
                href={current.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border-b p-4 text-sm text-primary hover:bg-muted"
              >
                <ExternalLink className="size-4" /> فتح فيديو الدرس
              </a>
            ) : null}

            {current ? (
              <div className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-brand-green">
                      الدرس {currentIndex + 1} من {lessons.length}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-primary">{current.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" /> {fmtDuration(current.durationMin)}
                      </span>
                      {current.trainer && (
                        <span className="flex items-center gap-1">
                          <User className="size-3.5" /> {current.trainer}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      isCurrentComplete
                        ? "bg-secondary text-primary"
                        : "bg-warning-soft text-foreground"
                    }`}
                  >
                    {isCurrentComplete ? "مكتمل" : "قيد التعلم"}
                  </span>
                </div>

                {current.description && (
                  <p className="leading-loose text-muted-foreground">{current.description}</p>
                )}

                {current.objectives.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold">أهداف الدرس</h3>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {current.objectives.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void toggleLesson(current)}
                    disabled={marking === current.id}
                  >
                    {marking === current.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isCurrentComplete ? (
                      <Circle className="size-4" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {isCurrentComplete ? "إلغاء إكمال الدرس" : "إكمال الدرس"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/lectures/$lectureId" params={{ lectureId: current.id }}>
                      <BookOpen className="size-4" /> المحتوى الكامل
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-muted-foreground">
                لا توجد محاضرات منشورة في هذه الحقيبة بعد.
              </div>
            )}
          </section>

          {current && current.sections.length > 0 && (
            <section className="surface space-y-5 p-6">
              <h2 className="font-bold text-primary">محتوى الدرس</h2>
              {current.sections.map((section, index) => (
                <article key={section.id}>
                  <h3 className="mb-2 font-bold">
                    {index + 1}. {section.heading}
                  </h3>
                  <p className="whitespace-pre-line leading-loose text-muted-foreground">
                    {section.body}
                  </p>
                </article>
              ))}
            </section>
          )}

          {current && current.caseStudy && (
            <section className="surface p-6">
              <h2 className="mb-3 font-bold text-primary">مثال عملي / دراسة حالة</h2>
              <p className="whitespace-pre-line leading-loose">{current.caseStudy}</p>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {previous ? (
              <Button asChild variant="outline">
                <Link
                  to="/learn/$bagId"
                  params={{ bagId: bag.id }}
                  search={{ lesson: previous.id }}
                >
                  <ArrowRight className="size-4" /> الدرس السابق
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ArrowRight className="size-4" /> الدرس السابق
              </Button>
            )}
            {next ? (
              <Button asChild>
                <Link to="/learn/$bagId" params={{ bagId: bag.id }} search={{ lesson: next.id }}>
                  الدرس التالي <ArrowLeft className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                نهاية الحقيبة
              </Button>
            )}
          </div>
        </div>

        <aside className="surface h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="border-b p-5">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>تقدمك في الحقيبة</span>
              <span className="text-muted-foreground">
                {progress.completed} / {progress.total}
              </span>
            </div>
            <Progress value={progress.percent} className="mt-2 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {progress.percent}% مكتمل
              {!isStudent && " · معاينة إدارية"}
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {bag.levels.map((level) => {
              const items = lessons.filter((lecture) => lecture.levelId === level.id);
              if (!items.length) return null;
              return (
                <div key={level.id} className="mb-4 last:mb-0">
                  <h3 className="px-3 py-2 text-xs font-bold text-muted-foreground">
                    {level.name}
                  </h3>
                  <ul className="space-y-1">
                    {items.map((lecture) => {
                      const active = current?.id === lecture.id;
                      const completed = learning.isLessonCompleted(lecture.id);
                      return (
                        <li key={lecture.id}>
                          <Link
                            to="/learn/$bagId"
                            params={{ bagId: bag.id }}
                            search={{ lesson: lecture.id }}
                            className={`flex items-start gap-2 rounded-xl p-3 text-sm transition-colors ${
                              active
                                ? "bg-secondary text-primary"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-green" />
                            ) : active ? (
                              <PlayCircle className="mt-0.5 size-4 shrink-0" />
                            ) : (
                              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{lecture.title}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {fmtDuration(lecture.durationMin)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {lessons.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                لا توجد دروس متاحة بعد.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PlayerHeader({ bag, canEdit }: { bag: Bag; canEdit: boolean }) {
  return (
    <PageHeader
      crumbs={[
        { label: "حقائب التدريب", to: "/bags" },
        { label: bag.title, to: "/bags/$bagId", params: { bagId: bag.id } },
        { label: "مشغل الحقيبة" },
      ]}
      title={bag.title}
      subtitle="شاهد الدروس بالترتيب، وحدد كل درس كمكتمل بعد الانتهاء منه."
      actions={
        <Button asChild variant="outline">
          <Link to="/bags/$bagId" params={{ bagId: bag.id }}>
            {canEdit ? "إدارة الحقيبة" : "تفاصيل الحقيبة"}
          </Link>
        </Button>
      }
    />
  );
}
