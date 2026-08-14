'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, CreditCard, PieChart, Tag, Calendar, Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    category: 'FUEL',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    remarks: '',
  });

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res: any = await api.get('/expenses');
      return res.data;
    },
  });

  const { data: breakdown } = useQuery({
    queryKey: ['expense-breakdown'],
    queryFn: async () => {
      const res: any = await api.get('/expenses/category-breakdown');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/expenses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsModalOpen(false);
      setFormData({
        category: 'FUEL',
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'CASH',
        remarks: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'title',
      header: 'Expense Description',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.title}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.remarks || 'General expense'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border">
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount Paid',
      cell: ({ row }) => <span className="font-bold text-destructive">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: 'paymentMode',
      header: 'Payment Mode',
      cell: ({ row }) => <span className="font-mono text-xs uppercase">{row.original.paymentMode}</span>,
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Business Expense Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log fuel, loading, unloading, office, and miscellaneous operational expenses
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Log New Expense
        </button>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
        {['FUEL', 'LOADING', 'UNLOADING', 'TEA', 'OFFICE', 'ELECTRICITY', 'MISC'].map((cat) => {
          const item = breakdown?.find((b: any) => b.category === cat);
          return (
            <div key={cat} className="p-3 bg-card border rounded-lg shadow-xs space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">{cat}</span>
              <div className="font-bold text-sm text-foreground">{formatCurrency(item?.totalAmount || 0)}</div>
            </div>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={expensesData?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Search expense description, remarks, category..."
      />

      {/* Log Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Operational Expense"
        description="Record a new company expense entry"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Expense Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="FUEL">FUEL (Diesel / Transport)</option>
                <option value="LOADING">LOADING (Labour)</option>
                <option value="UNLOADING">UNLOADING (Labour)</option>
                <option value="TEA">TEA & REFRESHMENT</option>
                <option value="OFFICE">OFFICE SUPPLIES</option>
                <option value="ELECTRICITY">ELECTRICITY & UTILITIES</option>
                <option value="MISC">MISCELLANEOUS</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 2500"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Expense Title / Description *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Diesel for Vijayawada Dispatch Truck"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Expense Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="CASH">CASH</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border rounded-md text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90"
            >
              {createMutation.isPending ? 'Logging...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
