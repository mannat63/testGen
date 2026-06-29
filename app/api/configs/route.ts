import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSavedConfigModel } from '@/models/SavedConfig';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
    const SavedConfig = await getSavedConfigModel();
    const filter = { $or: [{ userId: user.id }, { userEmail: email }] };
    const configs = await SavedConfig.find(filter).sort({ savedAt: -1 }).limit(20).lean();
    return NextResponse.json({ data: configs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
    const { name, config } = await req.json();

    const SavedConfig = await getSavedConfigModel();
    const saved = await SavedConfig.create({
      userId: user.id,
      userEmail: email,
      name,
      config,
    });
    return NextResponse.json({ data: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
    const SavedConfig = await getSavedConfigModel();
    await SavedConfig.findOneAndDelete({ _id: id, $or: [{ userId: user.id }, { userEmail: email }] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
