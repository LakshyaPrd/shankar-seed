'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Users, Receipt, FileText, Phone, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { Customer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<any>(null);

  const [formData, setFormData] = useState({
    partyName: '',
    gst: '',
    phone: '',
    email: '',
    address: '',
    outstandingBalance: '0',
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res: any = await api.get('/customers');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post('/customers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setFormData({ partyName: '', gst: '', phone: '', email: '', address: '', outstandingBalance: '0' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const openLedger = async (customer: Customer) => {
    try {
      const res: any = await api.get(`/customers/${customer.id}/ledger`);
      setSelectedLedgerCustomer(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'partyName',
      header: 'Party / Customer Name',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.partyName}</div>
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
      accessorKey: 'outstandingBalance',
      header: 'Outstanding Balance',
      cell: ({ row }) => (
        <span className={`font-bold ${row.original.outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
          {formatCurrency(row.original.outstandingBalance)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => openLedger(row.original)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs border rounded-md hover:bg-muted font-medium transition"
        >
          <FileText className="h-3.5 w-3.5" /> Ledger History
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Customer Directory & Ledgers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage seed dealer network, GSTIN records, and pending balances</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:bg-primary/90 transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Add Customer Party
        </button>
      </div>

      <DataTable
        columns={columns}
        data={customers || []}
        isLoading={isLoading}
        searchPlaceholder="Search party name, GSTIN, phone..."
      />

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Customer Party"
        description="Register a new seed dealer or distributor"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Party Name *</label>
            <input
              type="text"
              required
              value={formData.partyName}
              onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
              placeholder="e.g. Sri Venkateswara Agri Traders"
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
                placeholder="37ABCDE1234F1Z5"
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
                placeholder="+91 98765 43210"
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Initial Opening Balance (₹)</label>
              <input
                type="number"
                value={formData.outstandingBalance}
                onChange={(e) => setFormData({ ...formData, outstandingBalance: e.target.value })}
                className="w-full p-2 bg-background border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Billing Address *</label>
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
              {createMutation.isPending ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ledger Modal */}
      {selectedLedgerCustomer && (
        <Modal
          isOpen={Boolean(selectedLedgerCustomer)}
          onClose={() => setSelectedLedgerCustomer(null)}
          title={`Ledger History - ${selectedLedgerCustomer.customer?.partyName}`}
          description={`GST: ${selectedLedgerCustomer.customer?.gst || 'N/A'} | Current Outstanding: ${formatCurrency(selectedLedgerCustomer.currentOutstanding)}`}
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between font-semibold">
              <span>Total Ledger Transactions</span>
              <span className="text-primary">{selectedLedgerCustomer.transactions?.length || 0} Bills</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedLedgerCustomer.transactions?.map((t: any) => (
                <div key={t.id} className="p-3 rounded border bg-card flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">{t.billNumber}</span>
                    <span className="text-muted-foreground">{t.transportName} &bull; {t.destination}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground block">{formatCurrency(t.totalAmount)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(t.date)}</span>
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
