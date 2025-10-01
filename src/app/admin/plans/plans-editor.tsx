'use client';
import React, { useState, useEffect } from 'react';

interface PlanVersion { id:string; price_cents:number; interval:string; is_current:boolean; created_at:string }
interface Plan { id:string; name:string; price_cents:number; interval:string; daily_interactions_limit:number; price_versions:PlanVersion[]; features:string[] }

export default function PlansEditor({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [editing, setEditing] = useState<Plan|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [form, setForm] = useState({ price: '', interval: 'month', features: '', name: '' });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      price: (p.price_cents/100).toFixed(2),
      interval: p.interval,
      features: (p.features||[]).join('\n'),
      name: p.name
    });
  }

  async function submit() {
    if(!editing) return;
    setLoading(true); setError(null);
    try {
      const newPriceCents = Math.round(parseFloat(form.price.replace(',', '.')) * 100);
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: editing.id,
          new_price_cents: newPriceCents,
          interval: form.interval,
          features: form.features.split('\n').map(s => s.trim()).filter(Boolean),
          name: form.name
        })
      });
      if(!res.ok) throw new Error('Falha ao atualizar plano');
      // Recarregar lista
      const updated = await fetch('/api/admin/plans').then(r => r.json());
      setPlans(updated.plans || []);
      setEditing(null);
      setToast({ type: 'success', msg: 'Plano atualizado com sucesso.' });
    } catch(e:any) {
      setError(e.message);
      setToast({ type: 'error', msg: e.message || 'Erro ao atualizar' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">×</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planos</h1>
      </div>
      <table className="w-full text-sm border bg-white shadow-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="p-2 border-b">Nome</th>
            <th className="p-2 border-b">Preço Atual</th>
            <th className="p-2 border-b">Intervalo</th>
            <th className="p-2 border-b">Interações/Dia</th>
            <th className="p-2 border-b">Ações</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2 font-medium">{p.name}</td>
              <td className="p-2">R$ {(p.price_cents/100).toFixed(2)}</td>
              <td className="p-2">{p.interval}</td>
              <td className="p-2">{p.daily_interactions_limit}</td>
              <td className="p-2 space-x-2">
                <button onClick={() => openEdit(p)} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">Editar</button>
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer text-green-600 text-xs">Versões</summary>
                  <ul className="mt-1 space-y-1 text-xs bg-white border p-2 rounded shadow max-h-40 overflow-auto">
                    {p.price_versions.map(v => (
                      <li key={v.id} className={v.is_current ? 'font-semibold text-green-700' : ''}>
                        {(v.price_cents/100).toFixed(2)} {v.interval} {v.is_current ? '(atual)' : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Atualizar Plano: {editing.name}</h2>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid gap-3">
              <label className="text-sm font-medium">Nome
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
              </label>
              <label className="text-sm font-medium">Preço (BRL)
                <input value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
              </label>
              <label className="text-sm font-medium">Intervalo
                <select value={form.interval} onChange={e=>setForm(f=>({...f,interval:e.target.value}))} className="mt-1 w-full border rounded px-2 py-1 text-sm">
                  <option value="month">Mensal</option>
                  <option value="year">Anual</option>
                </select>
              </label>
              <label className="text-sm font-medium">Features (uma por linha)
                <textarea value={form.features} onChange={e=>setForm(f=>({...f,features:e.target.value}))} className="mt-1 w-full border rounded px-2 py-1 text-sm h-32" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button disabled={loading} onClick={()=>setEditing(null)} className="px-3 py-1 text-sm rounded border">Cancelar</button>
              <button disabled={loading} onClick={submit} className="px-4 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            <p className="text-[10px] text-gray-500">Cria novo price no Stripe e versiona. O antigo é desativado.</p>
          </div>
        </div>
      )}
    </div>
  );
}
