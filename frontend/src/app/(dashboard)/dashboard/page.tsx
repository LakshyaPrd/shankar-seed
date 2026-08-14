'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  Truck,
  ShoppingCart,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  Receipt,
  Plus,
  ArrowUpRight,
  IndianRupee,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res: any = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Executive Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time business performance overview for Shankar Seeds Pvt Ltd
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dispatch"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Dispatch
          </Link>
          <Link
            href="/purchases"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-secondary text-secondary-foreground border rounded-md hover:bg-muted transition"
          >
            <Plus className="h-4 w-4" />
            Add Purchase
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Dispatch */}
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Today's Dispatch</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? '...' : formatCurrency(summary?.todaysDispatch?.amount || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-foreground">{summary?.todaysDispatch?.count || 0}</span> orders dispatched today
            </div>
          </div>
        </div>

        {/* Today's Purchase */}
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Today's Purchase</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? '...' : formatCurrency(summary?.todaysPurchase?.amount || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-foreground">{summary?.todaysPurchase?.count || 0}</span> stock arrivals today
            </div>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Low Stock Alerts</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {isLoading ? '...' : summary?.lowStockCount || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>Items below minimum threshold</span>
              <Link href="/inventory" className="text-primary hover:underline font-medium">
                View All &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Employees Present */}
        <div className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Staff Attendance</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? '...' : summary?.employeesPresent || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>Employees present today</span>
              <Link href="/attendance" className="text-primary hover:underline font-medium">
                Sheet &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Current Stock Volume</span>
            <div className="text-lg font-bold">{isLoading ? '...' : `${summary?.currentStockCount || 0} Units`}</div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Est. Inventory Valuation</span>
            <div className="text-lg font-bold">{isLoading ? '...' : formatCurrency(summary?.inventoryValue || 0)}</div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Expenses This Month</span>
            <div className="text-lg font-bold">{isLoading ? '...' : formatCurrency(summary?.expensesThisMonth || 0)}</div>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Recent Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Performance Chart */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Monthly Sales vs Purchases Trend</h3>
              <p className="text-xs text-muted-foreground">Financial performance comparison over recent months</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.monthlySalesGraph || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tickLine={false} fontSize={12} />
                <YAxis tickLine={false} fontSize={12} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="sales" name="Sales (Dispatch)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Dispatches List */}
        <div className="bg-card border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Recent Dispatches</h3>
              <p className="text-xs text-muted-foreground">Latest register updates</p>
            </div>
            <Link href="/dispatch" className="text-xs text-primary hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {summary?.recentDispatches?.length ? (
              summary.recentDispatches.map((disp: any) => (
                <div key={disp.id} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground block">{disp.billNumber}</span>
                    <span className="text-muted-foreground">{disp.partyName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground block">{formatCurrency(disp.totalAmount)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(disp.date)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">No recent dispatches.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
