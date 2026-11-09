import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AcademyData, Bag, DemoUser, Kpi, Lecture } from "@/lib/types";
import type { DataProvider } from "@/lib/data/provider";
import { StorageFullError } from "@/lib/data/provider";
import { localProvider } from "@/lib/data/local-provider";
import { onlineProvider } from "@/lib/data/online-provider";
import { createSeedData } from "@/lib/data/seed";
import { validateBackup } from "@/lib/backup";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createUuid, isUuid } from "@/lib/uuid";

const activeProvider: DataProvider = isSupabaseConfigured ? onlineProvider : localProvider;
const USER_KEY = "balbaa-academy:demo-user";

export const uid = (_prefix = "id") => createUuid();

interface Ctx {
  data: AcademyData | null;
  error: string | null;
  user: DemoUser | null;
  setUserId: (id: string) => void;
  saveBag: (bag: Bag) => Promise<boolean>;
  deleteBag: (id: string) => Promise<boolean>;
  saveLecture: (lec: Lecture) => Promise<boolean>;
  deleteLecture: (id: string) => Promise<boolean>;
  duplicateLecture: (id: string) => Promise<string | null>;
  moveLecture: (id: string, bagId: string, levelId: string) => Promise<boolean>;
  reorderLecture: (id: string, dir: -1 | 1) => Promise<boolean>;
  saveKpi: (kpi: Kpi) => Promise<boolean>;
  updateSettings: (s: AcademyData["settings"]) => Promise<boolean>;
  importData: (raw: unknown) => Promise<boolean>;
  resetDemo: () => Promise<void>;
}

const AcademyContext = createContext<Ctx | null>(null);

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { identity } = useAuth();
  const queryClient = useQueryClient();
  const [userId, setUserIdState] = useState("u-admin");
  const dataRef = useRef<AcademyData | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(USER_KEY);
    if (stored) setUserIdState(stored);
  }, []);

  const queryKey = useMemo(
    () => ["academy-data", activeProvider.name, identity?.id ?? "anonymous"] as const,
    [identity?.id],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const loaded = await activeProvider.load();
      const value = loaded ?? createSeedData();
      if (!loaded && identity) await activeProvider.save(value);
      return value;
    },
    enabled: true,
    staleTime: 30_000,
    retry: 1,
  });

  const data = query.data ?? null;
  const error = query.error
    ? query.error instanceof Error && /[\u0600-\u06FF]/.test(query.error.message)
      ? query.error.message
      : "تعذر تحميل بيانات الأكاديمية. تأكد من تطبيق ترحيلات Supabase أو حاول مرة أخرى."
    : null;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (query.error) console.error("Academy data load failed", query.error);
  }, [query.error]);

  const commit = useCallback(
    async (next: AcademyData, activity?: string) => {
      if (activity) {
        next = {
          ...next,
          activities: [
            { id: uid("a"), text: activity, at: new Date().toISOString() },
            ...next.activities,
          ].slice(0, 30),
        };
      }
      try {
        await activeProvider.save(next);
        dataRef.current = next;
        queryClient.setQueryData(queryKey, next);
        return true;
      } catch (e) {
        console.error("Academy data save failed", e);
        toast.error(
          e instanceof StorageFullError
            ? "مساحة الحفظ في المتصفح ممتلئة. استخدم روابط للملفات الكبيرة بدلاً من رفعها."
            : e instanceof Error && /[\u0600-\u06FF]/.test(e.message)
              ? e.message
              : "تعذر حفظ التغييرات. حاول مرة أخرى.",
        );
        return false;
      }
    },
    [queryClient, queryKey],
  );

  const cur = () => dataRef.current!;

  const api = useMemo<Omit<Ctx, "data" | "error" | "user" | "setUserId">>(
    () => ({
      saveBag: (bag) => {
        const d = cur();
        const existing = d.bags.find((b) => b.id === bag.id);
        // A preset or data URL replaces a hosted thumbnail. Uploaded storage
        // thumbnails keep their path (and use a signed URL as the preview).
        const stored =
          bag.cover.startsWith("preset:") || bag.cover.startsWith("data:")
            ? withoutThumbnailPath(bag)
            : bag;
        return commit(
          {
            ...d,
            bags: existing
              ? d.bags.map((b) => (b.id === bag.id ? stored : b))
              : [...d.bags, stored],
          },
          existing ? `تم تعديل حقيبة «${bag.title}»` : `تمت إضافة حقيبة «${bag.title}»`,
        );
      },
      deleteBag: (id) => {
        const d = cur();
        const bag = d.bags.find((b) => b.id === id);
        return commit(
          {
            ...d,
            bags: d.bags.filter((b) => b.id !== id),
            lectures: d.lectures.filter((l) => l.bagId !== id),
          },
          `تم حذف حقيبة «${bag?.title ?? ""}»`,
        );
      },
      saveLecture: (lec) => {
        const d = cur();
        const existing = d.lectures.find((l) => l.id === lec.id);
        const stamped = { ...lec, updatedAt: new Date().toISOString() };
        if (!existing) {
          stamped.order =
            d.lectures.filter((l) => l.bagId === lec.bagId && l.levelId === lec.levelId).length + 1;
        }
        // The lesson editor owns the video source: switching to an external URL
        // or removing the upload clears `videoPath` before saving. Trust the
        // presence of the path instead of comparing signed preview URLs, which
        // are refreshed independently and can differ between loads.
        const stored = stamped;
        return commit(
          {
            ...d,
            lectures: existing
              ? d.lectures.map((l) => (l.id === lec.id ? stored : l))
              : [...d.lectures, stored],
          },
          existing ? `تم تعديل محاضرة «${lec.title}»` : `تمت إضافة محاضرة «${lec.title}»`,
        );
      },
      deleteLecture: (id) => {
        const d = cur();
        const lec = d.lectures.find((l) => l.id === id);
        return commit(
          { ...d, lectures: normalize(d.lectures.filter((l) => l.id !== id)) },
          `تم حذف محاضرة «${lec?.title ?? ""}»`,
        );
      },
      duplicateLecture: async (id) => {
        const d = cur();
        const src = d.lectures.find((l) => l.id === id);
        if (!src) return null;
        const now = new Date().toISOString();
        const copy: Lecture = {
          ...structuredClone(src),
          id: uid("lec"),
          title: `${src.title} (نسخة)`,
          status: "draft",
          review: src.review === "not_required" ? "not_required" : "pending",
          reviewer: "",
          order:
            d.lectures.filter((l) => l.bagId === src.bagId && l.levelId === src.levelId).length + 1,
          createdAt: now,
          updatedAt: now,
        };
        const ok = await commit(
          { ...d, lectures: [...d.lectures, copy] },
          `تم نسخ محاضرة «${src.title}»`,
        );
        return ok ? copy.id : null;
      },
      moveLecture: (id, bagId, levelId) => {
        const d = cur();
        const target = d.bags.find((b) => b.id === bagId);
        const order =
          d.lectures.filter((l) => l.bagId === bagId && l.levelId === levelId && l.id !== id)
            .length + 1;
        const lectures = normalize(
          d.lectures.map((l) =>
            l.id === id
              ? {
                  ...l,
                  bagId,
                  levelId,
                  order,
                  review: target?.medical && l.review === "not_required" ? "pending" : l.review,
                  updatedAt: new Date().toISOString(),
                }
              : l,
          ),
        );
        return commit({ ...d, lectures }, `تم نقل محاضرة إلى «${target?.title ?? ""}»`);
      },
      reorderLecture: (id, dir) => {
        const d = cur();
        const lec = d.lectures.find((l) => l.id === id);
        if (!lec) return Promise.resolve(false);
        const group = d.lectures
          .filter((l) => l.bagId === lec.bagId && l.levelId === lec.levelId)
          .sort((a, b) => a.order - b.order);
        const i = group.findIndex((l) => l.id === id);
        const j = i + dir;
        if (j < 0 || j >= group.length) return Promise.resolve(false);
        const a = group[i],
          b = group[j];
        if (!a || !b) return Promise.resolve(false);
        const lectures = d.lectures.map((l) =>
          l.id === a.id ? { ...l, order: b.order } : l.id === b.id ? { ...l, order: a.order } : l,
        );
        return commit({ ...d, lectures });
      },
      saveKpi: (kpi) => {
        const d = cur();
        const exists = d.kpis.some((k) => k.id === kpi.id);
        return commit(
          {
            ...d,
            kpis: exists ? d.kpis.map((k) => (k.id === kpi.id ? kpi : k)) : [...d.kpis, kpi],
          },
          `تم تحديث تعريف مؤشر ${kpi.label}`,
        );
      },
      updateSettings: (settings) => commit({ ...cur(), settings }, "تم تحديث بيانات الأكاديمية"),
      importData: async (raw) => {
        const res = validateBackup(raw);
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        if (isSupabaseConfigured) {
          const bagIds = new Set(res.data.bags.map((bag) => bag.id));
          const legacy =
            res.data.bags.some((bag) => !isUuid(bag.id)) ||
            res.data.lectures.some((lecture) => !isUuid(lecture.id) || !bagIds.has(lecture.bagId));
          if (legacy) {
            toast.error(
              "هذه النسخة من الوضع التجريبي القديم. أنشئ الحقائب من جديد أو استخدم نسخة احتياطية متوافقة مع Supabase.",
            );
            return false;
          }
        }
        return commit(res.data, "تمت استعادة نسخة احتياطية");
      },
      resetDemo: async () => {
        if (isSupabaseConfigured) {
          toast.error(
            "إعادة الضبط التجريبي غير متاحة بعد ربط Supabase. احذف الحقائب من واجهة الإدارة بدلاً من ذلك.",
          );
          return;
        }
        await activeProvider.reset();
        if (typeof window !== "undefined") {
          for (const key of Object.keys(window.localStorage)) {
            if (key.startsWith("balbaa-academy:learning:")) {
              window.localStorage.removeItem(key);
            }
          }
        }
        queryClient.removeQueries({ queryKey: ["learning"] });
        const seed = createSeedData();
        await commit(seed);
      },
    }),
    [commit, queryClient],
  );

  const setUserId = (id: string) => {
    setUserIdState(id);
    window.localStorage.setItem(USER_KEY, id);
  };

  // Bridge the authenticated profile into the prototype's DemoUser shape so the
  // The hosted catalog stays visible to students so they can browse and enroll.
  // Learning pages use enrollment/progress from LearningProvider for access gates.
  const user = useMemo<DemoUser | null>(() => {
    if (identity) {
      const isAdmin = identity.role === "admin";
      return {
        id: identity.id,
        name: identity.fullName,
        role: isAdmin ? "admin" : "trainee",
        title: isAdmin ? "مدير الأكاديمية" : "متدرب",
        bagIds: isAdmin ? [] : (data?.bags.map((bag) => bag.id) ?? []),
      };
    }
    if (!data) return null;
    return {
      id: "guest",
      name: "زائر",
      role: "trainee",
      title: "زائر",
      bagIds: data.bags.map((bag) => bag.id),
    };
  }, [identity, data]);

  return (
    <AcademyContext.Provider value={{ data, error, user, setUserId, ...api }}>
      {children}
    </AcademyContext.Provider>
  );
}

function withoutThumbnailPath(bag: Bag): Bag {
  const { thumbnailPath: _thumbnailPath, ...rest } = bag;
  return rest;
}

function normalize(lectures: Lecture[]): Lecture[] {
  const groups: Record<string, Lecture[]> = {};
  lectures.forEach((l) => (groups[`${l.bagId}:${l.levelId}`] ??= []).push(l));
  const orderMap = new Map<string, number>();
  Object.values(groups).forEach((g) =>
    g.sort((a, b) => a.order - b.order).forEach((l, i) => orderMap.set(l.id, i + 1)),
  );
  return lectures.map((l) => ({ ...l, order: orderMap.get(l.id) ?? l.order }));
}

export function useAcademy() {
  const ctx = useContext(AcademyContext);
  if (!ctx) throw new Error("useAcademy must be used inside AcademyProvider");
  return ctx;
}

/** Use inside pages rendered by AppShell (which waits for data to load). */
export function useData() {
  const ctx = useAcademy();
  return { ...ctx, data: ctx.data!, user: ctx.user! };
}
