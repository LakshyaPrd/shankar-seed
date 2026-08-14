import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class UsersController {
  static async findAll(req: Request, res: Response) {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (role) where.role = { name: role as any };
    if (status) where.status = String(status);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const sanitized = users.map(({ password, refreshToken, ...u }) => u);
    return res.json({
      success: true,
      data: sanitized,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  static async findOne(req: Request, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { role: true } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, refreshToken, ...rest } = user;
    return res.json({ success: true, data: rest });
  }

  static async create(req: Request, res: Response) {
    const { name, email, phone, password, role: roleName, status } = req.body;
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(400).json({ success: false, message: 'Invalid role' });

    const hashedPassword = await bcrypt.hash(password || 'admin123', 10);
    const db = await getMongoDb();
    const resIns = await db.collection('users').insertOne({
      name,
      email,
      phone,
      password: hashedPassword,
      roleId: toObjectId(role.id),
      status: status || 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await prisma.user.findUnique({ where: { id: resIns.insertedId.toString() }, include: { role: true } });
    if (!user) return res.status(500).json({ success: false, message: 'Failed to create user' });

    const { password: p, refreshToken: r, ...rest } = user;
    return res.json({ success: true, data: rest });
  }

  static async update(req: Request, res: Response) {
    const { name, phone, status, password, role: roleName } = req.body;
    const updateData: any = { name, phone, status, updatedAt: new Date() };

    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) updateData.roleId = toObjectId(role.id);
    }

    const db = await getMongoDb();
    await db.collection('users').updateOne({ _id: toObjectId(req.params.id) }, { $set: updateData });

    const updated = await prisma.user.findUnique({ where: { id: req.params.id }, include: { role: true } });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });

    const { password: p, refreshToken: r, ...rest } = updated;
    return res.json({ success: true, data: rest });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('users').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'User deleted successfully' } });
  }
}
