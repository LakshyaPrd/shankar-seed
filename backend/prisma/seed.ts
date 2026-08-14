import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL || 'mongodb://localhost:27017/shankar_seeds_erp';

async function main() {
  console.log('Seeding Shankar Seeds ERP database using native MongoDB driver...');

  const client = new MongoClient(url);
  await client.connect();

  const db = client.db();

  // 1. Roles
  const rolesCollection = db.collection('roles');
  const rolesMap = new Map<string, ObjectId>();

  const roles = [
    { name: 'OWNER', description: 'Owner Role' },
    { name: 'MANAGER', description: 'Manager Role' },
    { name: 'ACCOUNTANT', description: 'Accountant Role' },
    { name: 'WAREHOUSE_STAFF', description: 'Warehouse Staff Role' },
    { name: 'WORKER', description: 'Worker Role' },
  ];

  for (const r of roles) {
    let existing = await rolesCollection.findOne({ name: r.name });
    if (!existing) {
      const res = await rolesCollection.insertOne({
        ...r,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      rolesMap.set(r.name, res.insertedId);
    } else {
      rolesMap.set(r.name, existing._id as ObjectId);
    }
  }

  // 2. Owner User
  const usersCollection = db.collection('users');
  const ownerRoleId = rolesMap.get('OWNER')!;
  const managerRoleId = rolesMap.get('MANAGER')!;

  const hashedPassword = await bcrypt.hash('admin123', 10);

  let admin = await usersCollection.findOne({ email: 'admin@shankarseeds.com' });
  if (!admin) {
    await usersCollection.insertOne({
      email: 'admin@shankarseeds.com',
      password: hashedPassword,
      name: 'Shankar Patel',
      phone: '+91 98765 00001',
      roleId: ownerRoleId,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created Owner admin user: admin@shankarseeds.com / admin123');
  } else {
    await usersCollection.updateOne(
      { email: 'admin@shankarseeds.com' },
      { $set: { password: hashedPassword, roleId: ownerRoleId, status: 'ACTIVE' } },
    );
    console.log('Updated Owner admin user password to admin123');
  }

  let manager = await usersCollection.findOne({ email: 'manager@shankarseeds.com' });
  if (!manager) {
    await usersCollection.insertOne({
      email: 'manager@shankarseeds.com',
      password: hashedPassword,
      name: 'Rajesh Sharma',
      phone: '+91 98765 00002',
      roleId: managerRoleId,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 3. Settings
  const settingsCollection = db.collection('settings');
  let setting = await settingsCollection.findOne({ _id: 'default' as any });
  if (!setting) {
    await settingsCollection.insertOne({
      _id: 'default' as any,
      companyName: 'Shankar Seeds Pvt Ltd',
      address: 'Plot No. 42, Guntur Agrotech Zone, Guntur, Andhra Pradesh - 522001',
      gstNumber: '37AAACS9876F1Z8',
      phone: '+91 863 2233445',
      email: 'info@shankarseeds.com',
      invoicePrefix: 'SS-2026-',
      financialYear: '2026-2027',
      backupFrequency: 'DAILY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 4. Categories
  const categoriesCollection = db.collection('categories');
  const getOrCreateCategory = async (name: string, description: string) => {
    let cat = await categoriesCollection.findOne({ name });
    if (!cat) {
      const res = await categoriesCollection.insertOne({ name, description, createdAt: new Date(), updatedAt: new Date() });
      return res.insertedId;
    }
    return cat._id as ObjectId;
  };

  const paddyCatId = await getOrCreateCategory('Paddy Seeds', 'High-yield hybrid and certified paddy seeds');
  const cottonCatId = await getOrCreateCategory('Cotton Seeds', 'Bt-Cotton and Hybrid Cotton seeds');
  const chilliCatId = await getOrCreateCategory('Chilli Seeds', 'Teja & G4 variety spicy chilli seeds');

  // 5. Products
  const productsCollection = db.collection('products');
  const getOrCreateProduct = async (
    barcode: string,
    name: string,
    brand: string,
    categoryId: ObjectId,
    hsn: string,
    unit: string,
    minimumStock: number,
    description: string,
  ) => {
    let prod = await productsCollection.findOne({ barcode });
    if (!prod) {
      const res = await productsCollection.insertOne({
        name,
        brand,
        categoryId,
        hsn,
        unit,
        minimumStock,
        description,
        barcode,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return res.insertedId;
    }
    return prod._id as ObjectId;
  };

  const p1Id = await getOrCreateProduct(
    'SS-PADDY-505',
    'Shankar Super Paddy 505',
    'Shankar Seeds',
    paddyCatId,
    '12091000',
    'KG',
    50,
    '120-day high disease resistance hybrid paddy',
  );

  const p2Id = await getOrCreateProduct(
    'SS-COTTON-GOLD',
    'Shankar Gold Bt Cotton',
    'Shankar Seeds',
    cottonCatId,
    '12099990',
    'PACKET',
    100,
    'Bollworm resistant premium cotton seeds 450g',
  );

  const p3Id = await getOrCreateProduct(
    'SS-CHILLI-TEJA',
    'Red Hot Chilli Teja 101',
    'Shankar Seeds',
    chilliCatId,
    '12099190',
    'PACKET',
    20,
    'High pungency export quality chilli seeds 100g',
  );

  // 6. Inventory
  const inventoryCollection = db.collection('inventory');
  const getOrCreateInventory = async (
    productId: ObjectId,
    batchNumber: string,
    warehouse: string,
    currentStock: number,
    incoming: number,
    outgoing: number,
  ) => {
    let inv = await inventoryCollection.findOne({ productId, batchNumber, warehouse });
    if (!inv) {
      await inventoryCollection.insertOne({
        productId,
        batchNumber,
        warehouse,
        expiryDate: new Date('2027-12-31'),
        currentStock,
        incoming,
        outgoing,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  };

  await getOrCreateInventory(p1Id, 'BATCH-2026-01', 'Main Warehouse', 450, 500, 50);
  await getOrCreateInventory(p2Id, 'BATCH-2026-02', 'Main Warehouse', 320, 400, 80);
  await getOrCreateInventory(p3Id, 'BATCH-2026-03', 'Main Warehouse', 8, 50, 42);

  // 7. Customers & Suppliers
  const customersCollection = db.collection('customers');
  let customer1Doc = await customersCollection.findOne({ partyName: 'Sri Venkateswara Agri Traders' });
  let customer1Id: ObjectId;
  if (!customer1Doc) {
    const res = await customersCollection.insertOne({
      partyName: 'Sri Venkateswara Agri Traders',
      gst: '37ABCDE1234F1Z5',
      phone: '+91 94401 11223',
      email: 'sales@venkateswaraagri.com',
      address: 'Main Bazaar, Vijayawada, AP',
      outstandingBalance: 45000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    customer1Id = res.insertedId;
  } else {
    customer1Id = customer1Doc._id as ObjectId;
  }

  const suppliersCollection = db.collection('suppliers');
  let supplier1Doc = await suppliersCollection.findOne({ supplierName: 'National Seeds Research Corp' });
  let supplier1Id: ObjectId;
  if (!supplier1Doc) {
    const res = await suppliersCollection.insertOne({
      supplierName: 'National Seeds Research Corp',
      gst: '07AAACN4321D1Z9',
      phone: '+91 11 25841234',
      email: 'contact@nsrcseeds.in',
      address: 'Pusa Campus, New Delhi',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    supplier1Id = res.insertedId;
  } else {
    supplier1Id = supplier1Doc._id as ObjectId;
  }

  // 8. Transport Company, Driver, Vehicle
  const transportCollection = db.collection('transport_companies');
  let transportDoc = await transportCollection.findOne({ companyName: 'Sri Balaji Express Logistics' });
  let transportId: ObjectId;
  if (!transportDoc) {
    const res = await transportCollection.insertOne({
      companyName: 'Sri Balaji Express Logistics',
      phone: '+91 866 2544112',
      email: 'balajilogistics@gmail.com',
      address: 'Auto Nagar, Vijayawada',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    transportId = res.insertedId;
  } else {
    transportId = transportDoc._id as ObjectId;
  }

  const driversCollection = db.collection('drivers');
  let driverDoc = await driversCollection.findOne({ driverName: 'Ramesh Kumar' });
  if (!driverDoc) {
    await driversCollection.insertOne({
      transportCompanyId: transportId,
      driverName: 'Ramesh Kumar',
      phone: '+91 97012 34567',
      licenseNumber: 'AP1620200012345',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const vehiclesCollection = db.collection('vehicles');
  let vehicleDoc = await vehiclesCollection.findOne({ vehicleNumber: 'AP-16-TH-7890' });
  if (!vehicleDoc) {
    await vehiclesCollection.insertOne({
      transportCompanyId: transportId,
      vehicleNumber: 'AP-16-TH-7890',
      vehicleType: 'Eicher 14 Ft Truck',
      capacity: '5 Tons',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 9. Employees & Attendance
  const employeesCollection = db.collection('employees');
  let emp1Doc = await employeesCollection.findOne({ name: 'Venkata Rao' });
  let emp1Id: ObjectId;
  if (!emp1Doc) {
    const res = await employeesCollection.insertOne({
      name: 'Venkata Rao',
      phone: '+91 99887 76655',
      salary: 22000,
      joiningDate: new Date('2024-01-15'),
      designation: 'Warehouse Incharge',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    emp1Id = res.insertedId;
  } else {
    emp1Id = emp1Doc._id as ObjectId;
  }

  const attendanceCollection = db.collection('attendance');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let att1 = await attendanceCollection.findOne({ employeeId: emp1Id, date: today });
  if (!att1) {
    await attendanceCollection.insertOne({
      employeeId: emp1Id,
      date: today,
      status: 'PRESENT',
      overtimeHours: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 10. Sample Purchase
  const purchasesCollection = db.collection('purchases');
  let purchase1Doc = await purchasesCollection.findOne({ invoiceNumber: 'INV-NSRC-8891' });
  if (!purchase1Doc) {
    const res = await purchasesCollection.insertOne({
      supplierId: supplier1Id,
      invoiceNumber: 'INV-NSRC-8891',
      date: new Date(),
      totalAmount: 150000,
      gstAmount: 7500,
      transportCharge: 2500,
      grandTotal: 160000,
      notes: 'Initial seasonal batch stock arrival',
      status: 'RECEIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const purchaseItemsCollection = db.collection('purchase_items');
    await purchaseItemsCollection.insertMany([
      { purchaseId: res.insertedId, productId: p1Id, quantity: 500, rate: 200, gstPercent: 5, amount: 100000, createdAt: new Date() },
      { purchaseId: res.insertedId, productId: p2Id, quantity: 200, rate: 250, gstPercent: 5, amount: 50000, createdAt: new Date() },
    ]);
  }

  // 11. Sample Dispatch
  const dispatchesCollection = db.collection('dispatches');
  let dispatch1Doc = await dispatchesCollection.findOne({ billNumber: 'SS-DISP-1001' });
  if (!dispatch1Doc) {
    const res = await dispatchesCollection.insertOne({
      billNumber: 'SS-DISP-1001',
      date: new Date(),
      customerId: customer1Id,
      partyName: 'Sri Venkateswara Agri Traders',
      transportName: 'Sri Balaji Express Logistics',
      driverName: 'Ramesh Kumar',
      vehicleNumber: 'AP-16-TH-7890',
      mobileNumber: '+91 97012 34567',
      destination: 'Vijayawada Bazaar',
      goodsDescription: '50 Bags Paddy Seeds, 30 Packets Bt Cotton',
      totalQuantity: 80,
      totalAmount: 45000,
      remarks: 'Urgent seasonal stock dispatch',
      status: 'DISPATCHED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const dispatchItemsCollection = db.collection('dispatch_items');
    await dispatchItemsCollection.insertMany([
      { dispatchId: res.insertedId, productId: p1Id, batchNumber: 'BATCH-2026-01', quantity: 50, rate: 300, amount: 15000, createdAt: new Date() },
      { dispatchId: res.insertedId, productId: p2Id, batchNumber: 'BATCH-2026-02', quantity: 30, rate: 1000, amount: 30000, createdAt: new Date() },
    ]);
  }

  // 12. Expenses
  const expensesCollection = db.collection('expenses');
  let exp1 = await expensesCollection.findOne({ title: 'Diesel for Dispatch Truck AP-16' });
  if (!exp1) {
    await expensesCollection.insertMany([
      { category: 'FUEL', title: 'Diesel for Dispatch Truck AP-16', amount: 3500, date: new Date(), paymentMode: 'UPI', remarks: 'Full tank fill up', createdAt: new Date(), updatedAt: new Date() },
      { category: 'LOADING', title: 'Unloading charges for Delhi Supplier Batch', amount: 1800, date: new Date(), paymentMode: 'CASH', remarks: 'Paid to daily wage loaders', createdAt: new Date(), updatedAt: new Date() },
      { category: 'TEA', title: 'Staff Tea & Snacks Refreshment', amount: 450, date: new Date(), paymentMode: 'CASH', createdAt: new Date(), updatedAt: new Date() },
    ]);
  }

  await client.close();
  console.log('Database seeding successfully completed for MongoDB!');
}

main().catch((err) => {
  console.error('Error during MongoDB seed:', err);
  process.exit(1);
});
