'use client';

import { useActionState } from 'react';
import { demoAdminLogin, type DemoLoginState } from './actions';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<DemoLoginState, FormData>(
    demoAdminLogin,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-bold mb-1.5 text-foreground-muted uppercase tracking-wider">Username</label>
        <input
          name="username"
          type="text"
          autoComplete="username"
          defaultValue=""
          placeholder="admin"
          required
          className="block w-full rounded-lg py-2.5 px-3.5 text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1.5 text-foreground-muted uppercase tracking-wider">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••"
          required
          className="block w-full rounded-lg py-2.5 px-3.5 text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg px-3 py-2 text-sm bg-danger-soft border border-danger/30 text-danger">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {pending ? 'Signing in…' : 'Sign in to Admin'}
      </button>
    </form>
  );
}
