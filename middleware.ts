import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { DEMO_ADMIN_ENABLED, DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN } from '@/lib/demoAdmin';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', '/sign-up(.*)', '/unauthorized',
  '/admin-login(.*)', '/api/admin-login(.*)', '/api/admin-logout(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  // Temporary demo admin bypass (admin/admin) — see lib/demoAdmin.ts
  if (DEMO_ADMIN_ENABLED && request.cookies.get(DEMO_ADMIN_COOKIE)?.value === DEMO_ADMIN_TOKEN) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
