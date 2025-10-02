"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return setError('Informe a senha');
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha no login');
      }
      router.replace('/admin/dashboard');
    } catch (err) {
      const msg = (err as Error).message || 'Erro desconhecido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const unsplashUrl = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col md:flex-row bg-white shadow-2xl rounded-2xl overflow-hidden">
          {/* Visual Side */}
          <div
            className="hidden md:block md:w-1/2 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${unsplashUrl})`, minHeight: 520 }}
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/60 via-gray-900/30 to-transparent" />
            <div className="relative h-full w-full p-8 flex flex-col justify-end text-white">
              <h2 className="text-3xl font-extrabold flex items-center gap-2"><ShieldCheck className="h-7 w-7" /> Área Administrativa</h2>
              <p className="text-white/80 mt-2 max-w-sm text-sm leading-relaxed">
                Gestão de planos, métricas e reconciliação de assinaturas.
                Acesso restrito — sessão expira automaticamente após período de inatividade.
              </p>
              <div className="mt-4 text-xs text-white/60 space-y-1">
                <p>• Sessões seguras (cookie HTTP Only)</p>
                <p>• Versionamento de preços de planos</p>
                <p>• Métricas agregadas de assinaturas</p>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex items-center justify-center">
            <div className="w-full max-w-md">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                    <Lock className="h-6 w-6 text-green-600" /> Login Admin
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">Digite a senha definida no ambiente (ADMIN_PASSWORD).</p>
                </div>
                {error && (
                  <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Senha</label>
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoComplete="current-password"
                  />
                </div>
                <button
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2 rounded text-sm font-medium transition"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Esta interface administra recursos internos. O uso é monitorado. Caso não reconheça esta tela, feche a janela.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
