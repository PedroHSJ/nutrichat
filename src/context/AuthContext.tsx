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
import { authService, AuthUser } from "@/lib/auth";
import { chatPersistence } from "@/lib/persistence";
import { getStoredAuthHeaders, useAuthHeaders } from "@/hooks/use-auth-headers";
import { UserInteractionStatus } from "@/types/subscription";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  hasConsent: boolean;
  interactionStatus: UserInteractionStatus | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestConsent: () => Promise<boolean>;
  exportUserData: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  refreshInteractionStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authHeaders = useAuthHeaders();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [interactionStatus, setInteractionStatus] =
    useState<UserInteractionStatus | null>(null);

  const initializePersistence = useCallback(
    async (currentUser: AuthUser | null) => {
      if (!currentUser) {
        return;
      }

      try {
        await chatPersistence.initialize(currentUser);
      } catch (error) {
        console.error("Erro ao inicializar persistência do chat:", error);
      }
    },
    []
  );

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await authService.getCurrentSession();

        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          await initializePersistence(currentUser);

          const consent = await authService.hasConsent();
          setHasConsent(consent);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setHasConsent(false);
          setInteractionStatus(null);
        }
      } catch (error) {
        console.error("Erro na inicialização de autenticação:", error);
        setAuthError("Erro ao verificar sessão");
        setUser(null);
        setIsAuthenticated(false);
        setHasConsent(false);
        setInteractionStatus(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    const unsubscribe = authService.onAuthStateChange(async (authUser) => {
      setUser(authUser);
      setIsAuthenticated(authUser !== null);

      if (authUser) {
        await initializePersistence(authUser);
      }

      if (!authUser) {
        setHasConsent(false);
        setInteractionStatus(null);
      }
    });

    return unsubscribe;
  }, [initializePersistence]);

  const refreshInteractionStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setInteractionStatus(null);
      return;
    }

    const headers = authHeaders.Authorization
      ? authHeaders
      : getStoredAuthHeaders();
    if (!headers.Authorization) {
      return;
    }

    try {
      const response = await fetch("/api/subscription/status", {
        headers,
      });
      const status = response.ok ? await response.json() : null;
      setInteractionStatus(status);
    } catch (error) {
      console.error("Erro ao buscar status de interações:", error);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshInteractionStatus();
    } else {
      setInteractionStatus(null);
    }
  }, [isAuthenticated, user, refreshInteractionStatus]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setAuthLoading(true);
        setAuthError(null);

        const authUser = await authService.signIn(email, password);
        setUser(authUser);
        setIsAuthenticated(true);
        await initializePersistence(authUser);

        const consent = await authService.hasConsent();
        setHasConsent(consent);

        const headers = getStoredAuthHeaders();
        if (headers.Authorization) {
          const statusResponse = await fetch("/api/subscription/status", {
            headers,
          });
          const status = statusResponse.ok ? await statusResponse.json() : null;
          setInteractionStatus(status);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro no login";
        setAuthError(errorMessage);
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [initializePersistence]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        setAuthLoading(true);
        setAuthError(null);

        const authUser = await authService.signUp(name, email, password);

        setUser(authUser);
        setIsAuthenticated(true);
        await initializePersistence(authUser);

        setHasConsent(false);

        const headers = getStoredAuthHeaders();
        if (headers.Authorization) {
          const statusResponse = await fetch("/api/subscription/status", {
            headers,
          });
          const status = statusResponse.ok ? await statusResponse.json() : null;
          setInteractionStatus(status);
        }
      } catch (error) {
        console.error("Error in signUp function:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Erro no cadastro";
        setAuthError(errorMessage);
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [authHeaders, initializePersistence]
  );

  const logout = useCallback(async () => {
    try {
      router.replace("/login");
      await authService.signOut();

      setUser(null);
      setIsAuthenticated(false);
      setHasConsent(false);
      setAuthError(null);
      setInteractionStatus(null);
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  const requestConsent = useCallback(async () => {
    console.log("requestConsent chamado - isAuthenticated:", isAuthenticated);

    if (!isAuthenticated) {
      console.error(
        "Usuário não autenticado, não é possível dar consentimento"
      );
      return false;
    }

    try {
      console.log("Chamando authService.giveConsent()...");
      await authService.giveConsent();
      console.log("authService.giveConsent() executado com sucesso");
      setHasConsent(true);
      console.log("hasConsent definido como true");
      return true;
    } catch (error) {
      console.error("Erro ao dar consentimento:", error);
      console.error(
        "Detalhes do erro:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }, [isAuthenticated]);

  const exportUserData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const data = await chatPersistence.exportUserData();
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nutrichat-dados-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      throw error;
    }
  }, [isAuthenticated]);

  const deleteUserAccount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await chatPersistence.deleteAllUserData();

      setUser(null);
      setIsAuthenticated(false);
      setHasConsent(false);
      setAuthError(null);
      setInteractionStatus(null);
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      throw error;
    }
  }, [isAuthenticated]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      authLoading,
      authError,
      hasConsent,
      interactionStatus,
      login,
      signUp,
      logout,
      requestConsent,
      exportUserData,
      deleteUserAccount,
      refreshInteractionStatus,
    }),
    [
      user,
      isAuthenticated,
      authLoading,
      authError,
      hasConsent,
      interactionStatus,
      login,
      signUp,
      logout,
      requestConsent,
      exportUserData,
      deleteUserAccount,
      refreshInteractionStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
