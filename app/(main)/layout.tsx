import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAllowedUserModel } from '@/models/AllowedUser';
import { DEMO_ADMIN_ENABLED, DEMO_ADMIN_COOKIE, DEMO_ADMIN_TOKEN } from '@/lib/demoAdmin';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // Temporary demo admin bypass (admin/admin) — see lib/demoAdmin.ts
  if (DEMO_ADMIN_ENABLED) {
    const cookieStore = await cookies();
    if (cookieStore.get(DEMO_ADMIN_COOKIE)?.value === DEMO_ADMIN_TOKEN) {
      return <>{children}</>;
    }
  }

  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  )?.emailAddress;

  if (!primaryEmail) {
    redirect('/unauthorized');
  }

  const emailLower = primaryEmail.toLowerCase();

  if (emailLower !== 'teamintellogy@gmail.com') {
    const AllowedUser = await getAllowedUserModel();
    const allowed = await AllowedUser.findOne({ email: emailLower });

    if (!allowed) {
      redirect('/unauthorized');
    }
  }

  return <>{children}</>;
}
