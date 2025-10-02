'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthUser } from '@/lib/auth';
import { UserInteractionStatus } from '@/types/subscription';
import { useAuthHeaders } from '@/hooks/use-auth-headers';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  hasConsent: boolean;
  requestConsent: () => Promise<boolean>;
  exportUserData: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  // Controle de interações diárias
  interactionStatus: UserInteractionStatus | null;
  refreshInteractionStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authHeaders = useAuthHeaders();
  
  // Estados de autenticação
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // Começar como true para evitar flash
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  
  // Estado de controle de interações diárias
  const [interactionStatus, setInteractionStatus] = useState<UserInteractionStatus | null>(null);

  // Inicializar autenticação
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Verificar sessão existente
        const currentUser = await authService.getCurrentSession();
        console.log('[AuthContext] Sessão atual:', currentUser);
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Verificar consentimento
          const consent = await authService.hasConsent();
          setHasConsent(consent);
          
          if (consent) {
            // Buscar status de interação
            await refreshInteractionStatus();
          }
        } else {
          // Garantir que estados estão limpos quando não há usuário
          setUser(null);
          setIsAuthenticated(false);
          setHasConsent(false);
        }
      } catch (error) {
        console.error('[AuthContext] Erro na inicialização de autenticação:', error);
        setAuthError('Erro ao verificar sessão');
        // Em caso de erro, assumir que não está logado
        setUser(null);
        setIsAuthenticated(false);
        setHasConsent(false);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças de autenticação
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setIsAuthenticated(authUser !== null);
      
      if (!authUser) {
        // Limpar dados quando fizer logout
        setHasConsent(false);
        setInteractionStatus(null);
      }
    });

    return unsubscribe;
  }, []);

  // Função de login
  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Starting login process...');
      setAuthLoading(true);
      setAuthError(null);
      
      console.log('[AuthContext] Calling authService.signIn...');
      const authUser = await authService.signIn(email, password);
      console.log('[AuthContext] Auth user received:', authUser);
      
      setUser(authUser);
      setIsAuthenticated(true);
      
      // Verificar consentimento
      console.log('[AuthContext] Checking consent...');
      const consent = await authService.hasConsent();
      console.log('[AuthContext] Consent status:', consent);
      setHasConsent(consent);
      
      if (consent) {
        // Buscar status de interação
        await refreshInteractionStatus();
      }

      console.log('[AuthContext] Login completed successfully, redirecting to callback...');
      
      // Redirecionar para callback que vai acionar o middleware
      router.replace('/auth/callback');
      setAuthLoading(false);
      
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro no login';
      setAuthError(errorMessage);
      setAuthLoading(false);
      throw error;
    }
  }, [router, authHeaders]);

  // Função de cadastro
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    console.log('[AuthContext] SignUp function called with:', { name, email, password: '***' });
    
    try {
      setAuthLoading(true);
      setAuthError(null);
      
      console.log('[AuthContext] Calling authService.signUp...');
      const authUser = await authService.signUp(name, email, password);
      console.log('[AuthContext] AuthService signUp completed:', authUser);
      
      setUser(authUser);
      setIsAuthenticated(true);
      
      // Novo usuário ainda não deu consentimento
      setHasConsent(false);
      
      // Verificar status de assinatura (novos usuários normalmente não terão plano)
      await refreshInteractionStatus();
      
      console.log('[AuthContext] SignUp process completed successfully');
      
      // Redirecionar para callback que vai acionar o middleware
      router.replace('/auth/callback');
      
    } catch (error) {
      console.error('[AuthContext] Error in signUp function:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro no cadastro';
      setAuthError(errorMessage);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [router, authHeaders]);

  // Função de logout
  const logout = useCallback(async () => {
    try {
      setAuthLoading(true);
      await authService.signOut();
      
      // Limpar estados
      setUser(null);
      setIsAuthenticated(false);
      setHasConsent(false);
      setAuthError(null);
      setInteractionStatus(null);
      
      // Redirecionar para a página de login após logout
      router.push('/login');
    } catch (error) {
      console.error('[AuthContext] Erro no logout:', error);
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  // Solicitar consentimento LGPD
  const requestConsent = useCallback(async (): Promise<boolean> => {
    console.log('[AuthContext] requestConsent chamado - isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('[AuthContext] Usuário não autenticado, não pode dar consentimento');
      return false;
    }

    try {
      console.log('[AuthContext] Chamando authService.giveConsent...');
      await authService.giveConsent();
      console.log('[AuthContext] Consentimento dado com sucesso');
      
      setHasConsent(true);
      return true;
    } catch (error) {
      console.error('[AuthContext] Erro ao dar consentimento:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Exportar dados do usuário
  const exportUserData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await authService.exportUserData();
    } catch (error) {
      console.error('[AuthContext] Erro ao exportar dados:', error);
      throw error;
    }
  }, [isAuthenticated]);

  // Deletar conta do usuário
  const deleteUserAccount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await authService.deleteAccount();
      
      // Limpar estados após deletar a conta
      setUser(null);
      setIsAuthenticated(false);
      setHasConsent(false);
      setInteractionStatus(null);
      
      router.push('/login');
    } catch (error) {
      console.error('[AuthContext] Erro ao deletar conta:', error);
      throw error;
    }
  }, [isAuthenticated, router]);

  // Atualizar status de interação
  const refreshInteractionStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/subscription/status', { headers: authHeaders });
      
      if (response.ok) {
        const status = await response.json();
        setInteractionStatus(status);
      } else {
        console.error('[AuthContext] Erro ao buscar status de interação:', response.status);
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao atualizar status de interação:', error);
    }
  }, [isAuthenticated, authHeaders]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    signUp,
    logout,
    authLoading,
    authError,
    hasConsent,
    requestConsent,
    exportUserData,
    deleteUserAccount,
    interactionStatus,
    refreshInteractionStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}