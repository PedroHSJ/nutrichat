'use client';
import { AuthForm } from '@/components/AuthForm';
import { useChat } from '@/context/ChatContext';

export default function LoginPage() {
  const { login, signUp, authError, authLoading } = useChat();
 
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
          <AuthForm
            error={authError}
            isLoading={authLoading}
            onLogin={login}
            onSignUp={signUp}
            key={"login-form"}
          />
      </div>
    </div>
  );
}