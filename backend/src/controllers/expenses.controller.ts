import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { ExpenseCategory } from '@prisma/client';
import { getMongoDb, toObjectId } from '../utils/db';

export class AttendanceController {
  static async getDaily(req: Request, res: Response) {
    const dateStr = req.query.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { attendance: { where: { date } } },
      orderBy: { name: 'asc' },
    });

    const formatted = employees.map((emp) => ({
      employeeId: emp.id,
      name: emp.name,
      designation: emp.designation,
      salary: emp.salary,
      status: emp.attendance[0]?.status || 'NOT_MARKED',
      overtimeHours: emp.attendance[0]?.overtimeHours || 0,
      remarks: emp.attendance[0]?.remarks || '',
    }));

    return res.json({ success: true, data: formatted });
  }

  static async mark(req: Request, res: Response) {
    const { employeeId, date, status, overtimeHours = 0, remarks } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const db = await getMongoDb();
    await db.collection('attendance').updateOne(
      { employeeId: toObjectId(employeeId), date: targetDate },
      {
        $set: {
          employeeId: toObjectId(employeeId),
          date: targetDate,
          status,
          overtimeHours: Number(overtimeHours),
          remarks: remarks || '',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return res.json({ success: true, data: { employeeId, date: targetDate, status, overtimeHours, remarks } });
  }

  static async getMonthlySummary(req: Request, res: Response) {
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const daysInMonth = endDate.getDate();

    const employees = await prisma.employee.findMany({
      include: { attendance: { where: { date: { gte: startDate, lte: endDate } } } },
    });

    const summary = employees.map((emp) => {
      const presentDays = emp.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'OVERTIME').length;
      const halfDays = emp.attendance.filter((a) => a.status === 'HALF_DAY').length;
      const absentDays = emp.attendance.filter((a) => a.status === 'ABSENT').length;
      const leaveDays = emp.attendance.filter((a) => a.status === 'LEAVE').length;
      const totalOvertime = emp.attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

      const effectiveWorkingDays = presentDays + halfDays * 0.5;
      const perDaySalary = emp.salary / daysInMonth;
      const calculatedBaseSalary = Math.round(effectiveWorkingDays * perDaySalary);
      const overtimePay = Math.round(totalOvertime * (perDaySalary / 8) * 1.5);
      const totalPayable = calculatedBaseSalary + overtimePay;

      return {
        employeeId: emp.id,
        name: emp.name,
        designation: emp.designation,
        baseSalary: emp.salary,
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        totalOvertime,
        calculatedBaseSalary,
        overtimePay,
        totalPayable,
      };
    });

    return res.json({ success: true, data: summary });
  }
}

export class ExpensesController {
  static async findAll(req: Request, res: Response) {
    const { search, category, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { remarks: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category as ExpenseCategory;

    const [data, total, agg] = await Promise.all([
      prisma.expense.findMany({ where, skip, take: Number(limit), orderBy: { date: 'desc' } }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return res.json({
      success: true,
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)), totalExpenseSum: agg._sum.amount || 0 },
    });
  }

  static async getCategoryBreakdown(req: Request, res: Response) {
    const breakdown = await prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
    });
    const formatted = breakdown.map((b) => ({
      category: b.category,
      totalAmount: b._sum.amount || 0,
      count: b._count,
    }));
    return res.json({ success: true, data: formatted });
  }

  static async create(req: Request, res: Response) {
    const db = await getMongoDb();
    const resIns = await db.collection('expenses').insertOne({
      category: req.body.category,
      title: req.body.title,
      amount: Number(req.body.amount),
      date: new Date(req.body.date || new Date()),
      paymentMode: req.body.paymentMode || 'CASH',
      remarks: req.body.remarks || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const data = await prisma.expense.findUnique({ where: { id: resIns.insertedId.toString() } });
    return res.json({ success: true, data });
  }

  static async update(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('expenses').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: { ...req.body, amount: req.body.amount ? Number(req.body.amount) : undefined, updatedAt: new Date() } }
    );
    const data = await prisma.expense.findUnique({ where: { id: req.params.id } });
    return res.json({ success: true, data });
  }

  static async remove(req: Request, res: Response) {
    const db = await getMongoDb();
    await db.collection('expenses').deleteOne({ _id: toObjectId(req.params.id) });
    return res.json({ success: true, data: { message: 'Expense deleted' } });
  }
}
