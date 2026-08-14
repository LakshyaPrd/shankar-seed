import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class TransportController {
  static async findAllCompanies(req: Request, res: Response) {
    const data = await prisma.transportCompany.findMany({
      include: { drivers: true, vehicles: true, _count: { select: { dispatches: true } } },
      orderBy: { companyName: 'asc' },
    });
    return res.json({ success: true, data });
  }

  static async createCompany(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('transport_companies').insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.transportCompany.findUnique({ where: { id: resIns.insertedId.toString() } });
    return res.json({ success: true, data });
  }

  static async getDrivers(req: Request, res: Response) {
    const data = await prisma.driver.findMany({ include: { transportCompany: true } });
    return res.json({ success: true, data });
  }

  static async createDriver(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('drivers').insertOne({
      ...req.body,
      transportCompanyId: toObjectId(req.body.transportCompanyId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.driver.findUnique({ where: { id: resIns.insertedId.toString() }, include: { transportCompany: true } });
    return res.json({ success: true, data });
  }

  static async getVehicles(req: Request, res: Response) {
    const data = await prisma.vehicle.findMany({ include: { transportCompany: true } });
    return res.json({ success: true, data });
  }

  static async createVehicle(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('vehicles').insertOne({
      ...req.body,
      transportCompanyId: toObjectId(req.body.transportCompanyId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.vehicle.findUnique({ where: { id: resIns.insertedId.toString() }, include: { transportCompany: true } });
    return res.json({ success: true, data });
  }
}

export class EmployeesController {
  static async findAll(req: Request, res: Response) {
    const { search, status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { designation: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (status) where.status = String(status);

    const [data, total] = await Promise.all([
      prisma.employee.findMany({ where, skip, take: Number(limit), orderBy: { name: 'asc' } }),
      prisma.employee.count({ where }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const emp = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { attendance: { take: 30, orderBy: { date: 'desc' } } },
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
    return res.json({ success: true, data: emp });
  }

  static async create(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('employees').insertOne({
      name: req.body.name,
      phone: req.body.phone,
      salary: Number(req.body.salary),
      joiningDate: new Date(req.body.joiningDate || new Date()),
      designation: req.body.designation,
      status: req.body.status || 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.employee.findUnique({ where: { id: resIns.insertedId.toString() } });
    return res.json({ success: true, data });
  }

  static async update(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('employees').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: { ...req.body, salary: req.body.salary ? Number(req.body.salary) : undefined, updatedAt: new Date() } }
    );
    const data = await prisma.employee.findUnique({ where: { id: req.params.id } });
    return res.json({ success: true, data });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('employees').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Employee deleted' } });
  }
}
