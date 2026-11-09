import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  PlayCircle,
  Target,
  User,
  Users,
  BookMarked,
  Lightbulb,
  ClipboardCheck,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLearning } from "@/lib/learning/LearningProvider";
import { canEditBag } from "@/lib/permissions";
import { fmtDate, fmtDuration, youtubeEmbed } from "@/lib/format";
import { PageHeader, ReviewBadge, StatusBadge } from "@/components/common";
import { CourseEnrollCard } from "@/components/learning/CourseEnrollCard";
import { Button } from "@/components/ui/button";
import type { Lecture } from "@/lib/types";

export const Route = createFileRoute("/lectures/$lectureId/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "محاضرة | أكاديمية صيدليات بلبع" },
      { name: "description", content: "محتوى المحاضرة ومرفقاتها واختبارها." },
      { property: "og:title", content: "محاضرة – أكاديمية بلبع" },
      { property: "og:description", content: "محتوى المحاضرة ومرفقاتها واختبارها." },
    ],
  }),
  component: LecturePage,
});

function Quiz({ quiz }: { quiz: NonNullable<Lecture["quiz"]> }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = Math.round(
    (quiz.questions.filter((q) => answers[q.id] === q.correct).length / quiz.questions.length) *
      100,
  );
  const passed = score >= quiz.passScore;
  return (
    <div className="space-y-4">
      {quiz.questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">
            {i + 1}. {q.text}{" "}
            <span className="text-xs text-muted-foreground">
              ({q.type === "tf" ? "صح / خطأ" : "اختيار من متعدد"})
            </span>
          </legend>
          <div className="mt-2 grid gap-2">
            {q.options.map((o, oi) => {
              const state = submitted
                ? oi === q.correct
                  ? "border-brand-green bg-secondary"
                  : answers[q.id] === oi
                    ? "border-destructive bg-brand-blush"
                    : ""
                : answers[q.id] === oi
                  ? "border-primary bg-secondary"
                  : "";
              return (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm ${state}`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    disabled={submitted}
                    checked={answers[q.id] === oi}
                    onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                    className="accent-primary"
                  />
                  {o}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      {submitted ? (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${passed ? "bg-secondary text-primary" : "bg-brand-blush text-brand-red"}`}
        >
          نتيجتك {score}% — {passed ? "ناجح" : `لم تصل لدرجة النجاح (${quiz.passScore}%)`}
          <Button
            size="sm"
            variant="outline"
            className="ms-3"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <Button
          disabled={Object.keys(answers).length < quiz.questions.length}
          onClick={() => setSubmitted(true)}
        >
          تسليم الإجابات
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        درجة النجاح: {quiz.passScore}%. حفظ المحاولات ونتائج المتدربين سيُضاف في مرحلة الاختبارات.
      </p>
    </div>
  );
}

function LecturePage() {
  const { lectureId } = Route.useParams();
  const { data, user } = useData();
  const learning = useLearning();
  const [enrolling, setEnrolling] = useState(false);
  const [marking, setMarking] = useState(false);
  const lec = data.lectures.find((l) => l.id === lectureId);
  const bag = data.bags.find((b) => b.id === lec?.bagId);

  if (!lec || !bag || (user.role === "trainee" && lec.status !== "published")) {
    return (
      <div className="surface p-10 text-center">
        <p className="font-bold">هذه المحاضرة غير متاحة.</p>
        <Button asChild className="mt-4">
          <Link to="/lectures">العودة للمكتبة</Link>
        </Button>
      </div>
    );
  }

  const isStudent = user.role === "trainee";
  const learningReady = !isStudent || !learning.loading;
  const enrolled = !isStudent || learning.isEnrolled(bag.id);
  const completed = learning.isLessonCompleted(lec.id);

  const enrollNow = async () => {
    setEnrolling(true);
    const ok = await learning.enroll(bag.id);
    setEnrolling(false);
    if (ok) toast.success("تم التسجيل في الحقيبة. يمكنك البدء الآن.");
  };

  if (isStudent && learning.loading) {
    return (
      <div>
        <PageHeader
          crumbs={[
            { label: "حقائب التدريب", to: "/bags" },
            { label: bag.title, to: "/bags/$bagId", params: { bagId: bag.id } },
            { label: lec.title },
          ]}
          title={lec.title}
        />
        <div className="surface flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand-green" />
          جارٍ تحميل حالة التسجيل والتقدم…
        </div>
      </div>
    );
  }

  if (isStudent && learning.error && !enrolled) {
    return (
      <div>
        <PageHeader
          crumbs={[
            { label: "حقائب التدريب", to: "/bags" },
            { label: bag.title, to: "/bags/$bagId", params: { bagId: bag.id } },
            { label: lec.title },
          ]}
          title={lec.title}
        />
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

  if (isStudent && learningReady && !enrolled) {
    return (
      <div>
        <PageHeader
          crumbs={[
            { label: "حقائب التدريب", to: "/bags" },
            { label: bag.title, to: "/bags/$bagId", params: { bagId: bag.id } },
            { label: lec.title },
          ]}
          title={lec.title}
        />
        <CourseEnrollCard course={bag} busy={enrolling} onEnroll={() => void enrollNow()} />
      </div>
    );
  }

  const toggleCompleted = async () => {
    setMarking(true);
    const ok = await learning.setCompleted({
      courseId: bag.id,
      lessonId: lec.id,
      completed: !completed,
    });
    setMarking(false);
    if (ok) {
      toast.success(completed ? "تم إلغاء إكمال الدرس" : "تم إكمال الدرس");
    }
  };

  const level = bag.levels.find((l) => l.id === lec.levelId);
  const embed = lec.videoUrl ? youtubeEmbed(lec.videoUrl) : null;
  const directVideo =
    Boolean(lec.videoUrl) &&
    (Boolean(lec.videoPath) ||
      /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(lec.videoUrl) ||
      lec.videoUrl.includes("/storage/v1/object/sign/"));
  const images = lec.attachments.filter((a) => a.kind === "image");
  const files = lec.attachments.filter((a) => a.kind !== "image");

  const Block = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: typeof Target;
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="surface p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Icon className="size-5 text-brand-green" /> {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "حقائب التدريب", to: "/bags" },
          { label: bag.title, to: "/bags/$bagId", params: { bagId: bag.id } },
          { label: lec.title },
        ]}
        title={lec.title}
        actions={
          <>
            {isStudent && learningReady && enrolled && (
              <Button
                variant={completed ? "outline" : "default"}
                onClick={() => void toggleCompleted()}
                disabled={marking}
              >
                {marking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : completed ? (
                  <Circle className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {completed ? "إلغاء إكمال الدرس" : "إكمال الدرس"}
              </Button>
            )}
            {(!isStudent || (learningReady && enrolled)) && (
              <Button asChild variant="outline">
                <Link to="/learn/$bagId" params={{ bagId: bag.id }} search={{ lesson: lec.id }}>
                  <PlayCircle className="size-4" /> مشغل الحقيبة
                </Link>
              </Button>
            )}
            {canEditBag(user, bag.id) && (
              <Button asChild>
                <Link to="/lectures/$lectureId/edit" params={{ lectureId: lec.id }}>
                  <Pencil className="size-4" /> تعديل
                </Link>
              </Button>
            )}
          </>
        }
      />
      {learning.error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <span>{learning.error}</span>
          <Button variant="outline" size="sm" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <StatusBadge status={lec.status} />
        <ReviewBadge review={lec.review} />
        {lec.review === "approved" && lec.reviewer && <span>اعتمدها: {lec.reviewer}</span>}
        <span>· المستوى: {level?.name}</span>
        <span>· آخر تحديث {fmtDate(lec.updatedAt)}</span>
      </div>

      {bag.medical && (
        <div className="mb-6 flex gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-warning" />
          <p>
            هذا محتوى تعليمي للتدريب المهني فقط، ولا يُعد قراراً علاجياً أو نصيحة طبية لمريض بعينه.
            يجب الرجوع للبروتوكولات المعتمدة وتقدير الصيدلي المختص في كل حالة.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {lec.description && (
            <section className="surface p-6 leading-loose">{lec.description}</section>
          )}
          {embed ? (
            <div className="surface overflow-hidden">
              <iframe
                src={embed}
                title="فيديو المحاضرة"
                className="aspect-video w-full"
                allowFullScreen
              />
            </div>
          ) : directVideo ? (
            <div className="surface overflow-hidden">
              <video
                src={lec.videoUrl}
                controls
                preload="metadata"
                playsInline
                className="aspect-video w-full bg-black"
              />
            </div>
          ) : lec.videoUrl ? (
            <a
              href={lec.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="surface flex items-center gap-2 p-4 text-primary"
            >
              <ExternalLink className="size-4" /> فتح فيديو المحاضرة
            </a>
          ) : null}

          <Block icon={BookMarked} title="محتوى المحاضرة">
            {lec.sections.length ? (
              <div className="space-y-6">
                {lec.sections.map((s, i) => (
                  <article key={s.id}>
                    <h3 className="mb-2 font-bold text-primary">
                      {i + 1}. {s.heading}
                    </h3>
                    <p className="whitespace-pre-line leading-loose">{s.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                لم يُضف محتوى تفصيلي بعد.
                {canEditBag(user, bag.id) && " اضغط «تعديل» لإضافة أجزاء الشرح."}
              </p>
            )}
          </Block>

          {images.length > 0 && (
            <Block icon={FileText} title="صور وتوضيحات">
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((a) => (
                  <img
                    key={a.id}
                    src={a.url}
                    alt={a.name}
                    className="rounded-xl border"
                    loading="lazy"
                  />
                ))}
              </div>
            </Block>
          )}
          {lec.caseStudy && (
            <Block icon={Lightbulb} title="مثال عملي / دراسة حالة">
              <p className="whitespace-pre-line leading-loose">{lec.caseStudy}</p>
            </Block>
          )}
          <Block icon={ClipboardCheck} title="اختبار المعرفة">
            {lec.quiz ? (
              <Quiz quiz={lec.quiz} />
            ) : (
              <p className="text-sm text-muted-foreground">
                لا يوجد اختبار لهذه المحاضرة بعد. إنشاء الاختبارات سيتاح في المرحلة التالية.
              </p>
            )}
          </Block>
        </div>

        <aside className="space-y-6">
          {isStudent && learningReady && enrolled && (
            <section className="surface p-6">
              <h2 className="mb-2 flex items-center gap-2 font-bold">
                {completed ? (
                  <CheckCircle2 className="size-5 text-brand-green" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
                {completed ? "أكملت هذا الدرس" : "تقدمك في الدرس"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {completed
                  ? "يمكنك إلغاء الإكمال إذا احتجت لمراجعة الدرس لاحقاً."
                  : "بعد الانتهاء من مشاهدة الدرس ومحتواه، حدده كمكتمل ليُحفظ تقدمك."}
              </p>
              <Button
                className="mt-4 w-full"
                variant={completed ? "outline" : "default"}
                onClick={() => void toggleCompleted()}
                disabled={marking}
              >
                {marking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : completed ? (
                  <Circle className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {completed ? "إلغاء إكمال الدرس" : "إكمال الدرس"}
              </Button>
            </section>
          )}
          <section className="surface space-y-3 p-6 text-sm">
            <div className="flex gap-2">
              <User className="size-4 text-brand-green" /> المدرب: {lec.trainer}
            </div>
            <div className="flex gap-2">
              <Clock className="size-4 text-brand-green" /> المدة: {fmtDuration(lec.durationMin)}
            </div>
            <div className="flex gap-2">
              <Users className="size-4 text-brand-green" /> الفئة: {lec.audience}
            </div>
          </section>
          {lec.objectives.length > 0 && (
            <Block icon={Target} title="أهداف التعلم">
              <ul className="list-inside list-disc space-y-1.5 text-sm">
                {lec.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </Block>
          )}
          <Block icon={Download} title="المرفقات">
            {files.length ? (
              <ul className="space-y-2">
                {files.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      download={a.url.startsWith("data:") ? a.name : undefined}
                      className="flex items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted"
                    >
                      <FileText className="size-4 shrink-0 text-brand-red" />
                      <span className="truncate">{a.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد مرفقات.</p>
            )}
          </Block>
          <Block icon={BookMarked} title="المراجع والمصادر">
            {lec.references.length ? (
              <ul className="list-inside list-disc space-y-1.5 text-sm">
                {lec.references.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                لم تُضف مراجع بعد. تُضاف المراجع المعتمدة فقط بعد التحقق منها.
              </p>
            )}
          </Block>
        </aside>
      </div>
    </div>
  );
}
