'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [cookies, setCookies] = useState<string>('');
  const [supabaseSession, setSupabaseSession] = useState<any>(null);

  useEffect(() => {
    // Mostrar todos os cookies
    setCookies(document.cookie);

    // Verificar sessão do Supabase se disponível
    if (typeof window !== 'undefined') {
      import('@/lib/supabase').then(({ supabase }) => {
        if (supabase) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            setSupabaseSession(session);
          });
        }
      });
    }
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Auth State</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Document Cookies:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {cookies || 'No cookies found'}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Supabase Session:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {supabaseSession ? JSON.stringify(supabaseSession, null, 2) : 'No session found'}
          </pre>
        </div>
      </div>
    </div>
  );
}