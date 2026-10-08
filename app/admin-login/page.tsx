import Link from 'next/link';
import { cookies } from 'next/headers';
import { ShieldCheck, ArrowRight, LogOut } from 'lucide-react';
import { DEMO_ADMIN_ENABLED, DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN } from '@/lib/demoAdmin';
import LoginForm from './LoginForm';
import { demoAdminLogout } from './actions';

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const loggedIn =
    DEMO_ADMIN_ENABLED &&
    cookieStore.get(DEMO_ADMIN_COOKIE)?.value === DEMO_ADMIN_TOKEN;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Admin Access</h1>
          <p className="text-sm text-foreground-muted mt-1">Intellogy Corporation</p>
        </div>

        <div className="soft-card p-6 shadow-sm">
          {!DEMO_ADMIN_ENABLED ? (
            <p className="text-sm text-foreground-muted text-center">
              Demo login is disabled. Please use the main sign-in.
            </p>
          ) : loggedIn ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">You are signed in as <span className="font-bold">demo admin</span>.</p>
              <Link href="/admin" className="btn-primary w-full">
                Go to Admin <ArrowRight className="w-4 h-4" />
              </Link>
              <form action={demoAdminLogout}>
                <button type="submit" className="btn-secondary w-full">
                  <LogOut className="w-4 h-4" /> Exit demo session
                </button>
              </form>
            </div>
          ) : (
            <LoginForm />
          )}
        </div>

        <div className="mt-5 text-center">
          <Link href="/sign-in" className="text-sm font-semibold text-accent hover:underline">
            Use Google sign-in instead
          </Link>
          <p className="mt-3 text-[11px] text-foreground-soft">Temporary demo access · remove after the demo</p>
        </div>
      </div>
    </div>
  );
}
