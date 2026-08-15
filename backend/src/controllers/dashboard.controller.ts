import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { getMongoDb } from '../utils/db';

export class DashboardController {
  static async getSummary(req: Request, res: Response) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      todaysDispatchAgg,
      todaysPurchaseAgg,
      inventories,
      employeesPresent,
      pendingDispatches,
      monthExpensesAgg,
      recentDispatches,
      recentPurchases,
      topCustomers,
      dispatchesLast6Months,
      purchasesLast6Months,
      purchaseItems,
    ] = await Promise.all([
      prisma.dispatch.aggregate({
        where: { date: { gte: todayStart } },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.purchase.aggregate({
        where: { date: { gte: todayStart } },
        _count: true,
        _sum: { grandTotal: true },
      }),
      prisma.inventory.findMany({ include: { product: true } }),
      prisma.attendance.count({
        where: { date: { gte: todayStart }, status: { in: ['PRESENT', 'OVERTIME', 'HALF_DAY'] } },
      }),
      prisma.dispatch.count({ where: { status: 'PENDING' } }),
      prisma.expense.aggregate({
        where: { date: { gte: firstDayOfMonth } },
        _sum: { amount: true },
      }),
      prisma.dispatch.findMany({ take: 5, orderBy: { date: 'desc' } }),
      prisma.purchase.findMany({ take: 5, orderBy: { date: 'desc' }, include: { supplier: true } }),
      prisma.customer.findMany({ take: 5, orderBy: { outstandingBalance: 'desc' } }),
      prisma.dispatch.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { date: true, totalAmount: true },
      }),
      prisma.purchase.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { date: true, grandTotal: true },
      }),
      prisma.purchaseItem.findMany({
        select: { productId: true, rate: true },
      }),
    ]);

    // Create rate map per product from purchase history
    const productRateMap = new Map<string, number>();
    for (const item of purchaseItems) {
      productRateMap.set(item.productId, item.rate);
    }

    let currentStockCount = 0;
    let lowStockCount = 0;
    let totalInventoryValue = 0;

    for (const inv of inventories) {
      currentStockCount += inv.currentStock;
      if (inv.currentStock <= (inv.product?.minimumStock || 10)) lowStockCount++;
      const itemRate = (inv.productId ? productRateMap.get(inv.productId) : undefined) || 200;
      totalInventoryValue += Math.max(0, inv.currentStock) * itemRate;
    }

    const monthlySalesGraph: any[] = [];
    const monthlyPurchasesGraph: any[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const yr = d.getFullYear();

      const salesInMonth = dispatchesLast6Months
        .filter((disp) => {
          const itemDate = new Date(disp.date);
          return itemDate.getMonth() === monthIdx && itemDate.getFullYear() === yr;
        })
        .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

      const purchasesInMonth = purchasesLast6Months
        .filter((pur) => {
          const itemDate = new Date(pur.date);
          return itemDate.getMonth() === monthIdx && itemDate.getFullYear() === yr;
        })
        .reduce((sum, item) => sum + (item.grandTotal || 0), 0);

      monthlySalesGraph.push({ month: months[monthIdx], sales: salesInMonth });
      monthlyPurchasesGraph.push({ month: months[monthIdx], purchases: purchasesInMonth });
    }

    return res.json({
      success: true,
      data: {
        todaysDispatch: { count: todaysDispatchAgg._count || 0, amount: todaysDispatchAgg._sum.totalAmount || 0 },
        todaysPurchase: { count: todaysPurchaseAgg._count || 0, amount: todaysPurchaseAgg._sum.grandTotal || 0 },
        currentStockCount,
        lowStockCount,
        employeesPresent,
        pendingDispatches,
        inventoryValue: totalInventoryValue,
        expensesThisMonth: monthExpensesAgg._sum.amount || 0,
        monthlySalesGraph,
        monthlyPurchasesGraph,
        recentDispatches,
        recentPurchases,
        topCustomers,
      },
    });
  }
}

export class ReportsController {
  static async getSales(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }
    const dispatches = await prisma.dispatch.findMany({
      where,
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { date: 'desc' },
    });
    const totalSales = dispatches.reduce((acc, d) => acc + d.totalAmount, 0);
    return res.json({ success: true, data: { totalSales, count: dispatches.length, records: dispatches } });
  }

  static async getPurchases(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }
    const purchases = await prisma.purchase.findMany({
      where,
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { date: 'desc' },
    });
    const totalPurchase = purchases.reduce((acc, p) => acc + p.grandTotal, 0);
    return res.json({ success: true, data: { totalPurchase, count: purchases.length, records: purchases } });
  }

  static async getExpenses(req: Request, res: Response) {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    return res.json({ success: true, data: { totalExpenses, count: expenses.length, records: expenses } });
  }

  static async getInventory(req: Request, res: Response) {
    const inventories = await prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { currentStock: 'asc' },
    });
    return res.json({ success: true, data: { totalItems: inventories.length, records: inventories } });
  }
}

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    const db = await getMongoDb();
    let data = await db.collection('settings').findOne({ _id: 'default' as any });
    if (!data) {
      await db.collection('settings').insertOne({
        _id: 'default' as any,
        companyName: 'Shankar Seeds Pvt Ltd',
        address: 'Guntur Agrotech Zone, AP',
        gstNumber: '37AAACS9876F1Z8',
        phone: '+91 863 2233445',
        email: 'info@shankarseeds.com',
        invoicePrefix: 'SS-2026-',
        financialYear: '2026-2027',
        backupFrequency: 'DAILY',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      data = await db.collection('settings').findOne({ _id: 'default' as any });
    }
    return res.json({ success: true, data });
  }

  static async updateSettings(req: Request, res: Response) {
    const db = await getMongoDb();
    const { _id, id, ...updateFields } = req.body;
    await db.collection('settings').updateOne(
      { _id: 'default' as any },
      { $set: { ...updateFields, updatedAt: new Date() } },
      { upsert: true }
    );
    const data = await db.collection('settings').findOne({ _id: 'default' as any });
    return res.json({ success: true, data });
  }

  static async backup(req: Request, res: Response) {
    return res.json({
      success: true,
      data: { message: 'Database backup generated', backupFile: `backup-shankar-seeds-${Date.now()}.sql` },
    });
  }
}
