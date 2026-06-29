import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getTemplateModel } from '@/models/Template';

export async function GET() {
  try {
    const Template = await getTemplateModel();
    const templates = await Template.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const email = user?.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
    if (email?.toLowerCase() !== 'teamintellogy@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const Template = await getTemplateModel();
    const template = await Template.create({ ...body, createdBy: email });
    return NextResponse.json({ data: template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    const email = user?.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
    if (email?.toLowerCase() !== 'teamintellogy@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await req.json();
    const Template = await getTemplateModel();
    await Template.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
