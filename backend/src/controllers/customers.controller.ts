import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class CustomersController {
  static async findAll(req: Request, res: Response) {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { partyName: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { dispatches: true } } },
        skip,
        take: Number(limit),
        orderBy: { partyName: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { dispatches: { orderBy: { date: 'desc' }, take: 20, include: { items: { include: { product: true } } } } },
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    return res.json({ success: true, data: customer });
  }

  static async getLedger(req: Request, res: Response) {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { dispatches: { orderBy: { date: 'desc' }, take: 20 } },
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    return res.json({
      success: true,
      data: { customer, transactions: customer.dispatches, currentOutstanding: customer.outstandingBalance },
    });
  }

  static async create(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('customers').insertOne({
      ...req.body,
      outstandingBalance: Number(req.body.outstandingBalance || 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.customer.findUnique({ where: { id: resIns.insertedId.toString() } });
    return res.json({ success: true, data });
  }

  static async update(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('customers').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: { ...req.body, outstandingBalance: req.body.outstandingBalance ? Number(req.body.outstandingBalance) : undefined, updatedAt: new Date() } }
    );
    const data = await prisma.customer.findUnique({ where: { id: req.params.id } });
    return res.json({ success: true, data });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('customers').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Customer deleted' } });
  }
}

export class SuppliersController {
  static async findAll(req: Request, res: Response) {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { supplierName: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchases: true } } },
        skip,
        take: Number(limit),
        orderBy: { supplierName: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { purchases: { orderBy: { date: 'desc' }, take: 20, include: { items: { include: { product: true } } } } },
    });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    return res.json({ success: true, data: supplier });
  }

  static async create(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('suppliers').insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.supplier.findUnique({ where: { id: resIns.insertedId.toString() } });
    return res.json({ success: true, data });
  }

  static async update(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('suppliers').updateOne({ _id: toObjectId(req.params.id) }, { $set: { ...req.body, updatedAt: new Date() } });
    const data = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    return res.json({ success: true, data });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('suppliers').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Supplier deleted' } });
  }
}
