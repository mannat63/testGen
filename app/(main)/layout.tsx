import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAllowedUserModel } from '@/models/AllowedUser';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
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
