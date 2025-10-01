import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'admin_session';
const TOKEN_BYTES = 32;
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8h
const HASH_ALGO = 'sha256';

interface CookieStoreLike {
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, opts: any): void;
  delete(name: string): void;
}

import { supabaseAdmin } from './supabase-admin';

interface SessionRecord { token_hash: string; expires_at: string; }

function randomToken() { return crypto.randomBytes(TOKEN_BYTES).toString('hex'); }
function hashToken(token: string) { return crypto.createHash(HASH_ALGO).update(token).digest('hex'); }

function getStore(): CookieStoreLike { return cookies() as unknown as CookieStoreLike; }

export async function isAdminSession(_ua: string | undefined, store: CookieStoreLike = getStore()): Promise<boolean> {
  const c = store.get(COOKIE_NAME);
  if (!c) return false;
  if (!supabaseAdmin) return false;
  const token = c.value;
  const tokenHash = hashToken(token);
  const { data, error } = await supabaseAdmin
    .from('admin_sessions')
    .select('token_hash, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .single();
  if (error || !data) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) return false;
  return true;
}

export async function createAdminSession(_ua: string | undefined, store: CookieStoreLike = getStore(), meta?: { ip?: string; userAgent?: string }) {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString();
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from('admin_sessions')
      .insert({
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip: meta?.ip,
        user_agent: meta?.userAgent
      });
    if (error) {
      console.error('[admin-auth] Falha ao persistir sessão admin', error);
      return false;
    }
  }
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS
  });
  return true;
}

export async function destroyAdminSession(store: CookieStoreLike = getStore()) {
  const c = store.get(COOKIE_NAME);
  if (c && supabaseAdmin) {
    const tokenHash = hashToken(c.value);
    await supabaseAdmin
      .from('admin_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);
  }
  store.delete(COOKIE_NAME);
}

export function adminPasswordIsSet(): boolean { return !!process.env.ADMIN_PASSWORD; }
