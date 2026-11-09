import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BarChart3, BookOpen, ClipboardCheck, FolderKanban, Gauge, Home, Library, Menu, Search, Settings, Users, AlertTriangle, ChevronDown, LogOut, FlaskConical,
} from "lucide-react";
import { useAcademy } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROLE_LABEL, can } from "@/lib/permissions";
import { BrandLogo } from "@/components/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/bags", label: "حقائب التدريب", icon: FolderKanban },
  { to: "/lectures", label: "مكتبة المحاضرات", icon: Library },
  { to: "/kpis", label: "مؤشرات الأداء", icon: Gauge },
] as const;

const SOON = [
  { label: "المتدربون", icon: Users },
  { label: "الاختبارات", icon: ClipboardCheck },
  { label: "التقارير", icon: BarChart3 },
];

function SidebarNav({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAcademy();
  const active = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  const item = "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors";
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((n) => (
        <Link key={n.to} to={n.to} onClick={onNavigate}
          className={`${item} ${active(n.to) ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lift" : "text-sidebar-foreground/85 hover:bg-sidebar-accent"}`}>
          <n.icon className="size-5 shrink-0" />
          {n.label}
        </Link>
      ))}
      {user && can(user, "manage_settings") && (
        <Link to="/settings" onClick={onNavigate}
          className={`${item} ${active("/settings") ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lift" : "text-sidebar-foreground/85 hover:bg-sidebar-accent"}`}>
          <Settings className="size-5 shrink-0" />
          الإعدادات
        </Link>
      )}
      <div className="mt-6 px-4 pb-2 text-xs text-sidebar-foreground/50">المرحلة التالية</div>
      {SOON.map((s) => (
        <div key={s.label} className={`${item} cursor-default text-sidebar-foreground/40`} aria-disabled>
          <s.icon className="size-5 shrink-0" />
          {s.label}
          <span className="ms-auto rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px]">قريباً</span>
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { user } = useAcademy();
  const { identity } = useAuth();
  const initial = user?.name.replace(/^(د\.|أ\.)\s*/, "").charAt(0) || "؟";
  return (
    <div className="sidebar-sheen flex h-full flex-col py-6 text-sidebar-foreground">
      <div className="mb-6 flex items-center gap-3 px-6">
        <Avatar className="size-11">
          <AvatarImage src={identity?.avatarUrl ?? undefined} alt="الصورة الشخصية" />
          <AvatarFallback className="bg-sidebar-accent text-lg font-bold text-sidebar-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-xs text-sidebar-foreground/60">مرحباً</div>
          <div className="truncate font-bold">{user?.name ?? "…"}</div>
          <div className="truncate text-xs text-sidebar-foreground/60">{user?.title}</div>
        </div>
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="px-6 pt-6 font-display text-3xl italic text-sidebar-foreground/25" aria-hidden>Balbaa</div>
    </div>
  );
}

function AccountMenu() {
  const { user } = useAcademy();
  const { identity, signOut, configured } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const initial = user.name.replace(/^(د\.|أ\.)\s*/, "").charAt(0) || "؟";
  const signOutNow = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  if (!identity) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link to="/login">تسجيل الدخول</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full">
          <Avatar className="size-5">
            <AvatarImage src={identity?.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-secondary text-[11px] font-bold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{user.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {ROLE_LABEL[user.role]}
            {identity?.email ? ` · ${identity.email}` : ""}
          </span>
        </DropdownMenuLabel>
        {!configured && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <FlaskConical className="size-3.5 text-brand-red" /> وضع العرض التجريبي — البيانات محفوظة في هذا المتصفح
            </DropdownMenuLabel>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOutNow} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="size-4" /> تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data, error } = useAcademy();
  const { configured } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="فتح القائمة">
              <Menu className="size-5" />
            </Button>
            <Link to="/" className="shrink-0">
              <BrandLogo className="h-14 w-auto object-contain rounded-md" />
            </Link>
            <form
              className="relative hidden max-w-md flex-1 md:block"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/lectures", search: { q } });
              }}
            >
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن محاضرة…" className="field rounded-full pe-9" />
            </form>
            <div className="ms-auto"><AccountMenu /></div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {error ? (
            <div className="surface mx-auto max-w-lg p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" />
              <p className="font-bold">{error}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>إعادة المحاولة</Button>
            </div>
          ) : !data ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground md:px-8">
          <BookOpen className="me-1 inline size-3" />
          {configured
            ? "أكاديمية صيدليات بلبع التدريبية — جميع الحقوق محفوظة."
            : "نسخة تجريبية للمراجعة — البيانات محفوظة في هذا المتصفح فقط. احرص على أخذ نسخة احتياطية من الإعدادات."}
        </footer>
      </div>
    </div>
  );
}
