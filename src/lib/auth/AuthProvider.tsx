import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isSupabaseConfigured, requireSupabase, supabase } from "@/lib/supabase/client";
import {
  clearDemoIdentity,
  demoIdentity,
  identityFromSession,
  persistDemoIdentity,
  resolveIdentity,
  setCachedIdentity,
  type AuthIdentity,
  type ProfileRole,
} from "./identity";

interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  identity: AuthIdentity | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  updateAvatarUrl: (avatarUrl: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  demoSignIn: (role: ProfileRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    resolveIdentity(true)
      .then((next) => {
        if (cancelled) return;
        setIdentity(next);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Could not load the authenticated profile", error);
        setCachedIdentity(null);
        setIdentity(null);
        setLoading(false);
      });

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase warns against awaiting other Supabase calls inside this callback.
      // Defer profile hydration so token refresh / sign-out cannot deadlock.
      window.setTimeout(() => {
        void (async () => {
          if (cancelled) return;
          if (!session) {
            setCachedIdentity(null);
            setIdentity(null);
            setLoading(false);
            return;
          }
          const next = await identityFromSession(session);
          if (cancelled) return;
          setCachedIdentity(next);
          setIdentity(next);
          setLoading(false);
        })().catch((error: unknown) => {
          if (cancelled) return;
          console.error("Could not refresh the authenticated profile", error);
          setCachedIdentity(null);
          setIdentity(null);
          setLoading(false);
        });
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const updateAvatarUrl = useCallback(
    (avatarUrl: string) => {
      if (!identity) throw new Error("تعذر تحديث الصورة دون جلسة مستخدم.");
      const next = { ...identity, avatarUrl };
      setCachedIdentity(next);
      setIdentity(next);
    },
    [identity],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("تعذر بدء الجلسة. حاول مرة أخرى.");
    const next = await identityFromSession(data.session);
    setCachedIdentity(next);
    setIdentity(next);
    setLoading(false);
  }, []);

  const signUp = useCallback(async ({ fullName, email, password }: SignUpInput) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        ...(typeof window !== "undefined"
          ? { emailRedirectTo: `${window.location.origin}/login` }
          : {}),
      },
    });
    if (error) throw new Error(error.message);

    if (data.session) {
      const next = await identityFromSession(data.session);
      setCachedIdentity(next);
      setIdentity(next);
      setLoading(false);
      return { needsEmailConfirmation: false };
    }
    return { needsEmailConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      }
    } finally {
      clearDemoIdentity();
      setCachedIdentity(null);
      setIdentity(null);
      setLoading(false);
    }
  }, []);

  const demoSignIn = useCallback(async (role: ProfileRole) => {
    if (isSupabaseConfigured) throw new Error("الوضع التجريبي غير متاح بعد ربط Supabase.");
    const next = demoIdentity(role);
    persistDemoIdentity(next);
    setCachedIdentity(next);
    setIdentity(next);
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      identity,
      loading,
      configured: isSupabaseConfigured,
      isAdmin: identity?.role === "admin",
      updateAvatarUrl,
      signIn,
      signUp,
      signOut,
      demoSignIn,
    }),
    [identity, loading, updateAvatarUrl, signIn, signUp, signOut, demoSignIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
