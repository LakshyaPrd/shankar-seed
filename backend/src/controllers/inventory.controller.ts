import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { MovementType } from '@prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class InventoryController {
  static async findAll(req: Request, res: Response) {
    const search = req.query.search ? String(req.query.search) : undefined;
    const warehouse = req.query.warehouse ? String(req.query.warehouse) : undefined;
    const isLowStock = req.query.isLowStock === 'true';
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (warehouse) where.warehouse = warehouse;

    const [data, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: { product: { include: { category: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventory.count({ where }),
    ]);

    let result = data;
    if (isLowStock) {
      result = data.filter((inv) => inv.currentStock <= (inv.product?.minimumStock || 10));
    }

    return res.json({
      success: true,
      data: result,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  static async getLowStockAlerts(req: Request, res: Response) {
    const inventories = await prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
    });
    const lowStock = (inventories || []).filter((inv) => (inv?.currentStock ?? 0) <= (inv?.product?.minimumStock ?? 10));
    return res.json({ success: true, data: lowStock });
  }

  static async adjustStock(req: Request, res: Response) {
    const { productId, batchNumber, warehouse = 'Main Warehouse', quantity, type, remarks } = req.body;
    const qty = Number(quantity || 0);

    const db = await getMongoDb();
    const stockChange = type === 'IN' ? qty : type === 'OUT' ? -qty : qty;
    const incChange = type === 'IN' ? qty : 0;
    const outChange = type === 'OUT' ? qty : 0;

    await db.collection('inventory').updateOne(
      { productId: toObjectId(productId), batchNumber, warehouse },
      {
        $inc: { currentStock: stockChange, incoming: incChange, outgoing: outChange },
        $setOnInsert: { productId: toObjectId(productId), batchNumber, warehouse, createdAt: new Date() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    await db.collection('stock_movements').insertOne({
      productId: toObjectId(productId),
      type: type as MovementType,
      quantity: qty,
      referenceType: 'MANUAL_ADJUSTMENT',
      warehouse,
      remarks: remarks || 'Manual stock adjustment',
      createdAt: new Date(),
    });

    const inventory = await prisma.inventory.findFirst({
      where: { productId, batchNumber, warehouse },
      include: { product: true },
    });

    // Send notification
    const { NotificationService } = await import('../services/notification.service');
    await NotificationService.send({
      type: 'INVENTORY_UPDATED',
      title: '📦 Inventory Stock Adjusted',
      message: `Stock for '${inventory?.product?.name || 'Product'}' (Batch: ${batchNumber}) adjusted by ${type === 'IN' ? '+' : '-'}${qty} units at ${warehouse}.`,
    });

    return res.json({ success: true, data: inventory });
  }
}

export class StockController {
  static async getMovements(req: Request, res: Response) {
    const productId = req.query.productId ? String(req.query.productId) : undefined;
    const type = req.query.type ? (req.query.type as MovementType) : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { include: { category: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }
}
