import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const MONGODB_URI = envVars.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('No MONGODB_URI in .env.local');
  process.exit(1);
}

let uri = MONGODB_URI;
try {
  const parsed = new URL(uri);
  console.log('Original DB:', parsed.pathname);
  parsed.pathname = '/common_db';
  uri = parsed.toString();
  console.log('Connecting to common_db...\n');
} catch (e) {
  console.error('Could not parse URI:', e.message);
  process.exit(1);
}

try {
  const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
  console.log('Connected! DB name:', conn.db.databaseName);

  const collections = await conn.db.listCollections().toArray();
  const names = collections.map(c => c.name).sort();
  console.log('Collections in common_db:', names);

  const targetColl = 'gseb_math';
  if (names.includes(targetColl)) {
    console.log(`\n=== ${targetColl} ===`);
    const coll = conn.db.collection(targetColl);
    const count = await coll.countDocuments();
    console.log('Total documents:', count);

    const sample = await coll.findOne();
    if (sample) {
      console.log('Fields:', Object.keys(sample));
      console.log('\nSample document:');
      const { _id, ...rest } = sample;
      for (const [k, v] of Object.entries(rest)) {
        const val = typeof v === 'string' ? v.substring(0, 120) : JSON.stringify(v);
        console.log(`  ${k}: ${val}`);
      }
    }

    const typeCounts = await coll.aggregate([
      { $group: { _id: '$question_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    console.log('\nQuestion types:', JSON.stringify(typeCounts));

    const chapterCounts = await coll.aggregate([
      { $group: { _id: '$chapter', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    console.log('\nChapters:', JSON.stringify(chapterCounts));

    const boards = await coll.distinct('board');
    const subjects = await coll.distinct('subject');
    const classes = await coll.distinct('class');
    console.log('\nDistinct boards:', boards);
    console.log('Distinct subjects:', subjects);
    console.log('Distinct classes:', classes);
  } else {
    console.log(`\n${targetColl} NOT FOUND in common_db!`);
    console.log('Looking for any collection with data...');
    for (const name of names) {
      const c = conn.db.collection(name);
      const cnt = await c.countDocuments();
      if (cnt > 0) {
        const s = await c.findOne();
        console.log(`  ${name}: ${cnt} docs, fields: ${s ? Object.keys(s).join(', ') : 'empty'}`);
      }
    }
  }

  await conn.close();
  process.exit(0);
} catch (e) {
  console.error('Connection error:', e.message);
  process.exit(1);
}
