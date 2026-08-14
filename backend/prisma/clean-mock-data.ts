import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL || 'mongodb://localhost:27017/shankar_seeds_erp';

async function cleanMockData() {
  console.log('Cleaning mock transactional data from Shankar Seeds ERP database...');

  const client = new MongoClient(url);
  await client.connect();
  const db = client.db();

  // Wipe mock transactions, dispatches, purchases, expenses, and attendance
  const collectionsToClean = [
    'dispatches',
    'dispatch_items',
    'purchases',
    'purchase_items',
    'expenses',
    'attendance',
    'stock_movements',
  ];

  for (const collectionName of collectionsToClean) {
    const res = await db.collection(collectionName).deleteMany({});
    console.log(`Cleared ${res.deletedCount} records from '${collectionName}' collection.`);
  }

  // Reset inventory current stock, incoming, and outgoing to 0
  const invRes = await db.collection('inventory').updateMany(
    {},
    { $set: { currentStock: 0, incoming: 0, outgoing: 0, updatedAt: new Date() } }
  );
  console.log(`Reset ${invRes.modifiedCount} inventory stock entries to 0.`);

  // Reset customer balances to 0
  const custRes = await db.collection('customers').updateMany(
    {},
    { $set: { outstandingBalance: 0, updatedAt: new Date() } }
  );
  console.log(`Reset ${custRes.modifiedCount} customer balances to 0.`);

  await client.close();
  console.log('Successfully cleaned all mock transactional data! System ready for clean production deployment.');
}

cleanMockData().catch((err) => {
  console.error('Error during mock data cleanup:', err);
  process.exit(1);
});
