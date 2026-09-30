import { NextResponse } from 'next/server';
import { commonDbConnect } from '@/lib/commonDbConnect';

export async function GET(req: Request) {
  try {
    const conn = await commonDbConnect();
    const db = conn.db;
    if (!db) return NextResponse.json({ error: 'No DB connection' }, { status: 500 });

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c: any) => c.name).sort();

    const { searchParams } = new URL(req.url);
    const collName = searchParams.get('collection');
    const board = searchParams.get('board');
    const subject = searchParams.get('subject');

    let result: any = { database: db.databaseName, collections: collectionNames };

    if (collName) {
      const coll = db.collection(collName);
      const total = await coll.countDocuments();
      const filter: any = {};
      if (board) filter.board = { $regex: `^${board}$`, $options: 'i' };
      if (subject) filter.subject = { $regex: subject, $options: 'i' };

      const filteredCount = (board || subject) ? await coll.countDocuments(filter) : total;
      const samples = await coll.find(filter).limit(3).toArray();
      const fieldNames = samples.length > 0 ? Object.keys(samples[0]) : [];

      const typeCounts = await coll.aggregate([
        ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
        { $group: { _id: '$question_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      const chapterCounts = await coll.aggregate([
        ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      result = { ...result, collection: collName, total, filteredCount, fieldNames, typeCounts, chapterCounts, samples };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
