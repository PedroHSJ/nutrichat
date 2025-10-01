import { cookies } from 'next/headers';
import { isAdminSession } from '@/lib/admin-auth';
import PlansEditor from './plans-editor';
import { redirect } from 'next/navigation';

async function getPlans() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const res = await fetch(`${base}/api/admin/plans`, { cache: 'no-cache' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.plans || [];
}

export default async function AdminPlansPage() {
  const ok = await isAdminSession(undefined, cookies() as any);
  if (!ok) {
    return <div className="p-8 text-center"><p className="text-gray-600">Não autorizado. <a href="/admin/login" className="text-green-600 underline">Login</a></p></div>;
  }
  const plans = await getPlans();
  async function logoutAction() {
    'use server';
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/logout`, { method: 'POST' });
    redirect('/admin/login');
  }
  return (
    <div>
      <form action={logoutAction} className="p-4 flex justify-end border-b bg-gray-50">
        <button className="text-xs px-3 py-1 rounded border bg-white hover:bg-gray-50">Logout</button>
      </form>
      <PlansEditor initialPlans={plans} />
    </div>
  );
}
