'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, UserCheck, Phone, Calendar, IndianRupee } from 'lucide-react';
import { api } from '@/lib/api';
import { Employee } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    salary: '18000',
    joiningDate: new Date().toISOString().split('T')[0],
    designation: 'Warehouse Assistant',
    status: 'ACTIVE',
  });

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res: any = await api.get('/employees');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/employees', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        salary: '18000',
        joiningDate: new Date().toISOString().split('T')[0],
        designation: 'Warehouse Assistant',
        status: 'ACTIVE',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: 'name',
      header: 'Employee Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border">
            {row.original.name[0]}
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.original.name}</div>
            <div className="text-[10px] text-muted-foreground">{row.original.designation}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone Number',
      cell: ({ row }) => row.original.phone,
    },
    {
      accessorKey: 'salary',
      header: 'Monthly Base Salary',
      cell: ({ row }) => <span className="font-bold text-foreground">{formatCurrency(row.original.salary)}</span>,
    },
    {
      accessorKey: 'joiningDate',
      header: 'Joining Date',
      cell: ({ row }) => formatDate(row.original.joiningDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {row.original.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Employee Roster</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage staff, designations, joining dates, and base salaries</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Add New Employee
        </button>
      </div>

      <DataTable
        columns={columns}
        data={employeesData?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Search employee name, phone, designation..."
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        description="Register a new warehouse worker or staff member"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Chandra"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Designation *</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Loader / Warehouse Incharge"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Monthly Salary (₹) *</label>
              <input
                type="number"
                required
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Joining Date</label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
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
              {createMutation.isPending ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
