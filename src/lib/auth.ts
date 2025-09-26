import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  consent_given: boolean;
  consent_date?: string;
  timezone: string;
  language: string;
  last_login?: string;
  login_count: number;
}

export class AuthService {
  private currentUser: AuthUser | null = null;

  // Verificar se Supabase está configurado
  private isSupabaseConfigured(): boolean {
    return supabase !== null;
  }

  // Fazer login
  async signIn(email: string, password: string): Promise<AuthUser> {
    if (!this.isSupabaseConfigured()) {
      throw new Error('Supabase não configurado. Configure as variáveis de ambiente.');
    }

    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(this.getAuthErrorMessage(error.message));
    }

    if (!data.user) {
      throw new Error('Falha na autenticação');
    }

    const authUser = await this.getUserProfile(data.user);
    this.currentUser = authUser;
    
    return authUser;
  }

  // Criar conta
  async signUp(name: string, email: string, password: string): Promise<AuthUser> {
    console.log('AuthService.signUp called with:', { name, email, password: '***' });
    
    if (!this.isSupabaseConfigured()) {
      console.log('Supabase not configured');
      throw new Error('Supabase não configurado. Configure as variáveis de ambiente.');
    }

    console.log('Calling supabase.auth.signUp...');
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
        }
      }
    });

    console.log('Supabase signUp response:', { data, error });

    if (error) {
      console.error('Supabase signUp error:', error);
      throw new Error(this.getAuthErrorMessage(error.message));
    }

    if (!data.user) {
      console.error('No user returned from Supabase');
      throw new Error('Falha ao criar usuário');
    }

    // Se o usuário foi criado mas não confirmado, retornar informação
    if (!data.session) {
      throw new Error('Verifique seu email para confirmar a conta');
    }

    const authUser = await this.getUserProfile(data.user);
    this.currentUser = authUser;
    
    return authUser;
  }

  // Logout
  async signOut(): Promise<void> {
    if (!this.isSupabaseConfigured()) return;

    const { error } = await supabase!.auth.signOut();
    
    if (error) {
      console.error('Erro ao fazer logout:', error);
    }

    this.currentUser = null;
  }

  // Obter usuário atual
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Verificar se está logado
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Obter sessão atual
  async getCurrentSession(): Promise<AuthUser | null> {
    if (!this.isSupabaseConfigured()) return null;

    const { data: { session }, error } = await supabase!.auth.getSession();

    if (error || !session?.user) {
      this.currentUser = null;
      return null;
    }

    if (!this.currentUser) {
      this.currentUser = await this.getUserProfile(session.user);
    }

    return this.currentUser;
  }

  // Escutar mudanças de autenticação
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (!this.isSupabaseConfigured()) return () => {};

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          this.currentUser = await this.getUserProfile(session.user);
          callback(this.currentUser);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          callback(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }

  // Obter perfil completo do usuário
  private async getUserProfile(user: User): Promise<AuthUser> {
    if (!this.isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }

    const { data: profile, error } = await supabase!
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error);
      // Retornar dados básicos se não encontrar perfil
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        createdAt: new Date(user.created_at),
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      createdAt: new Date(profile.created_at),
      lastLogin: profile.last_login ? new Date(profile.last_login) : undefined,
    };
  }

  // Atualizar perfil do usuário
  async updateProfile(updates: { name?: string }): Promise<void> {
    if (!this.isSupabaseConfigured() || !this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase!
      .from('user_profiles')
      .update(updates)
      .eq('id', this.currentUser.id);

    if (error) {
      throw new Error('Erro ao atualizar perfil: ' + error.message);
    }

    // Atualizar dados locais
    if (updates.name) {
      this.currentUser.name = updates.name;
    }
  }

  // Dar consentimento LGPD
  async giveConsent(): Promise<void> {
    if (!this.isSupabaseConfigured() || !this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase!
      .from('user_profiles')
      .update({
        consent_given: true,
        consent_date: new Date().toISOString(),
      })
      .eq('id', this.currentUser.id);

    if (error) {
      throw new Error('Erro ao registrar consentimento: ' + error.message);
    }
  }

  // Verificar consentimento
  async hasConsent(): Promise<boolean> {
    if (!this.isSupabaseConfigured() || !this.currentUser) {
      return false;
    }

    const { data, error } = await supabase!
      .from('user_profiles')
      .select('consent_given')
      .eq('id', this.currentUser.id)
      .single();
    console.log('Checking user consent:', { data, error });
    if (error) {
      console.error('Erro ao verificar consentimento:', error);
      return false;
    }

    return data?.consent_given || false;
  }

  // Exportar dados do usuário (LGPD)
  async exportUserData(): Promise<Record<string, unknown> | null> {
    if (!this.isSupabaseConfigured() || !this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase!
      .rpc('export_user_data', { user_uuid: this.currentUser.id });

    if (error) {
      throw new Error('Erro ao exportar dados: ' + error.message);
    }

    return data;
  }

  // Deletar conta e todos os dados (LGPD)
  async deleteAccount(): Promise<void> {
    if (!this.isSupabaseConfigured() || !this.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    // Primeiro deletar dados no banco
    const { error: deleteError } = await supabase!
      .rpc('delete_user_data', { user_uuid: this.currentUser.id });

    if (deleteError) {
      throw new Error('Erro ao deletar dados: ' + deleteError.message);
    }

    // Depois deletar usuário do auth
    const { error: authError } = await supabase!.auth.admin.deleteUser(
      this.currentUser.id
    );

    if (authError) {
      console.error('Erro ao deletar usuário do auth:', authError);
      // Continuar mesmo com erro no auth, pois os dados já foram removidos
    }

    this.currentUser = null;
  }

  // Traduzir mensagens de erro para português
  private getAuthErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
      'User already registered': 'Usuário já cadastrado com este email',
      'Password should be at least 6 characters': 'Senha deve ter pelo menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'Signup is disabled': 'Cadastro desabilitado temporariamente',
      'Email rate limit exceeded': 'Muitas tentativas. Tente novamente em alguns minutos.',
    };

    return errorMessages[error] || `Erro de autenticação: ${error}`;
  }
}

// Instância singleton
export const authService = new AuthService();