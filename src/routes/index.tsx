import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  FolderKanban,
  Library,
  Plus,
  Users,
  Activity,
  Download,
  Gauge,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PlayCircle,
} from "lucide-react";
import hero from "@/assets/hero_pharmacist.jpg";
import { useData } from "@/lib/store";
import { useLearning } from "@/lib/learning/LearningProvider";
import { can, visibleBags } from "@/lib/permissions";
import { coverSrc, fmtDate, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الرئيسية | أكاديمية صيدليات بلبع" },
      { name: "description", content: "لوحة متابعة الأكاديمية التدريبية لسلسلة صيدليات بلبع." },
      { property: "og:title", content: "أكاديمية صيدليات بلبع التدريبية" },
      { property: "og:description", content: "معرفة .. مهارة .. أداء أعلى" },
    ],
  }),
  component: Dashboard,
});

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-6" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data, user } = useData();
  const learning = useLearning();
  const isStudent = user.role === "trainee";
  const bags = visibleBags(user, data.bags);
  const lectures = data.lectures.filter((l) => bags.some((b) => b.id === l.bagId));
  const published = lectures.filter((l) => l.status === "published").length;
  const avg = data.trainees.length
    ? Math.round(data.trainees.reduce((s, t) => s + t.completion, 0) / data.trainees.length)
    : 0;
  const pending = lectures.filter((l) => l.review === "pending").length;
  const upcoming = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const enrolledBags = isStudent ? bags.filter((b) => learning.isEnrolled(b.id)) : [];
  const enrolledLessonIds = enrolledBags.flatMap((b) =>
    data.lectures
      .filter((lecture) => lecture.bagId === b.id && lecture.status === "published")
      .map((lecture) => lecture.id),
  );
  const studentProgress = learning.progressForLessons(enrolledLessonIds);
  const firstEnrolled = enrolledBags[0];

  return (
    <div className="space-y-8">
      <section className="surface relative overflow-hidden">
        <img
          src={hero}
          alt=""
          width={1600}
          height={640}
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div className="relative flex min-h-64 flex-col justify-center p-6 md:min-h-72 md:w-3/5 md:p-10">
          <p className="text-sm font-medium text-brand-green">مرحباً، {user.name}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-primary md:text-5xl">
            {data.settings.name}
          </h1>
          <p className="mt-2 text-xl font-bold text-foreground md:text-2xl">
            {data.settings.tagline}
          </p>
          <p className="mt-3 text-brand-green">{data.settings.motto}</p>
          {isStudent ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {firstEnrolled ? (
                <Button asChild>
                  <Link to="/learn/$bagId" params={{ bagId: firstEnrolled.id }}>
                    <PlayCircle className="size-4" /> متابعة التعلم
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/bags">
                    <FolderKanban className="size-4" /> استعراض الحقائب والتسجيل
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/bags">كل الحقائب</Link>
              </Button>
            </div>
          ) : (
            can(user, "manage_lectures") && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/lectures/new">
                    <Plus className="size-4" /> إضافة محاضرة جديدة
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/bags">استعراض الحقائب</Link>
                </Button>
              </div>
            )
          )}
        </div>
      </section>

      {learning.error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <span>{learning.error}</span>
          <Button variant="outline" size="sm" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isStudent ? (
          <>
            <Stat
              icon={FolderKanban}
              label="حقائب مسجلة"
              value={enrolledBags.length}
              tone="bg-secondary text-primary"
            />
            <Stat
              icon={Library}
              label="محاضرات متاحة"
              value={studentProgress.total}
              tone="bg-brand-blush text-brand-red"
            />
            <Stat
              icon={CheckCircle2}
              label="محاضرات مكتملة"
              value={studentProgress.completed}
              tone="bg-secondary text-primary"
            />
            <Stat
              icon={Gauge}
              label="متوسط إنجازك"
              value={`${studentProgress.percent}%`}
              tone="bg-warning-soft text-foreground"
            />
          </>
        ) : (
          <>
            <Stat
              icon={FolderKanban}
              label="حقائب تدريبية"
              value={bags.length}
              tone="bg-secondary text-primary"
            />
            <Stat
              icon={Library}
              label={`محاضرة (${published} منشورة)`}
              value={lectures.length}
              tone="bg-brand-blush text-brand-red"
            />
            <Stat
              icon={Users}
              label="متدرب"
              value={data.trainees.length}
              tone="bg-secondary text-primary"
            />
            <Stat
              icon={Gauge}
              label="متوسط إنجاز التدريب"
              value={`${avg}%`}
              tone="bg-warning-soft text-foreground"
            />
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {isStudent ? (
          <section className="surface p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">متابعة التعلم</h2>
              <Link to="/bags" className="flex items-center gap-1 text-sm text-brand-green">
                كل الحقائب <ArrowLeft className="size-4" />
              </Link>
            </div>
            {learning.loading ? (
              <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-brand-green" /> جارٍ تحميل حقائبك…
              </div>
            ) : enrolledBags.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">لم تسجل في أي حقيبة بعد.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  استعرض الحقائب المتاحة وسجل في الحقيبة المناسبة لتبدأ التعلم وتتابع تقدمك.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/bags">
                    <FolderKanban className="size-4" /> استعراض الحقائب
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {enrolledBags.map((b) => {
                  const lessonIds = data.lectures
                    .filter((lecture) => lecture.bagId === b.id && lecture.status === "published")
                    .map((lecture) => lecture.id);
                  const p = learning.progressForLessons(lessonIds);
                  return (
                    <Link
                      key={b.id}
                      to="/learn/$bagId"
                      params={{ bagId: b.id }}
                      className="flex items-center gap-4 rounded-xl p-2 hover:bg-muted"
                    >
                      <img
                        src={coverSrc(b.cover)}
                        alt=""
                        className="size-12 shrink-0 rounded-xl object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{b.title}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {p.percent}% · {p.completed}/{p.total}
                          </span>
                        </div>
                        <Progress value={p.percent} className="mt-2 h-2" />
                      </div>
                      <PlayCircle className="size-5 shrink-0 text-brand-green" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="surface p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">نسب الإنجاز حسب الحقيبة</h2>
              <Link to="/bags" className="flex items-center gap-1 text-sm text-brand-green">
                عرض الكل <ArrowLeft className="size-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {bags.map((b) => {
                const ts = data.trainees.filter((t) => t.bagIds.includes(b.id));
                const pct = ts.length
                  ? Math.round(ts.reduce((s, t) => s + t.completion, 0) / ts.length)
                  : 0;
                return (
                  <Link
                    key={b.id}
                    to="/bags/$bagId"
                    params={{ bagId: b.id }}
                    className="flex items-center gap-4 rounded-xl p-2 hover:bg-muted"
                  >
                    <img
                      src={coverSrc(b.cover)}
                      alt=""
                      className="size-12 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{b.title}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {pct}% · {ts.length} متدرب
                        </span>
                      </div>
                      <Progress value={pct} className="mt-2 h-2" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="surface p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <CalendarDays className="size-5 text-brand-green" /> الجلسات القادمة
          </h2>
          <ul className="space-y-3">
            {upcoming.map((s) => (
              <li key={s.id} className="rounded-xl border p-3">
                <div className="font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {fmtDate(s.date)} · {s.place}
                </div>
                <div className="mt-1 text-xs text-brand-green">
                  {data.bags.find((b) => b.id === s.bagId)?.title}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="surface p-6 xl:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Activity className="size-5 text-brand-red" /> آخر النشاطات
          </h2>
          <ul className="divide-y">
            {data.activities.slice(0, 6).map((a) => (
              <li key={a.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>{a.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.at)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface p-6">
          <h2 className="mb-4 text-lg font-bold">إجراءات سريعة</h2>
          <div className="grid gap-2">
            {can(user, "manage_lectures") && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/lectures/new">
                  <Plus className="size-4" /> إضافة محاضرة جديدة
                </Link>
              </Button>
            )}
            {can(user, "manage_bags") && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/bags" search={{ new: true }}>
                  <FolderKanban className="size-4" /> إضافة حقيبة تدريبية
                </Link>
              </Button>
            )}
            {isStudent && firstEnrolled && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/learn/$bagId" params={{ bagId: firstEnrolled.id }}>
                  <PlayCircle className="size-4" /> متابعة التعلم
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="justify-start">
              <Link to="/lectures">
                <Library className="size-4" /> فتح مكتبة المحاضرات
              </Link>
            </Button>
            {can(user, "manage_settings") && (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/settings">
                  <Download className="size-4" /> أخذ نسخة احتياطية
                </Link>
              </Button>
            )}
          </div>
          {pending > 0 && can(user, "approve_medical") && (
            <Link
              to="/lectures"
              search={{ review: "pending" }}
              className="mt-4 block rounded-xl bg-brand-blush p-3 text-sm text-brand-red"
            >
              {pending} محاضرة بانتظار المراجعة الطبية ←
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
