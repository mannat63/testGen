/* ──────────────────────────────────────────────────────────────
   TEMPORARY DEMO ADMIN LOGIN
   Lets the team into /admin with  admin / admin  during the demo,
   ALONGSIDE the normal Google (Clerk) login — Clerk is untouched.

   ⚠ Insecure by design (hardcoded credentials). Remove after the demo:
     • Fastest kill-switch: set DEMO_ADMIN_ENABLED = false below.
     • Full removal: delete app/admin-login/, this file, and the
       demo-cookie checks in middleware.ts, app/(main)/layout.tsx and
       app/(main)/admin/page.tsx.

   This file holds only plain constants (no imports) so it is safe to
   use from Edge middleware.
   ────────────────────────────────────────────────────────────── */

export const DEMO_ADMIN_ENABLED = true;

export const DEMO_ADMIN_COOKIE = 'demo_admin';
export const DEMO_ADMIN_TOKEN = 'intellogy-demo-access-2026';

export const DEMO_ADMIN_USER = 'admin';
export const DEMO_ADMIN_PASS = 'admin';
