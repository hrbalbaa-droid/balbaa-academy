import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, FolderPlus, ArrowLeft, Users, Layers, Loader2, PlayCircle } from "lucide-react";
import { useData } from "@/lib/store";
import { useLearning } from "@/lib/learning/LearningProvider";
import { can, visibleBags } from "@/lib/permissions";
import { coverSrc } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/common";
import { BagDialog } from "@/components/BagDialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/bags/")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } =>
    s["new"] ? { new: true } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "حقائب التدريب | أكاديمية صيدليات بلبع" },
      {
        name: "description",
        content:
          "الحقائب التدريبية لأكاديمية صيدليات بلبع ومستوياتها، بما فيها شروط صرف التعاقدات.",
      },
      { property: "og:title", content: "حقائب التدريب – أكاديمية بلبع" },
      { property: "og:description", content: "مسارات تدريبية للصيادلة وفرق البيع والإدارة." },
    ],
  }),
  component: BagsPage,
});

function BagsPage() {
  const { data, user } = useData();
  const learning = useLearning();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(!!search.new && can(user, "manage_bags"));
  const bags = visibleBags(user, data.bags).sort((a, b) => a.number - b.number);
  const isStudent = user.role === "trainee";

  const setDialog = (o: boolean) => {
    setOpen(o);
    if (!o && search.new) navigate({ to: "/bags", search: {}, replace: true });
  };

  return (
    <div>
      <PageHeader
        title="حقائب التدريب"
        subtitle="كل حقيبة مسار متكامل بمستويات متدرجة. افتح الحقيبة لعرض محاضراتها وترتيبها."
        actions={
          can(user, "manage_bags") && (
            <Button onClick={() => setOpen(true)}>
              <FolderPlus className="size-4" /> إضافة حقيبة جديدة
            </Button>
          )
        }
      />
      {isStudent && learning.error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <span>{learning.error}</span>
          <Button variant="outline" size="sm" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      )}
      {bags.length === 0 ? (
        <EmptyState
          icon={<FolderPlus />}
          title="لا توجد حقائب بعد"
          hint="أضف أول حقيبة تدريبية لتبدأ في تنظيم المحاضرات."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {bags.map((b) => {
            const count = data.lectures.filter(
              (l) =>
                l.bagId === b.id &&
                (isStudent ? l.status === "published" : l.status !== "archived"),
            ).length;
            const publishedLessons = data.lectures.filter(
              (lecture) => lecture.bagId === b.id && lecture.status === "published",
            );
            const courseProgress = learning.progressForLessons(
              publishedLessons.map((lecture) => lecture.id),
            );
            const enrolled = learning.isEnrolled(b.id);
            const learningReady = !isStudent || !learning.loading;
            return (
              <article
                key={b.id}
                className="surface flex flex-col overflow-hidden transition-shadow hover:shadow-lift"
              >
                <div className="relative">
                  <img
                    src={coverSrc(b.cover)}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                  <span
                    className={`absolute start-3 top-3 grid size-10 place-items-center rounded-xl text-lg font-bold text-primary-foreground ${b.number % 2 === 0 ? "bg-brand-red" : "bg-primary"}`}
                  >
                    {b.number}
                  </span>
                  {isStudent && learningReady && (
                    <span
                      className={`absolute end-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium ${enrolled ? "bg-secondary text-primary" : "bg-background/90 text-muted-foreground"}`}
                    >
                      {enrolled ? "مسجل" : "غير مسجل"}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-bold leading-snug text-primary">{b.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex gap-2">
                      <Users className="mt-0.5 size-4 shrink-0 text-brand-green" />
                      <dd>{b.audience}</dd>
                    </div>
                    <div className="flex gap-2">
                      <Layers className="mt-0.5 size-4 shrink-0 text-brand-green" />
                      <dd>{b.levels.map((l) => l.name).join(" ← ")}</dd>
                    </div>
                    {b.suggestedHours && (
                      <div className="flex gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-brand-green" />
                        <dd>{b.suggestedHours}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${b.priority === "first" ? "bg-secondary text-secondary-foreground" : "bg-warning-soft"}`}
                    >
                      {b.priority === "first" ? "الأولوية الأولى" : "الأولوية الثانية"}
                    </span>
                    <span className="text-xs text-muted-foreground">{count} محاضرة</span>
                  </div>
                  {isStudent && enrolled && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>تقدمك</span>
                        <span>
                          {courseProgress.completed} / {courseProgress.total} ·{" "}
                          {courseProgress.percent}%
                        </span>
                      </div>
                      <Progress value={courseProgress.percent} className="mt-1 h-2" />
                    </div>
                  )}
                  {isStudent ? (
                    !learningReady ? (
                      <Button variant="outline" className="mt-5 w-full" disabled>
                        <Loader2 className="size-4 animate-spin" /> جارٍ تحميل التسجيل…
                      </Button>
                    ) : enrolled ? (
                      <Button asChild className="mt-5 w-full">
                        <Link to="/learn/$bagId" params={{ bagId: b.id }}>
                          <PlayCircle className="size-4" /> متابعة التعلم
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="mt-5 w-full">
                        <Link to="/bags/$bagId" params={{ bagId: b.id }}>
                          التفاصيل والتسجيل <ArrowLeft className="size-4" />
                        </Link>
                      </Button>
                    )
                  ) : (
                    <Button asChild className="mt-5 w-full">
                      <Link to="/bags/$bagId" params={{ bagId: b.id }}>
                        عرض التفاصيل <ArrowLeft className="size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {can(user, "manage_bags") && <BagDialog open={open} onOpenChange={setDialog} />}
    </div>
  );
}
