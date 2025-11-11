"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import supabase from "@/lib/supabase";
import { apiClient } from "@/lib/api";
import { UserInteractionStatus } from "@/types/subscription";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  interactionStatus: UserInteractionStatus | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshInteractionStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type UserProfileRow = {
  name?: string | null;
  email?: string | null;
};

const translateAuthError = (message: string) => {
  const translations: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos",
    "Email not confirmed":
      "Email não confirmado. Verifique sua caixa de entrada.",
    "User already registered": "Usuário já cadastrado com este email",
    "Password should be at least 6 characters":
      "Senha deve ter pelo menos 6 caracteres",
    "Unable to validate email address: invalid format":
      "Formato de email inválido",
    "Signup is disabled": "Cadastro desabilitado temporariamente",
    "Email rate limit exceeded":
      "Muitas tentativas. Tente novamente em alguns minutos.",
  };

  return translations[message] || message;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [interactionStatus, setInteractionStatus] =
    useState<UserInteractionStatus | null>(null);

  const login = async (email: string, password: string) => {
    setAuthLoading(true);

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setUser(data?.user ?? null);
    setIsAuthenticated(!!data?.user);
    if (error) {
      setAuthError(translateAuthError(error.message));
      setAuthLoading(false);
    } else {
      setAuthError(null);
      router.push("/auth/callback");
    }

    setAuthLoading(false);
  };

  const signUp = async (name: string, email: string, password: string) => {
    setAuthLoading(true);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        } as UserProfileRow,
      },
    });
    setUser(data?.user ?? null);

    if (error) {
      setAuthError(translateAuthError(error.message));
    } else {
      setAuthError(null);
    }

    setAuthLoading(false);
  };

  const loginWithGoogle = async (redirectPath?: string) => {
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, // Redirecionar após login
        queryParams: {
          prompt: "select_account", // Força a mostrar o seletor de contas do Google
        },
      },
    });

    if (error) {
      setAuthError(translateAuthError(error.message));
    } else {
      setAuthError(null);
    }

    setAuthLoading(false);
  };

  const logout = async () => {
    setAuthLoading(true);

    const { error } = await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setInteractionStatus(null);

    if (error) {
      setAuthError(translateAuthError(error.message));
    } else {
      setAuthError(null);
    }

    setAuthLoading(false);
    router.push("/login");
  };

  const refreshInteractionStatus = useCallback(async () => {
    if (!user || !session) {
      setInteractionStatus(null);
      return;
    }

    try {
      // ✅ Usando Axios com token automático
      const response = await apiClient.getSubscriptionStatus();
      setInteractionStatus(response.data.status as UserInteractionStatus);
    } catch (error) {
      setInteractionStatus(null);
    }
  }, [user, session]); // ✅ Adicionar session nas dependências

  const value = useMemo<AuthContextType>(
    () => ({
      authError,
      authLoading,
      user,
      session,
      isAuthenticated,
      interactionStatus,
      login,
      signUp,
      loginWithGoogle,
      logout,
      refreshInteractionStatus,
    }),
    [
      authError,
      authLoading,
      user,
      session,
      isAuthenticated,
      interactionStatus,
      login,
      signUp,
      loginWithGoogle,
      logout,
      refreshInteractionStatus,
    ],
  );

  useEffect(() => {

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session: Session | null) => {

      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setAuthLoading(false);
    });

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshInteractionStatus();
  }, [user, refreshInteractionStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
