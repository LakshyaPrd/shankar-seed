'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Building2, Phone, Mail, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { Supplier } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierHistory, setSelectedSupplierHistory] = useState<any>(null);

  const [formData, setFormData] = useState({
    supplierName: '',
    gst: '',
    phone: '',
    email: '',
    address: '',
  });

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res: any = await api.get('/suppliers');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/suppliers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setFormData({ supplierName: '', gst: '', phone: '', email: '', address: '' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const openHistory = async (supplier: Supplier) => {
    try {
      const res: any = await api.get(`/suppliers/${supplier.id}`);
      setSelectedSupplierHistory(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'supplierName',
      header: 'Supplier Organization',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.supplierName}</div>
          <div className="text-[10px] text-muted-foreground">{row.original.address}</div>
        </div>
      ),
    },
    {
      accessorKey: 'gst',
      header: 'GSTIN Number',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.gst || 'UNREGISTERED'}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Contact Info',
      cell: ({ row }) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{row.original.phone}</div>
          {row.original.email && <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Mail className="h-3 w-3" />{row.original.email}</div>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Purchase History',
      cell: ({ row }) => (
        <button
          onClick={() => openHistory(row.original)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded-md hover:bg-muted font-medium transition"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> View Invoices
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Seed Suppliers Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage seed producers, research institutes, and raw material suppliers</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Add Seed Supplier
        </button>
      </div>

      <DataTable
        columns={columns}
        data={suppliersData?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Search supplier name, GSTIN, phone..."
      />

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Seed Supplier"
        description="Register a new seed producer or vendor"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Supplier Name *</label>
            <input
              type="text"
              required
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              placeholder="e.g. National Seeds Research Corp"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">GSTIN Number</label>
              <input
                type="text"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                placeholder="07AAACN4321D1Z9"
                className="w-full p-2 bg-background border rounded-md font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 11 25841234"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="orders@supplier.com"
              className="w-full p-2 bg-background border rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Registered Address *</label>
            <textarea
              rows={2}
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              {createMutation.isPending ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier History Modal */}
      {selectedSupplierHistory && (
        <Modal
          isOpen={Boolean(selectedSupplierHistory)}
          onClose={() => setSelectedSupplierHistory(null)}
          title={`Purchase History - ${selectedSupplierHistory.supplierName}`}
          description={`GST: ${selectedSupplierHistory.gst || 'N/A'} | Address: ${selectedSupplierHistory.address}`}
        >
          <div className="space-y-3 text-xs">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedSupplierHistory.purchases?.map((p: any) => (
                <div key={p.id} className="p-3 rounded border bg-card flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Invoice #{p.invoiceNumber}</span>
                    <span className="text-muted-foreground">{p.notes || 'Arrival Order'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground block">{formatCurrency(p.grandTotal)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(p.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
