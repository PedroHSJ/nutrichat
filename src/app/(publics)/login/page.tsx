'use client';

import React from 'react';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, signUp, authError, authLoading } = useAuth();

  // Unsplash/Source image (free to use) themed for nutrition / healthy food
  const unsplashUrl = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col md:flex-row bg-white shadow-2xl rounded-2xl overflow-hidden">
          {/* Image / visual side */}
          <div
            className="hidden md:block md:w-1/2 bg-cover bg-center"
            style={{ backgroundImage: `url(${unsplashUrl})`, minHeight: 520 }}
            aria-hidden
          >
            <div className="h-full w-full bg-gradient-to-tr from-green-900/40 via-transparent to-blue-900/30 p-8 flex flex-col justify-end">
              <h2 className="text-white text-3xl font-extrabold">NutriChat</h2>
              <p className="text-white/90 mt-2 max-w-sm">Seu assistente nutricional pessoal. Dicas, acompanhamento e suporte prático em um só lugar.</p>
            </div>
          </div>

          {/* Form side */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex items-center justify-center">
            <div className="w-full max-w-md">
              {authLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                </div>
              ) : (
                <AuthForm
                  error={authError}
                  isLoading={authLoading}
                  onLogin={login}
                  onSignUp={signUp}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
