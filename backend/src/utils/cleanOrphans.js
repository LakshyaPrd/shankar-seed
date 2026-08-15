const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.DATABASE_URL || 'mongodb+srv://pradhan2k4_db_user:dZUCc3T3G70CDxlv@shankar-seed.xgxrgak.mongodb.net/shankar_seeds_erp?retryWrites=true&w=majority';

async function cleanupOrphans() {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db();

  const products = await db.collection('products').find().toArray();
  const validProductObjIds = products.map((p) => p._id);
  const validProductIdStrs = new Set(products.map((p) => p._id.toString()));

  console.log('Valid products:', validProductIdStrs.size);

  const allInventory = await db.collection('inventory').find().toArray();
  const orphanedInvIds = allInventory
    .filter((inv) => !inv.productId || !validProductIdStrs.has(inv.productId.toString()))
    .map((inv) => inv._id);

  if (orphanedInvIds.length > 0) {
    const res = await db.collection('inventory').deleteMany({ _id: { $in: orphanedInvIds } });
    console.log('Deleted orphaned inventory records:', res.deletedCount);
  } else {
    console.log('No orphaned inventory records found.');
  }

  const allMovements = await db.collection('stock_movements').find().toArray();
  const orphanedMovIds = allMovements
    .filter((mov) => !mov.productId || !validProductIdStrs.has(mov.productId.toString()))
    .map((mov) => mov._id);

  if (orphanedMovIds.length > 0) {
    const res = await db.collection('stock_movements').deleteMany({ _id: { $in: orphanedMovIds } });
    console.log('Deleted orphaned stock movement records:', res.deletedCount);
  } else {
    console.log('No orphaned stock movement records found.');
  }

  await client.close();
}

cleanupOrphans().catch(console.error);
