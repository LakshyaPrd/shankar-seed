import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { MovementType, PurchaseStatus, DispatchStatus } from '@prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class PurchaseController {
  static async findAll(req: Request, res: Response) {
    const { search, supplierId, status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { supplier: { supplierName: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    if (supplierId) where.supplierId = String(supplierId);
    if (status) where.status = status as PurchaseStatus;

    const [data, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: true, items: { include: { product: true } } },
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.purchase.count({ where }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, items: { include: { product: true } } },
    });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase invoice not found' });
    return res.json({ success: true, data: purchase });
  }

  static async create(req: Request, res: Response) {
    try {
      const { supplierId, invoiceNumber, date, transportCharge = 0, notes, items } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Purchase must contain at least one item' });
      }

      const existing = await prisma.purchase.findUnique({ where: { invoiceNumber } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Invoice #${invoiceNumber} already exists` });
      }

      const db = await getMongoDb();
      let totalAmount = 0;
      let totalGstAmount = 0;

      const processedItems: any[] = [];

      for (const item of items) {
        let pId: string = item.productId || '';

        // Auto-create product if user typed a custom product name
        if (!pId || !pId.match(/^[0-9a-fA-F]{24}$/)) {
          const rawName = (item.productName || item.productId || 'Custom Seed Variety').trim();
          let existingProd = await prisma.product.findFirst({
            where: { name: { equals: rawName, mode: 'insensitive' } },
          });

          if (!existingProd) {
            let defaultCat = await prisma.category.findFirst({ where: { name: 'General Seeds' } });
            if (!defaultCat) {
              const catIns = await db.collection('categories').insertOne({
                name: 'General Seeds',
                description: 'Auto-created general seed category',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              defaultCat = { id: catIns.insertedId.toString() } as any;
            }

            const prodIns = await db.collection('products').insertOne({
              name: rawName,
              brand: item.brand || 'Shankar Seeds',
              categoryId: toObjectId(defaultCat!.id),
              hsn: '12091000',
              unit: item.unit || 'KG',
              minimumStock: 10,
              description: 'Auto-created during purchase entry',
              barcode: 'BAR-AUTO-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            pId = prodIns.insertedId.toString();
          } else {
            pId = existingProd.id;
          }
        }

        const itemAmount = Number(item.quantity || 0) * Number(item.rate || 0);
        const gstPercent = Number(item.gstPercent || 5);
        const gstVal = (itemAmount * gstPercent) / 100;
        totalAmount += itemAmount;
        totalGstAmount += gstVal;

        processedItems.push({
          productId: toObjectId(pId),
          originalProductIdStr: pId,
          quantity: Number(item.quantity || 0),
          rate: Number(item.rate || 0),
          gstPercent,
          amount: itemAmount + gstVal,
          batchNumber: item.batchNumber || `BATCH-${new Date().getFullYear()}-ARR`,
          warehouse: item.warehouse || 'Main Warehouse',
        });
      }

      const freight = Number(transportCharge || 0);
      const grandTotal = totalAmount + totalGstAmount + freight;

      const validSupplierObjId = toObjectId(supplierId);

      const purchaseDoc: any = {
        invoiceNumber,
        date: new Date(date || new Date()),
        totalAmount,
        gstAmount: totalGstAmount,
        transportCharge: freight,
        grandTotal,
        notes: notes || '',
        status: PurchaseStatus.RECEIVED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (validSupplierObjId) {
        purchaseDoc.supplierId = validSupplierObjId;
      } else {
        // Fallback default supplier if none selected
        let defSupplier = await prisma.supplier.findFirst();
        if (defSupplier) {
          purchaseDoc.supplierId = toObjectId(defSupplier.id);
        }
      }

      const resIns = await db.collection('purchases').insertOne(purchaseDoc);
      const purchaseId = resIns.insertedId;

      for (const pItem of processedItems) {
        await db.collection('purchase_items').insertOne({
          purchaseId,
          productId: pItem.productId,
          quantity: pItem.quantity,
          rate: pItem.rate,
          gstPercent: pItem.gstPercent,
          amount: pItem.amount,
          createdAt: new Date(),
        });
      }

      // Update Inventory Stock & Record Stock Movements IN automatically
      for (const pItem of processedItems) {
        const batchNum = pItem.batchNumber;
        const wh = pItem.warehouse;
        const qty = pItem.quantity;
        const pObjId = pItem.productId;

        await db.collection('inventory').updateOne(
          { productId: pObjId, batchNumber: batchNum, warehouse: wh },
          {
            $inc: { currentStock: qty, incoming: qty },
            $setOnInsert: {
              productId: pObjId,
              batchNumber: batchNum,
              warehouse: wh,
              outgoing: 0,
              expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
              createdAt: new Date(),
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );

        await db.collection('stock_movements').insertOne({
          productId: pObjId,
          type: MovementType.IN,
          quantity: qty,
          referenceType: 'PURCHASE',
          referenceId: purchaseId.toString(),
          warehouse: wh,
          remarks: `Purchase Arrival Invoice #${invoiceNumber}`,
          createdAt: new Date(),
        });
      }

      const result = await prisma.purchase.findUnique({ where: { id: purchaseId.toString() }, include: { supplier: true, items: true } });

      const { NotificationService } = await import('../services/notification.service');
      await NotificationService.send({
        type: 'PURCHASE_ARRIVED',
        title: '🚚 Purchase Invoice Recorded',
        message: `Purchase invoice #${invoiceNumber} from ${result?.supplier?.supplierName || 'Supplier'} recorded for ₹${grandTotal}.`,
      });

      return res.json({ success: true, data: result });
    } catch (e: any) {
      console.error('Purchase Create Error:', e);
      return res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('purchases').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Purchase record deleted' } });
  }
}

export class DispatchController {
  static async findAll(req: Request, res: Response) {
    const { search, customerId, status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { billNumber: { contains: String(search), mode: 'insensitive' } },
        { partyName: { contains: String(search), mode: 'insensitive' } },
        { transportName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.dispatch.findMany({
        where,
        include: { customer: true, items: { include: { product: true } } },
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.dispatch.count({ where }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch entry not found' });
    return res.json({ success: true, data: dispatch });
  }

  static async create(req: Request, res: Response) {
    try {
      const {
        billNumber,
        date,
        customerId,
        partyName,
        transportName,
        driverName,
        vehicleNumber,
        mobileNumber,
        destination,
        goodsDescription,
        remarks,
        items,
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Dispatch entry must contain at least one item' });
      }

      const existing = await prisma.dispatch.findUnique({ where: { billNumber } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Bill #${billNumber} already exists` });
      }

      const db = await getMongoDb();
      let totalQty = 0;
      let totalAmt = 0;

      const processedItems: any[] = [];

      for (const item of items) {
        let pId: string = item.productId || '';

        // Auto-create product if user typed a custom product name
        if (!pId || !pId.match(/^[0-9a-fA-F]{24}$/)) {
          const rawName = (item.productName || item.productId || 'Custom Seed Variety').trim();
          let existingProd = await prisma.product.findFirst({
            where: { name: { equals: rawName, mode: 'insensitive' } },
          });

          if (!existingProd) {
            let defaultCat = await prisma.category.findFirst({ where: { name: 'General Seeds' } });
            if (!defaultCat) {
              const catIns = await db.collection('categories').insertOne({
                name: 'General Seeds',
                description: 'Auto-created general seed category',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              defaultCat = { id: catIns.insertedId.toString() } as any;
            }

            const prodIns = await db.collection('products').insertOne({
              name: rawName,
              brand: item.brand || 'Shankar Seeds',
              categoryId: toObjectId(defaultCat!.id),
              hsn: '12091000',
              unit: item.unit || 'KG',
              minimumStock: 10,
              description: 'Auto-created during dispatch entry',
              barcode: 'BAR-AUTO-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            pId = prodIns.insertedId.toString();
          } else {
            pId = existingProd.id;
          }
        }

        const qty = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const amt = qty * rate;
        totalQty += qty;
        totalAmt += amt;

        processedItems.push({
          productId: toObjectId(pId),
          originalProductIdStr: pId,
          batchNumber: item.batchNumber || 'BATCH-2026-01',
          warehouse: item.warehouse || 'Main Warehouse',
          quantity: qty,
          rate,
          amount: amt,
        });
      }

      const validCustObjId = toObjectId(customerId);

      const dispatchDoc: any = {
        billNumber,
        date: new Date(date || new Date()),
        partyName: partyName || 'Walk-in Party',
        transportName: transportName || 'Self Transport',
        driverName: driverName || 'N/A',
        vehicleNumber: vehicleNumber || 'N/A',
        mobileNumber: mobileNumber || 'N/A',
        destination: destination || 'Local Market',
        goodsDescription: goodsDescription || '',
        totalQuantity: totalQty,
        totalAmount: totalAmt,
        remarks: remarks || '',
        status: DispatchStatus.DISPATCHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (validCustObjId) {
        dispatchDoc.customerId = validCustObjId;
      }

      const resIns = await db.collection('dispatches').insertOne(dispatchDoc);
      const dispatchId = resIns.insertedId;

      for (const dItem of processedItems) {
        await db.collection('dispatch_items').insertOne({
          dispatchId,
          productId: dItem.productId,
          batchNumber: dItem.batchNumber,
          quantity: dItem.quantity,
          rate: dItem.rate,
          amount: dItem.amount,
          createdAt: new Date(),
        });
      }

      if (validCustObjId && totalAmt > 0) {
        await db.collection('customers').updateOne(
          { _id: validCustObjId },
          { $inc: { outstandingBalance: totalAmt } }
        );
      }

      // Deduct Inventory Stock & Record Stock Movements OUT automatically
      for (const dItem of processedItems) {
        const batchNum = dItem.batchNumber;
        const wh = dItem.warehouse;
        const qty = dItem.quantity;
        const pObjId = dItem.productId;

        await db.collection('inventory').updateOne(
          { productId: pObjId, batchNumber: batchNum, warehouse: wh },
          {
            $inc: { currentStock: -qty, outgoing: qty },
            $setOnInsert: {
              productId: pObjId,
              batchNumber: batchNum,
              warehouse: wh,
              incoming: 0,
              expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
              createdAt: new Date(),
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );

        await db.collection('stock_movements').insertOne({
          productId: pObjId,
          type: MovementType.OUT,
          quantity: qty,
          referenceType: 'DISPATCH',
          referenceId: dispatchId.toString(),
          warehouse: wh,
          remarks: `Dispatch Bill #${billNumber} to ${partyName}`,
          createdAt: new Date(),
        });
      }

      const result = await prisma.dispatch.findUnique({
        where: { id: dispatchId.toString() },
        include: { customer: true, items: true },
      });

      const { NotificationService } = await import('../services/notification.service');
      await NotificationService.send({
        type: 'GOODS_DISPATCHED',
        title: '📦 Goods Dispatched (Gate Pass)',
        message: `Dispatch bill #${billNumber} for ${partyName} (${totalQty} units, ₹${totalAmt}) processed at ${processedItems[0]?.warehouse || 'Branch 1'}.`,
      });

      return res.json({ success: true, data: result });
    } catch (e: any) {
      console.error('Dispatch Create Error:', e);
      return res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('dispatches').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Dispatch record deleted' } });
  }
}
