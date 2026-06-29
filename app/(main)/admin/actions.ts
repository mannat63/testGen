'use server'

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getAllowedUserModel } from '@/models/AllowedUser';
import { getTemplateModel } from '@/models/Template';

async function checkAdmin() {
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress;

  if (primaryEmail?.toLowerCase() !== 'teamintellogy@gmail.com') {
    throw new Error('Unauthorized');
  }
  return primaryEmail;
}

export async function addAllowedUser(formData: FormData): Promise<void> {
  await checkAdmin();
  const AllowedUser = await getAllowedUserModel();

  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  if (!email || !name) return;

  try {
    await AllowedUser.create({ email: email.toLowerCase(), name: name.trim() });
  } catch {
    // duplicate — try updating name if email already exists
    try {
      await AllowedUser.findOneAndUpdate(
        { email: email.toLowerCase() },
        { name: name.trim() }
      );
    } catch { /* ignore */ }
  }
  revalidatePath('/admin');
}

export async function removeAllowedUser(email: string): Promise<void> {
  await checkAdmin();
  const AllowedUser = await getAllowedUserModel();
  await AllowedUser.findOneAndDelete({ email: email.toLowerCase() });
  revalidatePath('/admin');
}

export async function createTemplate(formData: FormData): Promise<void> {
  const adminEmail = await checkAdmin();
  const Template = await getTemplateModel();

  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const board = formData.get('board') as string;
  const classLevel = formData.get('classLevel') as string;
  const subject = formData.get('subject') as string;
  const totalMarks = Number(formData.get('totalMarks')) || 50;
  const duration = Number(formData.get('duration')) || 90;

  if (!name || !subject) return;

  await Template.create({
    name, type, board, classLevel, subject,
    totalMarks, duration,
    sections: [],
    chapters: [],
    difficulty: { easy: 30, medium: 50, hard: 20 },
    language: 'English',
    createdBy: adminEmail,
  });
  revalidatePath('/admin');
}

export async function deleteTemplate(id: string): Promise<void> {
  await checkAdmin();
  const Template = await getTemplateModel();
  await Template.findByIdAndDelete(id);
  revalidatePath('/admin');
}
