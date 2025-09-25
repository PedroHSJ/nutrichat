'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthForm } from '@/components/AuthForm';
import { RouteGuard } from '@/components/RouteGuard';
import { useChat } from '@/context/ChatContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login, signUp, authError, authLoading, isAuthenticated } = useChat();

  // Redirecionar usuários autenticados
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('👤 Usuário já autenticado, redirecionando para chat...');
      router.push('/chat');
    }
  }, [isAuthenticated, authLoading, router]);
  // const handleLogin = async (e: React.FormEvent) => {
  //   e.preventDefault();
    
  //   if (!supabase) {
  //     setError('Sistema de autenticação não configurado');
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email,
  //       password,
  //     });

  //     if (error) {
  //       throw new Error(error.message);
  //     }

  //     if (data.user) {
  //       router.push('/chat');
  //     }
  //   } catch (error: any) {
  //     setError(error.message || 'Erro ao fazer login');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleSignUp = async () => {
  //   if (!supabase) {
  //     setError('Sistema de autenticação não configurado');
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const { data, error } = await supabase.auth.signUp({
  //       email,
  //       password,
  //     });

  //     if (error) {
  //       throw new Error(error.message);
  //     }

  //     if (data.user) {
  //       setError(null);
  //       alert('Conta criada! Verifique seu email para confirmar.');
  //     }
  //   } catch (error: any) {
  //     setError(error.message || 'Erro ao criar conta');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Mostrar loading apenas quando authLoading estiver ativo */}
        {authLoading ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : (
          <AuthForm
            error={authError}
            isLoading={authLoading}
            onLogin={login}
            onSignUp={signUp}
            key={"login-form"}
          />
        )}
      </div>
    </div>
  );
}