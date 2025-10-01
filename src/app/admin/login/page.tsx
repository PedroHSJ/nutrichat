import React from 'react';

import { redirect } from 'next/navigation';

async function doLogin(formData: FormData) {
  'use server';
  const password = formData.get('password');
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  redirect('/admin/dashboard');
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form action={doLogin} className="bg-white shadow p-8 rounded w-full max-w-sm space-y-4 border border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Admin Login</h1>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <input name="password" type="password" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium">Entrar</button>
        <p className="text-xs text-gray-500">Protegido por senha de ambiente.</p>
      </form>
    </div>
  );
}
