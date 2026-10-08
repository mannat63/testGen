import { NextRequest, NextResponse } from 'next/server';
import { DEMO_ADMIN_COOKIE } from '@/lib/demoAdmin';

// Clears the demo admin cookie and returns to the demo login page.
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin-login', req.url), { status: 303 });
  res.cookies.set(DEMO_ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
