import { NextRequest, NextResponse } from 'next/server';
import {
  DEMO_ADMIN_ENABLED, DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN,
  DEMO_ADMIN_USER, DEMO_ADMIN_PASS,
} from '@/lib/demoAdmin';

// Temporary demo admin login (admin/admin). Sets the cookie directly on the
// redirect response so it reliably persists to /admin — see lib/demoAdmin.ts
export async function POST(req: NextRequest) {
  if (!DEMO_ADMIN_ENABLED) {
    return NextResponse.redirect(new URL('/sign-in', req.url), { status: 303 });
  }

  const form = await req.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');

  if (username === DEMO_ADMIN_USER && password === DEMO_ADMIN_PASS) {
    const res = NextResponse.redirect(new URL('/admin', req.url), { status: 303 });
    res.cookies.set(DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return res;
  }

  return NextResponse.redirect(new URL('/admin-login?error=1', req.url), { status: 303 });
}
