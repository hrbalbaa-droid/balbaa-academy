import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLearning } from "@/lib/learning/LearningProvider";
import { can, canEditBag } from "@/lib/permissions";
import { coverSrc, fmtDuration } from "@/lib/format";
import { Confirm, PageHeader, ReviewBadge, StatusBadge } from "@/components/common";
import { BagDialog } from "@/components/BagDialog";
import { LectureRowActions } from "@/components/LectureRowActions";
import { CourseEnrollCard } from "@/components/learning/CourseEnrollCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/bags/$bagId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تفاصيل الحقيبة | أكاديمية صيدليات بلبع" },
      { name: "description", content: "مستويات ومحاضرات الحقيبة التدريبية." },
      { property: "og:title", content: "حقيبة تدريبية – أكاديمية بلبع" },
      { property: "og:description", content: "مستويات ومحاضرات الحقيبة التدريبية." },
    ],
  }),
  component: BagPage,
});

function BagPage() {
  const { bagId } = Route.useParams();
  const { data, user, reorderLecture, deleteBag } = useData();
  const learning = useLearning();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const bag = data.bags.find((b) => b.id === bagId);

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
  const editable = canEditBag(user, bag.id);
  const isStudent = user.role === "trainee";
  const learningReady = !isStudent || !learning.loading;
  const enrolled = !isStudent || learning.isEnrolled(bag.id);
  const publishedLessons = data.lectures.filter(
    (lecture) => lecture.bagId === bag.id && lecture.status === "published",
  );
  const courseProgress = learning.progressForLessons(publishedLessons.map((lecture) => lecture.id));
  const lectures = data.lectures.filter(
    (l) => l.bagId === bag.id && (editable || l.status === "published"),
  );
  const kpis = data.kpis.filter((k) => bag.kpis.includes(k.id));

  const enrollNow = async () => {
    setEnrolling(true);
    const ok = await learning.enroll(bag.id);
    setEnrolling(false);
    if (ok) toast.success("تم التسجيل في الحقيبة. يمكنك البدء الآن.");
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "حقائب التدريب", to: "/bags" }, { label: bag.title }]}
        title={bag.title}
        actions={
          <>
            {isStudent && learningReady && enrolled && (
              <Button asChild>
                <Link to="/learn/$bagId" params={{ bagId: bag.id }}>
                  <PlayCircle className="size-4" /> متابعة التعلم
                </Link>
              </Button>
            )}
            {!isStudent && (
              <Button asChild variant="outline">
                <Link to="/learn/$bagId" params={{ bagId: bag.id }}>
                  <PlayCircle className="size-4" /> معاينة المشغل
                </Link>
              </Button>
            )}
            {editable && (
              <Button asChild>
                <Link to="/lectures/new" search={{ bag: bag.id }}>
                  <Plus className="size-4" /> إضافة محاضرة جديدة
                </Link>
              </Button>
            )}
            {can(user, "manage_bags") && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> تعديل الحقيبة
              </Button>
            )}
            {can(user, "manage_bags") && (
              <Confirm
                trigger={
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="size-4" /> حذف
                  </Button>
                }
                title="حذف الحقيبة وكل محاضراتها؟"
                description={`سيتم حذف «${bag.title}» و${lectures.length} محاضرة بداخلها نهائياً. ننصح بأخذ نسخة احتياطية أولاً.`}
                confirmLabel="نعم، احذف"
                onConfirm={async () => {
                  if (await deleteBag(bag.id)) {
                    toast.success("تم حذف الحقيبة");
                    navigate({ to: "/bags" });
                  }
                }}
              />
            )}
          </>
        }
      />

      {isStudent && !learningReady && (
        <div className="surface mb-6 flex items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand-green" />
          جارٍ تحميل حالة التسجيل والتقدم…
        </div>
      )}

      {isStudent && learning.error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <span>{learning.error}</span>
          <Button variant="outline" size="sm" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {isStudent && learningReady && !enrolled && !learning.error && (
        <CourseEnrollCard
          course={bag}
          busy={enrolling}
          onEnroll={() => void enrollNow()}
          className="mb-6"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface overflow-hidden lg:col-span-2">
          <img src={coverSrc(bag.cover)} alt="" className="h-48 w-full object-cover md:h-60" />
          <div className="p-6">
            <p className="leading-loose text-muted-foreground">{bag.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="size-4 text-brand-green" /> {bag.audience}
              </span>
              {bag.suggestedHours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-brand-green" /> {bag.suggestedHours}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4 text-brand-green" /> {lectures.length} محاضرة
              </span>
            </div>
          </div>
        </section>
        <aside className="space-y-6">
          {isStudent && learningReady && enrolled && (
            <section className="surface p-6">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <PlayCircle className="size-5 text-brand-green" /> تقدمك في الحقيبة
              </h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {courseProgress.completed} من {courseProgress.total} محاضرة
                </span>
                <span className="font-bold text-primary">{courseProgress.percent}%</span>
              </div>
              <Progress value={courseProgress.percent} className="mt-2 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                أكملت {courseProgress.completed} من أصل {courseProgress.total} محاضرة منشورة.
              </p>
              <Button asChild className="mt-4 w-full">
                <Link to="/learn/$bagId" params={{ bagId: bag.id }}>
                  <PlayCircle className="size-4" /> متابعة التعلم
                </Link>
              </Button>
            </section>
          )}
          <section className="surface p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Target className="size-5 text-brand-red" /> أهداف التعلم
            </h2>
            {bag.objectives.length ? (
              <ul className="list-inside list-disc space-y-1.5 text-sm">
                {bag.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">لم تُضف أهداف بعد.</p>
            )}
          </section>
          {kpis.length > 0 && (
            <section className="surface p-6">
              <h2 className="mb-3 font-bold">مؤشرات الأداء المرتبطة</h2>
              <div className="flex flex-wrap gap-2">
                {kpis.map((k) => (
                  <Link
                    key={k.id}
                    to="/kpis"
                    className="rounded-lg bg-secondary px-3 py-1 text-sm font-semibold text-primary"
                    dir="ltr"
                  >
                    {k.label}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {(!isStudent || (learningReady && enrolled)) && (
        <div className="mt-8 space-y-6">
          {bag.levels.map((lv, idx) => {
            const items = lectures
              .filter((l) => l.levelId === lv.id)
              .sort((a, b) => a.order - b.order);
            return (
              <section key={lv.id} className="surface p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {idx + 1}
                  </span>
                  <h2 className="text-lg font-bold">المستوى: {lv.name}</h2>
                  <span className="text-sm text-muted-foreground">({items.length} محاضرة)</span>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    لا توجد محاضرات في هذا المستوى بعد.
                    {editable && " استخدم زر «إضافة محاضرة جديدة» بالأعلى."}
                  </p>
                ) : (
                  <ol className="divide-y">
                    {items.map((l, i) => (
                      <li key={l.id} className="flex items-center gap-3 py-3">
                        <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                          {l.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          {isStudent ? (
                            <Link
                              to="/learn/$bagId"
                              params={{ bagId: bag.id }}
                              search={{ lesson: l.id }}
                              className="font-medium hover:text-primary"
                            >
                              {l.title}
                            </Link>
                          ) : (
                            <Link
                              to="/lectures/$lectureId"
                              params={{ lectureId: l.id }}
                              className="font-medium hover:text-primary"
                            >
                              {l.title}
                            </Link>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{l.trainer}</span>·<span>{fmtDuration(l.durationMin)}</span>
                            <StatusBadge status={l.status} />
                            <ReviewBadge review={l.review} />
                            {isStudent && learning.isLessonCompleted(l.id) && (
                              <span className="flex items-center gap-1 font-medium text-brand-green">
                                <CheckCircle2 className="size-3.5" /> مكتمل
                              </span>
                            )}
                          </div>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={i === 0}
                              onClick={() => reorderLecture(l.id, -1)}
                              aria-label="تحريك لأعلى"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={i === items.length - 1}
                              onClick={() => reorderLecture(l.id, 1)}
                              aria-label="تحريك لأسفل"
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <LectureRowActions lecture={l} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
      <BagDialog open={editing} onOpenChange={setEditing} bag={bag} />
    </div>
  );
}
