'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  DEMO_ADMIN_ENABLED, DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN,
  DEMO_ADMIN_USER, DEMO_ADMIN_PASS,
} from '@/lib/demoAdmin';

export type DemoLoginState = { error?: string };

export async function demoAdminLogin(
  _prev: DemoLoginState,
  formData: FormData,
): Promise<DemoLoginState> {
  if (!DEMO_ADMIN_ENABLED) return { error: 'Demo login is disabled.' };

  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (username === DEMO_ADMIN_USER && password === DEMO_ADMIN_PASS) {
    const cookieStore = await cookies();
    cookieStore.set(DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });
    redirect('/admin');
  }

  return { error: 'Invalid username or password.' };
}

export async function demoAdminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_ADMIN_COOKIE);
  redirect('/admin-login');
}
