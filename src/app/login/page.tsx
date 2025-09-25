'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import { useChat } from '@/context/ChatContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login, signUp, authError, authLoading, isAuthenticated } = useChat();

  // Redirecionar usuários autenticados
  // useEffect(() => {
  //   if (isAuthenticated && !authLoading) {
  //     console.log('👤 Usuário já autenticado, redirecionando para chat...');
  //     router.push('/chat');
  //   }
  // }, [isAuthenticated, authLoading, router]);
 
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