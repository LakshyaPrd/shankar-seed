const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.DATABASE_URL || 'mongodb://localhost:27017/shankar_seeds_erp';

async function fixDates() {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db();

  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const col = db.collection(c.name);
    const docs = await col.find({}).toArray();
    for (const d of docs) {
      const updates = {};
      if (typeof d.createdAt === 'string') updates.createdAt = new Date(d.createdAt);
      if (typeof d.updatedAt === 'string') updates.updatedAt = new Date(d.updatedAt);
      if (typeof d.date === 'string') updates.date = new Date(d.date);
      if (typeof d.expiryDate === 'string') updates.expiryDate = new Date(d.expiryDate);
      if (typeof d.joiningDate === 'string') updates.joiningDate = new Date(d.joiningDate);

      if (Object.keys(updates).length > 0) {
        await col.updateOne({ _id: d._id }, { $set: updates });
      }
    }
  }
  await client.close();
  console.log('Successfully repaired all MongoDB BSON Date fields!');
}

fixDates().catch(console.error);
