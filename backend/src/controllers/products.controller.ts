import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class CategoriesController {
  static async findAll(req: Request, res: Response) {
    const data = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data });
  }

  static async findOne(req: Request, res: Response) {
    const data = await prisma.category.findUnique({ where: { id: req.params.id }, include: { products: true } });
    if (!data) return res.status(404).json({ success: false, message: 'Category not found' });
    return res.json({ success: true, data });
  }

  static async create(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('categories').insertOne({
      name: String(req.body.name || ''),
      description: String(req.body.description || ''),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.category.findUnique({ where: { id: resIns.insertedId.toString() } });
    return res.json({ success: true, data });
  }

  static async update(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('categories').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    const data = await prisma.category.findUnique({ where: { id: req.params.id } });
    return res.json({ success: true, data });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('categories').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Category deleted' } });
  }
}

export class ProductsController {
  static async findAll(req: Request, res: Response) {
    const search = req.query.search ? String(req.query.search) : undefined;
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 1000);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, inventories: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = data.map((prod) => {
      const totalStock = (prod.inventories || []).reduce((acc, inv) => acc + (inv.currentStock || 0), 0);
      const minStock = prod.minimumStock || 10;
      return { ...prod, totalStock, isLowStock: totalStock <= minStock };
    });

    return res.json({
      success: true,
      data: formatted,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, inventories: true, movements: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const totalStock = (product.inventories || []).reduce((acc, inv) => acc + (inv.currentStock || 0), 0);
    const minStock = product.minimumStock || 10;
    return res.json({ success: true, data: { ...product, totalStock, isLowStock: totalStock <= minStock } });
  }

  static async create(req: Request, res: Response) {
    try {
      const db = await getMongoDb();
      let catObjId: any;
      const catIdStr = req.body.categoryId;
      const catNameStr = req.body.categoryName;

      if (catNameStr || !catIdStr || !catIdStr.match(/^[0-9a-fA-F]{24}$/)) {
        const targetCatName = (catNameStr || catIdStr || 'General Seeds').trim();
        let existingCat = await prisma.category.findFirst({
          where: { name: { equals: targetCatName, mode: 'insensitive' } },
        });

        if (!existingCat) {
          const catIns = await db.collection('categories').insertOne({
            name: targetCatName,
            description: 'Custom seed category',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          catObjId = catIns.insertedId;
        } else {
          catObjId = toObjectId(existingCat.id);
        }
      } else {
        catObjId = toObjectId(catIdStr);
      }

      const prodName = String(req.body.name || '').trim();
      const resIns = await db.collection('products').insertOne({
        name: prodName,
        brand: String(req.body.brand || 'Shankar Seeds'),
        categoryId: catObjId,
        hsn: String(req.body.hsn || '12091000'),
        unit: String(req.body.unit || 'KG'),
        bagWeight: Number(req.body.bagWeight || 40),
        minimumStock: Number(req.body.minimumStock || 10),
        description: String(req.body.description || ''),
        barcode: req.body.barcode ? String(req.body.barcode) : 'BAR-' + Date.now(),
        status: String(req.body.status || 'ACTIVE'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const pId = resIns.insertedId;

      // Auto-initialize inventory record for main warehouse
      await db.collection('inventory').insertOne({
        productId: pId,
        batchNumber: 'BATCH-2026-01',
        warehouse: 'Vishwakarma Industrial Area',
        currentStock: 0,
        incoming: 0,
        outgoing: 0,
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Send multi-channel notification in background asynchronously (non-blocking)
      import('../services/notification.service').then(({ NotificationService }) => {
        NotificationService.send({
          type: 'PRODUCT_CREATED',
          title: '🌱 New Seed Variety Created',
          message: `Seed variety '${prodName}' (${req.body.brand || 'Shankar Seeds'}) was added to the product catalog.`,
        }).catch((err) => console.error('Notification error:', err));
      });

      const data = await prisma.product.findUnique({ where: { id: pId.toString() }, include: { category: true } });
      return res.json({ success: true, data });
    } catch (e: any) {
      console.error('Product Create Error:', e);
      return res.status(500).json({ success: false, message: e.message || 'Failed to create product' });
    }
  }

  static async update(req: Request, res: Response) {
    const updateData: any = { ...req.body, updatedAt: new Date() };
    if (req.body.categoryId) updateData.categoryId = toObjectId(req.body.categoryId);
    if (req.body.minimumStock !== undefined) updateData.minimumStock = Number(req.body.minimumStock);

    const db = await getMongoDb();
    await db.collection('products').updateOne({ _id: toObjectId(req.params.id) }, { $set: updateData });

    const data = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true } });
    return res.json({ success: true, data });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('products').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Product deleted' } });
  }
}
