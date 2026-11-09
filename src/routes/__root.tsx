import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AcademyProvider } from "@/lib/store";
import { LearningProvider } from "@/lib/learning/LearningProvider";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { isAuthRoute } from "@/lib/auth/identity";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ربما تم حذف هذه الصفحة أو تغيير رابطها.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">حدث خطأ أثناء تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          يمكنك إعادة المحاولة أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            إعادة المحاولة
          </button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium">
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "أكاديمية صيدليات بلبع التدريبية" },
      { name: "description", content: "منصة التدريب الداخلية لسلسلة صيدليات بلبع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
        <Toaster position="top-center" dir="rtl" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGate() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { identity, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const revalidated = useRef(false);
  const authRoute = isAuthRoute(pathname);

  useEffect(() => {
    if (loading || revalidated.current) return;
    revalidated.current = true;
    void router.invalidate();
  }, [loading, router]);

  useEffect(() => {
    if (loading) return;
    if (authRoute) {
      if (identity) navigate({ to: "/", replace: true });
    }
  }, [authRoute, identity, loading, navigate]);

  if (authRoute) return loading || identity ? <AuthLoading /> : <Outlet />;

  if (loading) return <AuthLoading />;

  return (
    <AcademyProvider>
      <LearningProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </LearningProvider>
    </AcademyProvider>
  );
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-background px-4 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-brand-green" />
      جارٍ التحقق من الجلسة…
    </div>
  );
}
