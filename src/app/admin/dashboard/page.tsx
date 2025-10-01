import { cookies } from 'next/headers';
import { isAdminSession } from '@/lib/admin-auth';

async function getMetrics() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const res = await fetch(`${base}/api/admin/metrics`, { cache: 'no-cache' });
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminDashboardPage() {
  const ok = await isAdminSession(undefined, cookies() as any);
  if (!ok) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Não autorizado. <a href="/admin/login" className="text-green-600 underline">Login</a></p>
      </div>
    );
  }

  const metrics = await getMetrics();

  async function logoutAction() {
    'use server';
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/logout`, { method: 'POST' });
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
        <form action={logoutAction}>
          <button className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-50">Logout</button>
        </form>
      </div>
      {!metrics && <p className="text-sm text-red-500">Falha ao carregar métricas.</p>}
      {metrics && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border rounded p-4 bg-white shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">Assinaturas</h2>
            <p className="text-2xl font-semibold mt-2">{metrics.subscriptions.total}</p>
          </div>
          <div className="border rounded p-4 bg-white shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">Planos Ativos</h2>
            <p className="text-2xl font-semibold mt-2">{metrics.plans.active}</p>
          </div>
          <div className="border rounded p-4 bg-white shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">Reconciliações 24h</h2>
            <p className="text-2xl font-semibold mt-2">{metrics.reconciliation.actionsLast24h}</p>
          </div>
        </div>
      )}
      {metrics?.events?.recent && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Eventos Recentes</h2>
          <div className="space-y-1 text-sm max-h-64 overflow-auto border rounded p-3 bg-white">
            {metrics.events.recent.map((e:any, idx:number) => (
              <div key={idx} className="flex justify-between gap-4">
                <span className="font-mono text-xs">{e.event_type}</span>
                <span className="text-gray-500 text-xs">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
